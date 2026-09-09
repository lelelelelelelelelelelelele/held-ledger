#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod store;
use serde_json::Value;
use std::sync::Mutex;
use tauri::Manager;

struct Database(Mutex<store::Store>);

// Held for the process lifetime: two windows must not overwrite whole-ledger snapshots.
struct DataLock(#[allow(dead_code)] std::fs::File);

#[tauri::command]
fn read_state(db: tauri::State<Database>, id: String) -> Result<Option<Value>, String> {
    db.0.lock().map_err(|_| "存储锁不可用")?.get(&id)
}

#[tauri::command]
fn write_state(db: tauri::State<Database>, id: String, value: Value) -> Result<(), String> {
    if id != "assets" && id != "byok_v1" {
        return Err("未知存储项".into());
    }
    db.0.lock().map_err(|_| "存储锁不可用")?.put(&id, value)
}

#[tauri::command]
fn finish_close(window: tauri::WebviewWindow) -> Result<(), String> {
    window.destroy().map_err(|e| e.to_string())
}

#[tauri::command]
async fn export_backup(payload: Value) -> Result<bool, String> {
    if payload["schema"] != "held-ledger-export" || !payload["assets"].is_array() {
        return Err("备份格式无效".into());
    }
    let Some(file) = rfd::AsyncFileDialog::new()
        .set_file_name("held-ledger-backup.json")
        .add_filter("JSON 备份", &["json"])
        .save_file()
        .await
    else {
        return Ok(false);
    };
    let bytes = serde_json::to_vec_pretty(&payload).map_err(|e| e.to_string())?;
    file.write(&bytes).await.map_err(|e| e.to_string())?;
    Ok(true)
}

#[tauri::command]
async fn chat(db: tauri::State<'_, Database>, body: Value) -> Result<Value, String> {
    let config =
        db.0.lock()
            .map_err(|_| "存储锁不可用")?
            .get("byok_v1")?
            .ok_or("请先保存 API 配置")?;
    let base = config["base"].as_str().ok_or("缺少 API 地址")?;
    let url = reqwest::Url::parse(&format!("{}/chat/completions", base.trim_end_matches('/')))
        .map_err(|_| "API 地址无效")?;
    let loopback = matches!(url.host_str(), Some("127.0.0.1" | "localhost" | "[::1]"));
    if url.scheme() != "https" && !(url.scheme() == "http" && loopback) {
        return Err("API 地址必须使用 HTTPS（本机测试除外）".into());
    }
    let response = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(60))
        .redirect(reqwest::redirect::Policy::none())
        .build()
        .map_err(|_| "无法初始化网络客户端")?
        .post(url)
        .bearer_auth(config["key"].as_str().unwrap_or_default())
        .json(&body)
        .send()
        .await
        .map_err(|_| "无法连接 API，请检查地址或网络")?;
    if !response.status().is_success() {
        return Err(format!("HTTP {}", response.status().as_u16()));
    }
    response
        .json()
        .await
        .map_err(|_| "API 未返回有效 JSON".into())
}

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            read_state,
            write_state,
            finish_close,
            export_backup,
            chat
        ])
        .setup(|app| {
            let data = match std::env::var_os("HELD_LEDGER_DATA_DIR") {
                Some(path) => {
                    let p = std::path::PathBuf::from(path);
                    if !p.is_absolute() {
                        return Err("HELD_LEDGER_DATA_DIR 必须为绝对路径".into());
                    }
                    p
                }
                None => app.path().app_data_dir()?,
            };
            std::fs::create_dir_all(&data)?;
            let lock = std::fs::OpenOptions::new()
                .create(true)
                .truncate(false)
                .write(true)
                .open(data.join("ledger.lock"))?;
            lock.try_lock()
                .map_err(|_| "此台账已在另一个持有窗口中打开")?;
            app.manage(DataLock(lock));
            app.manage(Database(Mutex::new(store::Store::open(
                &data.join("ledger.sqlite3"),
            )?)));
            let builder = tauri::WebviewWindowBuilder::new(
                app,
                "main",
                tauri::WebviewUrl::App("index.html".into()),
            )
            .title("持有 · 个人资产台账")
            .inner_size(480.0, 860.0)
            .min_inner_size(360.0, 600.0)
            .on_navigation(|url| matches!(url.host_str(), Some("tauri.localhost" | "localhost")))
            .disable_drag_drop_handler();
            #[cfg(target_os = "windows")]
            let builder = builder.data_directory(data.join("webview"));
            let window = builder.build()?;
            let close_window = window.clone();
            window.on_window_event(move |event| {
                if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                    api.prevent_close();
                    let _ = close_window.eval("window.closeLedger?.()");
                }
            });
            Ok(())
        })
        .build(tauri::generate_context!())
        .expect("无法启动持有")
        .run(|app, event| {
            // macOS Cmd+Q and application-menu Quit also flush through the same close path.
            if let tauri::RunEvent::ExitRequested { api, .. } = event {
                if let Some(window) = app.get_webview_window("main") {
                    api.prevent_exit();
                    let _ = window.eval("window.closeLedger?.()");
                }
            }
        });
}

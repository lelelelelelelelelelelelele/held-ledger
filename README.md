# Held Ledger（持有）

本地优先的个人资产台账。Mac 与 Windows 共用 Tauri 2 + Rust 外壳，界面和业务计算使用 HTML / CSS / JavaScript。台账、图片与 API 配置由 Rust 保存在 SQLite，普通用户不需要 Node.js 或 npm。

当前版本 `0.1.0-alpha.1`。此分支是 Tauri 迁移候选；已有同名版本的历史 Release 属于此前的实现，不能用它代替本分支构建。

## 安装与启动

- Windows x64：双击 `Held-Ledger-版本-windows-x64-setup.exe`，从桌面或开始菜单打开「持有」。依赖系统 WebView2 Evergreen；缺少时安装器会联网安装运行时。小安装包不包含完整 WebView2。默认安装在 `%LOCALAPPDATA%\持有\`，可在安装器选择目录。
- Mac Apple Silicon：打开 `Held-Ledger-版本-mac-arm64.dmg`，将「持有.app」拖入「应用程序」再打开。
- 当前包未签名 / 未公证。其他 CPU、Linux 和移动端未验证。

[安装包发布入口](https://github.com/lelelelelelelelelelelelele/held-ledger/releases)。候选只通过本地交付或 Actions 构建产物提供，未发布新的 Release。

## 台账与备份

| 平台 | 默认数据目录 |
| --- | --- |
| Windows | `%APPDATA%\app.heldledger.desktop\` |
| macOS | `~/Library/Application Support/app.heldledger.desktop/` |

`ledger.sqlite3` 包含台账、内嵌图片和 API 配置。不要在运行中直接改数据库；日常备份使用「我的 → 导出 JSON 备份」，由系统保存对话框选择文件位置。

「我的 → 导入 JSON 恢复」读取 `schema: held-ledger-export, version: 1` 的备份，确认后替换当前台账。空台账也可以导出、导入和重启保存。图片只有内嵌在 JSON 中才可随备份携带；孤立的相对文件路径不能恢复没有提供的原图。

不自动读取或搬迁旧应用的数据目录。换机或换实现时先在原应用导出，再在新应用导入。公开安装包仅含 5 项合成示例，真实台账只保存在用户本机。

保存按操作顺序提交 SQLite 事务，正常关窗及 Mac 退出菜单会等待保存完成；保存失败时保留窗口并提示。两个进程不能同时打开同一个台账目录。正常退出的验证不等于断电、强杀进程或磁盘损坏恢复验证。

## 智能添加 / BYOK

在「我的 → 智能添加 · 接入 API」保存接口根地址、API Key 和模型。支持 OpenAI 风格 `/chat/completions`，程序自动追加端点。图片解析需要支持视觉输入的模型。

配置保存在本机数据库中，未做系统钥匙串加密，不进入台账 JSON 导出。请求从 Rust 直接发往所选服务商；本次输入的文字或图片会发送给服务商。外部接口要求 HTTPS，本机 HTTP 可用于 mock 测试。重定向被拒绝，超时为 60 秒。

不配置 Key 时使用本地文字规则；AI 文字请求失败后可采用本地结果或重试。识别结果先展示供核对，确认后才加入台账。Tauri 候选仅做了 mock 验证，不代表真实服务商验证。

## 开发与验证

需要 Node.js 24、Rust stable，以及平台构建工具（Windows：MSVC C++ Build Tools 和 WebView2；Mac：Xcode Command Line Tools）。

```sh
npm ci
npm run desktop
npm test
npm run build:windows
# 在 Mac 上：
npm run build:mac
```

桌面包输出到 `src-tauri/target/release/bundle/`。Windows 原生集成测试：

```sh
npm run test:native
```

测试直接启动 Tauri release EXE，通过 WebView2 调试连接操作真实页面，并经原生关窗退出、重新启动进程验证。`tools/test-installed.mjs` 只在隔离 CI 用户运行；它会真实安装 NSIS 后对已安装 EXE 重复测试。Mac 的 `tools/test-mac.mjs` 是原生包启动、SQLite 初始化和退出重启 smoke，不代替完整交互验收。

本机测试可设置绝对路径 `HELD_LEDGER_DATA_DIR` 使用独立台账。正常用户启动不需要这个变量。测试数据必须位于 Git 仓库外；不得将真实 JSON、图片、密钥、个人截图或含私人信息日志提交或上传。

## 自动构建与发布

Actions 为 Windows x64 和 Mac arm64 分别执行版本检查、Rust 测试、Tauri 打包和平台检查。只有所有平台任务成功后，唯一的 release job 才可以发布。

- 手动 `workflow_dispatch`：只产生安装包及校验文件；即使选择标签也不创建 Release。
- 推送经授权的新 `v*` 标签：标签必须与 package.json、Cargo.toml 和 tauri.conf.json 版本一致，平台任务全成功后统一创建 Release。
- 不包含 App 内自动更新器。

## 源码结构

- `demo/index.html`：界面、资产业务计算、图片缩略与导入校验。
- `demo/native.js`：持久化队列和正常退出协调。
- `src-tauri/src/store.rs`：SQLite 存储及输入一致性检查。
- `src-tauri/src/main.rs`：窗口、数据目录锁、原生导出、BYOK 网络能力。
- `tools/`：原生与安装测试、发布版本检查、安装包收集。
- `docs/`、`reports/`：产品说明及历史研究记录。历史报告是当时实现的证据，不代表当前 Tauri 回归结果。

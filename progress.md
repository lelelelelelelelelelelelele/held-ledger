# 进度记录

## 2026-09-11

- 已创建本轮结构性审阅计划。
- 已确认模板添加是假入口、缺少统一资产编辑入口、类型判断混入名称启发式。
- 已实现通用资产编辑器：模板打开预填表单，支持资产类型、名称、分类、数值、单位、购入信息、里程估值口径、面值、有效期和备注。
- 已为详情页各类型加入统一“编辑信息”入口；类型判断不再读取名称中的“会员”。
- 已通过 JavaScript 语法检查；下一步进行真实 WebView 空台账流程验证。
- 已实现真实通用资产编辑器、统一详情编辑入口、可用资产搜索、名称与类型解耦、AI/手动共用构造器及路由竞态修复。
- 验证通过：`npm test`、`npm run test:native`、`npm run test:generic-editor`；后两者均使用 Windows WebView2 原生进程，通用编辑器测试也用安装后的 EXE 重跑。
- 临时 SQLite 备份已移到系统临时目录，未留在仓库工作树。
- 已将前端从内联单文件拆为 `demo/index.html`（骨架）、`demo/styles.css`（样式）、`demo/domain.js`（资产领域数据与计算）、`demo/app.js`（视图与交互）和 `demo/storage.js`（本地存储/退出协调），并更新 README 与 demo 说明。
- SQLite 增加 `schema_meta.version`（当前为 1）；无版本的现有数据库只记录当前已知形状，遇到未知版本直接拒绝打开，避免隐式兼容或静默覆盖。
- 拆分后验证通过：`node --check demo/domain.js demo/app.js demo/storage.js`、`npm test`（3 项 Rust 测试）、`npm run test:native`、`npm run test:generic-editor`。
- Windows 成品构建通过：`npm run build:windows`，生成 `src-tauri/target/release/bundle/nsis/持有_0.1.0-alpha.1_x64-setup.exe`。

## 2026-09-14

- 通过 `gh run view 34402179062 --log-failed` 确认截图对应的真实失败：Windows 原生测试的 WebView2 CDP 端口 `127.0.0.1:50427` 拒绝连接；灰色 Release 是手动 `workflow_dispatch` 条件为 false，且 `needs: [build]` 也会在矩阵失败时跳过。
- 修复 `tools/native-app.mjs`：每次启动创建独立 WebView2 profile，并设置 `WEBVIEW2_USER_DATA_FOLDER`；SQLite 台账仍使用同一个 `HELD_LEDGER_DATA_DIR`，不影响持久化。
- 修复后验证通过：`node --check tools/native-app.mjs`、`npm test`、`npm run test:native`、`npm run test:generic-editor`，以及 `CI=true npm run test:native`；随后重新执行 `npm run build:windows`，安装包生成成功。尚未推送，GitHub runner 需要新提交后重跑确认。

## 2026-09-14（GitHub 验证）

- 已在独立工作树将 Windows WebView2 CI 修复提交并推送到 `codex/tauri`：`828fd44`。
- 首次远程验证已证明 CDP 启动问题消失，但发现延时路由竞态；修复后提交 `2aee6b3` 并再次推送。
- GitHub Actions run `34774524823` 最终成功：Windows 与 macOS build 均通过；手动 `workflow_dispatch` 下 Release 按条件显示 skipped，这是预期行为。

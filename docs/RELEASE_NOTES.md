持有：Tauri 2 + Rust 的 macOS Apple Silicon / Windows x64 桌面版。

Mac 下载 DMG 后拖入「应用程序」；Windows 下载 setup.exe 安装。普通用户无需 Node.js 或 npm。Windows 使用系统 WebView2，缺少时安装器会联网补装。

- 复用台账界面、分类筛选、到期提醒、智能添加、编辑、删除撤销。
- SQLite 事务持久化，正常关窗等待保存，空台账重启保持为空。
- 原生 JSON 保存对话框；version 1 备份导入恢复，无旧目录自动迁移。
- BYOK 由 Rust 直接请求服务商；Key 留在本机配置，不写入台账 JSON 备份。
- 所有平台构建和检查通过后统一发布。SHA256SUMS.txt 用于下载校验。

Alpha 包未签名 / 未公证。Mac 的 CI 包启动 smoke 不代替完整人工交互验收。安装包只含合成示例；真实台账不会随包分发。升级或换实现前请先导出备份。

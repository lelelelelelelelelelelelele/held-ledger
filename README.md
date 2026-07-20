# Held Ledger（持有）

Held Ledger 是一个 local-first 的个人资产台账与轻量记账工具，当前已经包含可运行 demo 和 macOS 桌面打包配置。

当前桌面版名称为「持有」，版本标记为 `0.1.0-alpha.0`。这是源码开放准备版 + 本机 Alpha / 内部试用版，适合愿意试用、备份数据并反馈问题的用户；暂不建议把未签名安装包作为面向大众的稳定正式 App 发布。

## Storage and Limits

- 资产数据存储在本机浏览器 / Electron 的 IndexedDB 中，不上传云端，也没有多设备同步。
- 仓库中的首次启动数据全部是合成示例；真实资产名称、金额、日期和本机图片不应进入 Git。
- 「我的」页支持导出 JSON 备份和导入 JSON 恢复；导入会覆盖本机当前资产数据。
- BYOK API 配置保存在本机 IndexedDB，并保留旧版 localStorage 兼容读取；演示版会由前端直连服务商，请不要在不可信环境粘贴生产密钥。
- 当前安装包未使用 Apple Developer ID 签名，也未 notarization 公证。首次打开时，macOS 可能要求在「系统设置 → 隐私与安全性」中允许打开。
- Kimi Coding 图片 BYOK 已完成一次真实图片识别实验；其他服务商和模型不作稳定兼容承诺。
- 金融资产模块、稳定错误恢复、数据模型迁移和云备份仍属于后续开发范围。

## Documents

- `docs/product-brief.md`：产品方向、用户场景、核心功能边界
- `docs/design-notes.md`：参考产品观察、交互和视觉方向记录
- `docs/image-source-policy.md`：图片来源标注、导出和公开分发前替换策略
- `docs/todo.md`：后续开发前需要确认和执行的事项
- `docs/demo/open-source-demos.md`：可参考的开源项目与 demo 方向
- `reports/promo/`：基于真实截图生成的 release 宣发图

## Desktop Package

本地开发运行桌面 App：

```sh
npm run desktop
```

生成 macOS arm64 `.app` 与 `.dmg`：

```sh
npm run build:desktop
```

验证源码桌面入口：

```sh
npm run test:desktop
```

验证已打包 App：

```sh
npm run test:packaged
```

验证初始化资产与首次录入流程：

```sh
npm run test:seeded-flow
```

验证 BYOK / OpenAI-compatible API 调用链路：

```sh
npm run test:byok-api
npm run test:byok-api-error
```

验证智能添加 ID 重启不冲突：

```sh
npm run test:regression-smart-add-id-collision
```

生成 release 宣发图：

```sh
npm run build:promo
```

当前构建产物：

- `dist/mac-arm64/持有.app`
- `dist/持有-0.1.0-alpha.0-arm64.dmg`

注意：Alpha 包仍未签名/公证，外发前仍需要 Apple Developer ID 签名和 notarization。

## Quick Cd

进入项目文档目录：

```sh
cd /Users/lele/Documents/Projects/youshu-ledger-app/docs
```

或者临时加载快捷函数，然后输入 `heldledger` 直接进入项目目录：

```sh
source /Users/lele/Documents/Projects/youshu-ledger-app/scripts/cd-docs.sh
heldledger
```

## Current Scope

当前已经完成：

1. 建立产品与设计文档
2. 实现可交互移动端 demo
3. 封装 macOS 桌面 App
4. 生成并验证 `.app` 与 `.dmg` 安装包
5. 默认初始化此前记录过的资产，并验收新增录入流程
6. 修复智能添加资产 ID 在重启后复用导致的 IndexedDB 覆盖问题

## License

[ISC](LICENSE)

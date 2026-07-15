# Held Ledger（持有）

Held Ledger 是一个 local-first 的个人资产台账与轻量记账工具。它用于记录实物资产、权益票券和会员订阅，并提供到期提醒、JSON 备份与 OpenAI-compatible BYOK 文本智能添加；中文产品名为「持有」。

当前版本：`0.1.0-alpha.0`。

> 这是公开源码 Alpha，不是面向大众的稳定安装版。macOS 包尚未签名或 notarization。

## 当前能力

- 实物资产、权益票券和会员订阅管理
- 资产排序、估值、到期提醒和删除撤销
- JSON 导出备份与导入恢复
- OpenAI-compatible BYOK 文本智能添加
- Electron macOS 桌面包装与 PWA 基础支持

金融资产、云同步、数据模型迁移和图片识别仍在后续范围。

## 隐私与数据

- 资产和 BYOK 配置保存在本机 IndexedDB，不上传到项目服务器。
- 仓库只包含合成示例数据和生成占位图，不包含作者的真实资产、金额、日期或图片。
- 用户上传图片和 JSON 备份属于本机数据，不应提交到 Git。
- Web 版调用 BYOK 服务时由前端直连所选服务商；不要在不可信环境粘贴生产密钥。

## 本地运行

需要 Node.js 和 npm：

```sh
npm install
npm run desktop
```

## 验证

运行源码测试：

```sh
npm test
```

构建 macOS arm64 DMG 并验证打包 App：

```sh
npm run test:release
```

生成文件位于 `dist/`，该目录不会提交到 Git。公开分发 DMG 前仍需完成 Apple Developer ID 签名和 notarization。

## 项目结构

- `demo/`：单页应用、PWA manifest 与 service worker
- `desktop/`：Electron 桌面入口
- `tools/`：源码、流程、BYOK 和打包 smoke tests
- `docs/product-brief.md`：产品范围
- `docs/image-source-policy.md`：图片与隐私边界

内部验收报告、真实截图、候选素材和个人数据不属于公开 branch。

## License

[ISC](LICENSE)

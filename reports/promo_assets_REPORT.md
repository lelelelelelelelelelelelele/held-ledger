# Promo Assets Report

## Verdict

通过。当前 release 已有一组基于真实 App 截图生成的宣发图，可以用于 GitHub Release、项目介绍和社群转发。

## Assets

| Asset | Size | Intended Use | Source |
| --- | --- | --- | --- |
| `reports/promo/release-cover.png` | `1600 x 900` | GitHub Release 顶图、README 封面候选 | 真实 App 截图拼版 |
| `reports/promo/feature-grid.png` | `1600 x 1200` | Release notes 功能说明、项目页配图 | 总览、资产卡片、待办、智能添加截图 |
| `reports/promo/social-square.png` | `1200 x 1200` | 社群、朋友圈、内部转发 | 总览和资产详情截图 |

## Message Boundary

这些图只表达当前 Alpha 的真实能力：

- 本机资产台账
- JSON 备份和恢复
- BYOK 文本智能添加
- Kimi Coding 图片识别已完成一次合成图片 live test，仍属于实验性能力
- 资产排序、逾期待办、可编辑确认
- 未签名、未公证、本机/内部试用

不应表达或暗示：

- 已经是稳定正式版
- 已完成 Apple 签名和 notarization
- 图片识别已实现稳定、多模型或多服务商兼容
- 智能添加结果已保证跨重启可靠持久化
- 云同步或金融资产模块已完成

## Rebuild Command

```sh
npm run build:promo
```

## Notes

宣发图由 `tools/generate-promo.mjs` 生成，依赖 `screenshots/*.png` 中的真实 UI 截图。截图更新后应重新运行生成命令。

# Image Source Policy Report

## Report Boundary

本报告说明图片来源追踪策略和当前实现状态；它不是图片版权审计结论。

- 发布准入风险见 `reports/release_readiness_REPORT.md`。
- 可编辑策略源见 `docs/image-source-policy.md`。
- P1 功能迭代差异见 `reports/p1_iteration_REPORT.md`。

## Verdict

图片能力通过、持久化有阻塞。当前 Alpha 已能区分历史本机演示图、用户上传、AI 识别输入图和生成占位图；Kimi Coding 单次图片识别 live test 已通过，但确认保存暴露出通用智能添加 ID 冲突。

## Source Taxonomy

| Source | Code | Used By | Export Behavior | Risk |
| --- | --- | --- | --- | --- |
| 历史本机演示图 | `bundled_demo` | 旧版本机数据 | 保留相对路径与来源字段 | 不进入公开 branch；公开种子已改用生成占位图 |
| 用户上传 | `user_upload` | 资产详情照片上传 | 保留 data URL 与来源字段 | 属于本机用户数据，体积可能较大 |
| AI 识别输入图 | `ai_input_upload` | 智能添加传图确认 | 保留 data URL 与来源字段 | 会发送到用户配置的 BYOK 服务商；需明确隐私边界 |
| 生成占位图 | `generated_placeholder` | 无照片资产运行时占位 | 不导出 SVG 图片内容，只保留来源 | 无版权风险，但不是实物照片 |

## Implementation Evidence

| Check | Result | Evidence |
| --- | --- | --- |
| 公开种子图片 | Pass | 默认种子使用合成数据和 `generated_placeholder`，不跟踪 `demo/thumbs/` |
| 详情页可见 | Pass | 资产详情显示“图片来源：内置演示图”等来源 |
| 用户上传追踪 | Pass | 详情页上传照片写入 `photoSource: "user_upload"` 和 `photoUpdated` |
| AI 传图追踪 | Pass | 智能添加传图确认写入 `photoSource: "ai_input_upload"` 和 `photoUpdated` |
| Kimi 图片识别 live test | Pass | `kimi-for-coding` 接收 base64 `image_url`，返回 `200`；名称、分类、价格、日期全部匹配 |
| 既有数据档确认持久化 | Fail | App 重启后 `nlSeq` 从 1 重新计数；已有 `nl1` 时，新资产被旧记录覆盖 |
| 导出追踪 | Pass | `npm run test:seeded-flow` 验证 JSON 导出包含 `photoSource` |

## Policy Decisions

| Decision | Rationale |
| --- | --- |
| 不把生成占位 SVG 当作真实照片 | 占位图只是 UI fallback，不应被误认为用户素材 |
| 历史演示图只保留在本机兼容层 | 公开 branch 已改为合成种子和生成占位图 |
| 用户上传与 AI 输入图分开说明 | 用户上传默认仅在本机；AI 输入图会发送到用户配置的 BYOK 服务商，并在确认后保存在本机 |
| 图片识别能力与图片素材授权分开管理 | BYOK live test 证明识别链路，不证明素材可商用 |

## Remaining Work

| Item | Priority | Notes |
| --- | --- | --- |
| 修复智能添加 ID 重启后复用 | P0 before next release | 否则确认页成功后，新记录仍可能没有可靠写入 IndexedDB |
| BYOK 图片隐私提示 | Before wider beta | 传图前明确说明图片将发送到用户配置的第三方服务商 |
| 大图压缩和导出体积限制 | Later | 当前缩略图压缩为 360px JPEG，但没有导出体积提示 |

## Conclusion

图片来源策略和 Kimi 图片识别能力已经有真实验收证据。下一步优先修复智能添加 ID 冲突，再补充传图隐私提示和自动化图片回归；单次 provider 通过不等于稳定、多服务商兼容。

# Image Source Policy Report

## Report Boundary

本报告说明图片来源追踪策略和当前实现状态；它不是图片版权审计结论。

- 发布准入风险见 `reports/release_readiness_REPORT.md`。
- 可编辑策略源见 `docs/image-source-policy.md`。
- P1 功能迭代差异见 `reports/p1_iteration_REPORT.md`。

## Verdict

有条件通过。当前 Alpha 已能区分内置演示图、用户上传、AI 识别输入图和生成占位图；公开稳定版前仍需审核或替换 `demo/thumbs/*.jpg`。

## Source Taxonomy

| Source | Code | Used By | Export Behavior | Risk |
| --- | --- | --- | --- | --- |
| 内置演示图 | `bundled_demo` | 默认种子资产缩略图 | 保留相对路径与来源字段 | 公开分发前需确认授权或替换 |
| 用户上传 | `user_upload` | 资产详情照片上传 | 保留 data URL 与来源字段 | 属于本机用户数据，体积可能较大 |
| AI 识别输入图 | `ai_input_upload` | 智能添加传图确认 | 保留 data URL 与来源字段 | 图片识别 live test 尚未完成 |
| 生成占位图 | `generated_placeholder` | 无照片资产运行时占位 | 不导出 SVG 图片内容，只保留来源 | 无版权风险，但不是实物照片 |

## Implementation Evidence

| Check | Result | Evidence |
| --- | --- | --- |
| 默认图片标注 | Pass | `macair`、`pc`、`zeekr` 使用 `photoSource: "bundled_demo"` |
| 详情页可见 | Pass | 资产详情显示“图片来源：内置演示图”等来源 |
| 用户上传追踪 | Pass | 详情页上传照片写入 `photoSource: "user_upload"` 和 `photoUpdated` |
| AI 传图追踪 | Pass | 智能添加传图确认写入 `photoSource: "ai_input_upload"` 和 `photoUpdated` |
| 导出追踪 | Pass | `npm run test:seeded-flow` 验证 JSON 导出包含 `photoSource` |

## Policy Decisions

| Decision | Rationale |
| --- | --- |
| 不把生成占位 SVG 当作真实照片 | 占位图只是 UI fallback，不应被误认为用户素材 |
| 内置演示图保留但标注风险 | Alpha 需要可视化资产卡片，但公开分发前必须完成素材来源确认 |
| 用户上传和 AI 输入图都视作本机用户数据 | 不上传云端，导出时由用户自己控制备份 |
| 图片识别能力与图片素材授权分开管理 | BYOK live test 证明识别链路，不证明素材可商用 |

## Remaining Work

| Item | Priority | Notes |
| --- | --- | --- |
| `demo/thumbs/*.jpg` 版权审核或替换 | Before public stable | 当前只标注为演示图，不声明可商用 |
| 图片 BYOK live test | Before external stable | 文本 BYOK mock/API UI 已通过，图片路径尚未 live test |
| 大图压缩和导出体积限制 | Later | 当前缩略图压缩为 360px JPEG，但没有导出体积提示 |

## Conclusion

图片来源策略已经从“待整理”变成可追踪字段和可验收行为。下一步不是继续改字段，而是完成公开分发前的演示素材授权审核或替换。

# P1 Iteration Report

## Report Boundary

本报告记录 P1 功能迭代差异、验收结果和剩余产品缺口；它不是发布准入报告。

- 发布结论与外部分发风险见 `reports/release_readiness_REPORT.md`。
- 打包产物与 DMG 挂载验证见 `reports/desktop_packaging_REPORT.md`。
- 开发待办源头见 `docs/todo.md`。

## Verdict

本轮 P1 迭代通过。资产列表管理、逾期待办、智能添加确认编辑、BYOK 错误重试已经具备本机 Alpha 试用价值。

## Iteration Difference

| Area | Before | After | Validation |
| --- | --- | --- | --- |
| 资产排序 | 只有固定状态排序 | 增加默认、价值最高、最近购入、日均最高、到期最近 | `npm run test:seeded-flow` |
| 逾期待办 | 已过期权益会从待办消失 | 总览和待办页显示已过期项，待办页分组为已过期、30 天内、60 天内 | `npm run test:seeded-flow` |
| 智能添加确认 | 解析结果只读，只能确认或重填 | 可编辑名称、分类、购入价、购入日、当前估值、备注，再确认入库 | `npm run test:seeded-flow` |
| BYOK API 失败 | 文本失败后本地兜底，但重试路径不清楚 | 显示错误、本地兜底、重试 AI、改 API 设置 | `npm run test:byok-api-error` |
| 测试入口 | 只有分散脚本 | 增加 `npm run test:p1` 和 `npm test` 聚合入口 | `npm run test:p1`, `npm test` |
| 打包证据 | 本地曾残留旧 `1.0.0` DMG | 当前目录只保留 `0.1.0-alpha.0` DMG，DMG 挂载启动通过 | `npm run build:desktop`, mounted `npm run test:packaged` |

## Validation Results

| Command | Result | Coverage |
| --- | --- | --- |
| `npm run test:p1` | Pass | source smoke, seeded flow, BYOK success, BYOK error/retry |
| `npm run test:seeded-flow` | Pass | 初始化资产、逾期待办、资产排序、确认页编辑、删除撤销、JSON 导入导出 |
| `npm run test:byok-api` | Pass | OpenAI-compatible success path, Authorization/model/request body |
| `npm run test:byok-api-error` | Pass | HTTP 500 -> local fallback -> retry AI -> confirm once |
| `npm run build:desktop` | Pass | Rebuilt `dist/持有-0.1.0-alpha.0-arm64.dmg` |
| `npm run test:packaged` | Pass | Built app and mounted DMG app both launch |

## Remaining P1 Gaps

| Gap | Why It Remains | Suggested Next Check |
| --- | --- | --- |
| 数据模型版本迁移策略 | IndexedDB schema has moved to config/assets stores, but asset schema migration is still ad hoc | Add explicit export schema version and import migration tests |
| 更完整到期处理动作 | 已能看到逾期，但不能直接改有效期或标记已处理 | Add due-date edit/handled action and acceptance coverage |
| 搜索入口 | 排序完成，搜索图标仍未展开为真实搜索 | Add name/category/meta search with clear-filter state |
| 演示图片版权审核或替换 | 已有来源标注策略，但未完成公开稳定版素材授权审计 | Replace or clear `demo/thumbs/*.jpg` before public stable release |

## Conclusion

本轮已经把 P1 从“能录入和展示”推进到“能纠错、能恢复、能看风险”。下一轮优先做数据迁移策略和到期处理动作；搜索入口适合作为小步快改跟进。

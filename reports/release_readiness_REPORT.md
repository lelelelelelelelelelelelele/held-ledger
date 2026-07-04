# Release Readiness Report

## Verdict

有条件通过。当前版本可以作为源码开放准备版和本机/内部试用版发布；不建议直接把未签名安装包作为外部分发版发布。

核心理由：

- 桌面 App、初始化资产、自然语言添加、可编辑确认、API 错误重试、JSON 导出/导入、删除撤销、资产排序、逾期待办、打包 App smoke test 均已通过。
- BYOK / OpenAI-compatible API 链路已用本地 mock server 验收，证明前端在 base URL 包含 `/v1` 时会请求 `/chat/completions`，最终路径为 `/v1/chat/completions`，并携带 Bearer token、解析 JSON、完成确认添加。
- Kimi Coding BYOK 已用真实 token live test，开发版、重启后的持久化配置、打包版 App 均能得到 `AI 智能解析` 预览。
- macOS 包仍未签名、未公证，外发会遇到 Gatekeeper 摩擦。

## Current Scope

| Area | Status | Notes |
| --- | --- | --- |
| 本机桌面 App | Ready for local/internal trial | Electron 包装 `demo/index.html` |
| macOS packaged app | Ready for local/internal trial | `dist/mac-arm64/持有.app` 可启动 |
| DMG | Ready for local/internal trial | `dist/持有-0.1.0-alpha.0-arm64.dmg` 已重建；仍需签名/公证后外发 |
| 初始化资产 | Ready | 新用户目录会加载基础资产集合 |
| 本机真实数据 | Not versioned | IndexedDB 本机数据不进 Git |
| JSON 备份恢复 | Ready for trial | 「我的」页可导出 JSON；导入会覆盖本机资产数据 |
| 资产排序 | Ready for trial | 默认、价值最高、最近购入、日均最高、到期最近 |
| 待办提醒 | Ready for trial | 已过期、30 天内、60 天内分组 |
| 智能添加确认 | Ready for trial | 解析后可编辑名称、分类、购入价、购入日、估值、备注 |
| 图片来源策略 | Ready for trial | `photoSource` 标注、详情展示、JSON 导出和策略报告 |
| 金融资产 | Deferred | 当前显示为「暂未开发」 |
| 实物资产 | Ready for trial | 数码、家居、交通 |
| 权益票券 | Ready for trial | 里程、礼品卡、票券 |
| 会员订阅 | Ready for trial | 独立到期提醒类 |
| BYOK API | Live-tested with Kimi | Kimi Coding text smart-add 已通过；图片路径尚未 live test |

## Validation Results

| Check | Result | Evidence |
| --- | --- | --- |
| Source Electron smoke | Pass | `npm run test:desktop` |
| Seeded flow acceptance | Pass | `npm run test:seeded-flow`，覆盖初始化、逾期待办、资产排序、自然语言添加编辑确认、删除撤销、JSON 导出/导入 |
| BYOK mock API smoke | Pass | `npm run test:byok-api` |
| BYOK API error/retry smoke | Pass | `npm run test:byok-api-error` |
| Kimi BYOK live API/UI | Pass | `reports/kimi_byok_live_REPORT.md` |
| Packaged app smoke | Pass | `npm run test:packaged` |
| Computer Use visual check | Pass | 总览显示金融资产暂未开发、权益估值、会员订阅 |

## API Readiness

| Item | Status | Notes |
| --- | --- | --- |
| Request path | Pass | mock server received `/v1/chat/completions` |
| Authorization header | Pass | script verifies `Bearer test-token` |
| Model field | Pass | script verifies configured model is sent |
| JSON response parsing | Pass | mock response becomes smart-add preview |
| Confirm add after API result | Pass | editable preview can be confirmed into asset detail |
| API failure recovery | Pass | failed API call shows error, keeps local fallback, and can retry AI |
| Real provider live test | Pass | Kimi Coding text path verified with real token |
| Image API path | Gap | text API is tested; image upload path still depends on real model support |

## Open TODO Summary

以下为发布风险摘要；完整开发待办以 `docs/todo.md` 为准。

### Before Public DMG Distribution

| Task | Why It Matters |
| --- | --- |
| Apple Developer ID signing | Avoid first-launch trust friction |
| Apple notarization | Required for smooth external macOS distribution |
| Image BYOK live test | Text path is live-tested; image path still needs provider capability validation |
| Demo image rights audit/replacement | Bundled demo thumbnails are labelled, not yet rights-cleared for public stable distribution |

### P1 Before Wider Beta

| Task | Why It Matters |
| --- | --- |
| Data model migrations | Future category changes should not require manual repair |
| Richer due-date actions | Users should be able to edit dates or mark reminders handled |

### P2 Later

| Task | Why It Matters |
| --- | --- |
| Financial asset module | Cash, deposits, funds and holdings need a different model |
| Architecture diagram | Helpful for handoff, not a release blocker |
| Cloud sync or backup | Useful after local trial proves value |
| Monthly bills / transaction module | Expands from asset ledger to full ledger app |

## Release Recommendation

可以发布为：

- 本机试用版
- 内部验收版
- 给自己持续录入资产的桌面版
- Kimi BYOK 文本智能添加的内部试用版

暂不建议发布为：

- 公开下载版
- 面向外部用户的正式安装包
- 对外承诺稳定 AI 服务、图片识别和错误恢复体验的正式版

## Suggested Acceptance Call

本轮可以验收为「本机资产台账 Alpha 试用版 + Kimi BYOK 文本智能添加内测版」。验收边界是：资产、权益、会员的本机管理体验成立；JSON 备份恢复和删除撤销已覆盖基础数据安全；Kimi 文本解析已能真实生成 AI 预览；金融资产、图片识别、外部分发能力和稳定 AI 错误恢复明确留到下一阶段。

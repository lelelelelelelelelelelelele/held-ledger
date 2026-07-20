# Release Readiness Report

## Verdict

暂缓下一版发布。当前版本可以继续本机/内部试用，但 2026-07-15 图片 BYOK 实验发现智能添加 ID 在重启后可能从 `nl1` 重新计数，导致确认页显示成功、IndexedDB 中的新记录却被同 ID 旧记录覆盖。修复前不应重新发布安装包。

核心理由：

- 桌面 App、初始化资产、自然语言添加、可编辑确认、API 错误重试、JSON 导出/导入、删除撤销、资产排序、逾期待办、打包 App smoke test 均已通过。
- BYOK / OpenAI-compatible API 链路已用本地 mock server 验收，证明前端在 base URL 包含 `/v1` 时会请求 `/chat/completions`，最终路径为 `/v1/chat/completions`，并携带 Bearer token、解析 JSON、完成确认添加。
- Kimi Coding `kimi-for-coding` 已用合成图片完成一次真实服务商验收：base64 `image_url` 请求返回 `200`，名称、分类、价格和日期均正确进入 App 预览。
- 图片识别 provider 能力已验证，但既有数据档的确认保存触发了通用智能添加 ID 冲突；单次 Kimi 通过也不等于多模型或多服务商稳定兼容。
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
| BYOK API | Experimental | 文本 mock/API UI 通过；Kimi Coding 单次图片 live test 通过；智能添加持久化 ID 冲突待修复 |

## Validation Results

| Check | Result | Evidence |
| --- | --- | --- |
| Source Electron smoke | Pass | `npm run test:desktop` |
| Seeded flow acceptance | Pass | `npm run test:seeded-flow`，覆盖初始化、逾期待办、资产排序、自然语言添加编辑确认、删除撤销、JSON 导出/导入 |
| BYOK mock API smoke | Pass | `npm run test:byok-api` |
| BYOK API error/retry smoke | Pass | `npm run test:byok-api-error` |
| Kimi Coding image live API/UI | Pass | 合成 PNG → base64 `image_url` → `200` → 结构化预览；见 `kimi_image_byok_live_REPORT.md` |
| Existing-profile confirm persistence | Fail | 已有 `nl1` 时，新图片资产在内存显示但 IndexedDB 保留旧 `nl1` 记录 |
| Packaged app smoke | Pass | `npm run test:packaged` |
| Computer Use visual check | Pass | 总览显示金融资产暂未开发、权益估值、会员订阅 |

## API Readiness

| Item | Status | Notes |
| --- | --- | --- |
| Request path | Pass | mock server received `/v1/chat/completions` |
| Authorization header | Pass | script verifies `Bearer test-token` |
| Model field | Pass | script verifies configured model is sent |
| JSON response parsing | Pass | mock response becomes smart-add preview |
| Mock confirm add after API result | Pass | editable preview can be confirmed into asset detail |
| API failure recovery | Pass | failed API call shows error, keeps local fallback, and can retry AI |
| Real provider live test | Pass for one provider | Kimi Coding `kimi-for-coding` text and single-image paths have live evidence; other providers are not claimed |
| Image API path | Pass | App sent a base64 `image_url`; Kimi returned correct structured asset fields |
| Persistent confirm on existing profile | Fail | `nlSeq` resets to 1 after restart and can reuse an existing asset ID |

## Open TODO Summary

以下为发布风险摘要；完整开发待办以 `docs/todo.md` 为准。

### Before Public DMG Distribution

| Task | Why It Matters |
| --- | --- |
| Fix smart-add ID reuse after restart | Prevent a successful-looking confirmation from losing or overwriting the new IndexedDB record |
| Apple Developer ID signing | Avoid first-launch trust friction |
| Apple notarization | Required for smooth external macOS distribution |

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
- 隔离数据副本上的内部验收版
- BYOK / OpenAI-compatible 文本和 Kimi Coding 单次图片识别实验版

暂不建议发布为：

- 公开下载版
- 面向外部用户的正式安装包
- 修复智能添加 ID 冲突前用于持续录入真实资产
- 对外承诺稳定、多服务商图片识别和错误恢复体验的正式版

## Suggested Acceptance Call

本轮新增验收为「Kimi Coding 图片识别 provider 能力通过」。合成图片成功进入真实 API 和结构化预览；但下一版发布被智能添加 ID 冲突阻塞。修复并补充跨重启回归前，不把“确认添加”视为可靠持久化，也不扩大到稳定、多服务商兼容承诺。

# Release Readiness Report

## Verdict

有条件通过。当前版本可以作为本机/内部试用版发布；不建议直接作为外部分发版发布。

核心理由：

- 桌面 App、初始化资产、自然语言添加、打包 App smoke test 均已通过。
- BYOK / OpenAI-compatible API 链路已用本地 mock server 验收，证明前端会发起 `/chat/completions` 请求、携带 Bearer token、解析 JSON 并完成确认添加。
- 真实服务商 token 的 live API 验收尚未在本轮执行。
- macOS 包仍未签名、未公证，外发会遇到 Gatekeeper 摩擦。

## Current Scope

| Area | Status | Notes |
| --- | --- | --- |
| 本机桌面 App | Ready for local/internal trial | Electron 包装 `demo/index.html` |
| macOS packaged app | Ready for local/internal trial | `dist/mac-arm64/持有.app` 可启动 |
| DMG | Build-supported | 需要外发前重新构建并签名/公证 |
| 初始化资产 | Ready | 新用户目录会加载基础资产集合 |
| 本机真实数据 | Not versioned | IndexedDB 本机数据不进 Git |
| 金融资产 | Deferred | 当前显示为「暂未开发」 |
| 实物资产 | Ready for trial | 数码、家居、交通 |
| 权益票券 | Ready for trial | 里程、礼品卡、票券 |
| 会员订阅 | Ready for trial | 独立到期提醒类 |
| BYOK API | Mock-tested | 真实服务商 token 尚未 live test |

## Validation Results

| Check | Result | Evidence |
| --- | --- | --- |
| Source Electron smoke | Pass | `npm run test:desktop` |
| Seeded flow acceptance | Pass | `npm run test:seeded-flow` |
| BYOK mock API smoke | Pass | `npm run test:byok-api` |
| Packaged app smoke | Pass | `npm run test:packaged` |
| Computer Use visual check | Pass | 总览显示金融资产暂未开发、权益估值、会员订阅 |

## API Readiness

| Item | Status | Notes |
| --- | --- | --- |
| Request path | Pass | mock server received `/v1/chat/completions` |
| Authorization header | Pass | script verifies `Bearer test-token` |
| Model field | Pass | script verifies configured model is sent |
| JSON response parsing | Pass | mock response becomes smart-add preview |
| Confirm add after API result | Pass | preview can be confirmed into asset detail |
| Real provider live test | Gap | needs an actual token and network-provider verification |
| Image API path | Gap | text API is tested; image upload path still depends on real model support |

## Open TODO

### P0 Before External Release

| Task | Why It Matters |
| --- | --- |
| Apple Developer ID signing | Avoid first-launch trust friction |
| Apple notarization | Required for smooth external macOS distribution |
| Real provider BYOK live test | Mock proves integration shape, not provider behavior |
| Data export/backup | IndexedDB-only storage is fragile for real use |
| Stronger reset warning | 「恢复初始化数据」 can overwrite local ledger state |

### P1 Before Wider Beta

| Task | Why It Matters |
| --- | --- |
| Single asset delete/undo | Needed for mistaken entries |
| Editable smart-add confirmation | Avoid confirm-then-fix workflow |
| Import/export | Makes user data portable |
| API error and retry UI | BYOK failures should be understandable |
| Data model migrations | Future category changes should not require manual repair |
| Photo/source cleanup | Candidate assets should stay out of product repo |

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

暂不建议发布为：

- 公开下载版
- 面向外部用户的正式安装包
- 依赖真实 AI 服务商的稳定功能版

## Suggested Acceptance Call

本轮可以验收为「本机资产台账桌面试用版」。验收边界是：资产、权益、会员的本机管理体验成立；金融资产和外部分发能力明确留到下一阶段。

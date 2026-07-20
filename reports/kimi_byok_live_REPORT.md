# Kimi BYOK Live Test Report

## Verdict

通过。Kimi BYOK 文本解析链路已经在真实服务商、开发版 Electron、重启后的持久化配置、以及打包版 App 中验证通过。

> 2026-07-15 更新：图片识别已在 `kimi-for-coding` 上完成后续 live test。图片请求和结构化预览通过；确认保存同时暴露出通用智能添加 ID 冲突。最新结论见 `reports/kimi_image_byok_live_REPORT.md`。

本轮确认的可用配置：

| Field | Value |
| --- | --- |
| Provider | Kimi Coding |
| Base URL | `https://api.kimi.com/coding/v1` |
| Model | `kimi-latest` |
| Request URL | `https://api.kimi.com/coding/v1/chat/completions` |
| Temperature | `1` |

API key 已写入本机应用配置用于 BYOK 测试，但没有写入仓库文件或报告。

## What Was Actually Tested

| Test Area | Result | Evidence |
| --- | --- | --- |
| Direct provider endpoint | Pass | `POST https://api.kimi.com/coding/v1/chat/completions` returned `200` with JSON content |
| Wrong base path check | Pass | `https://api.kimi.com/coding/chat/completions` returned `404`, confirming `/v1` is required |
| Kimi parameter compatibility | Pass after fix | `temperature: 0.2` returned `400`; `temperature: 1` returned `200` |
| Source Electron UI live parse | Pass | Preview showed `来源：AI 智能解析` |
| Config persistence after restart | Pass | BYOK config persisted in IndexedDB `config/byok_v1` after app restart |
| Packaged app smoke | Pass | `npm run test:packaged` passed against `dist/mac-arm64/持有.app` |
| Packaged app live parse | Pass | Packaged app preview showed `来源：AI 智能解析` |
| Existing mock BYOK regression | Pass | `npm run test:byok-api` still passes |
| Seeded app flow regression | Pass | `npm run test:seeded-flow` still passes |
| Source desktop smoke | Pass | `npm run test:desktop` still passes |

## Real Effect Test Cases

| Input | Runtime | Observed Preview | Result |
| --- | --- | --- | --- |
| `昨天 199 元买了一个 Kimi 测试键盘` | Source Electron, temporary profile | Name: `Kimi 测试键盘`; category: `数码`; price: `¥199.00`; bought date: `2026-07-03`; source: `AI 智能解析` | Pass |
| `今天 88 元买了一张 Kimi 验证礼品卡` | Source Electron, persisted app profile after restart | Name: `Kimi 验证礼品卡`; category: `权益`; price: `¥88.00`; bought date: `2026-07-04`; source: `AI 智能解析` | Pass |
| `今天 66 元买了一张打包版 Kimi 测试卡` | Packaged App, persisted app profile | Name: `打包版 Kimi 测试卡`; category: `权益`; price: `¥66.00`; bought date: `2026-07-04`; source: `AI 智能解析` | Pass |

The tests stopped at preview. No test asset was confirmed into the user's ledger.

## Fixes Made During Testing

| File | Change | Why |
| --- | --- | --- |
| `demo/index.html` | Kimi preset changed to `https://api.kimi.com/coding/v1` | The user-provided `/coding/` base becomes a 404 when the app appends `/chat/completions`; `/coding/v1` is the working OpenAI-compatible base |
| `demo/index.html` | Kimi Coding requests use `temperature: 1` | The provider rejects `temperature: 0.2` for `kimi-latest` on this endpoint |
| `demo/index.html` | BYOK config is persisted in IndexedDB `config/byok_v1`, with localStorage compatibility retained | Electron `file://` localStorage did not reliably survive restart in this app path |
| `tools/smoke-byok-api.mjs` | Test navigation changed from internal `route()` to public `window.fillAdd()` | `route()` is not exposed globally in current page scope |

## Commands Run

| Command / Check | Result |
| --- | --- |
| Direct Kimi live request with `temperature: 1` | Pass |
| Source Electron live UI parse | Pass |
| Persisted app profile live UI parse | Pass |
| Packaged app live UI parse | Pass |
| `npm run test:byok-api` | Pass |
| `npm run test:seeded-flow` | Pass |
| `npm run test:desktop` | Pass |
| `npm run pack:desktop` | Pass; regenerated `dist/mac-arm64/持有.app` |
| `npm run test:packaged` | Pass |
| `git diff --check` | Pass |
| Secret scan for the supplied key in repo files | Pass; no key found |

## Current Gaps at the Time of This Test

| Gap | Impact |
| --- | --- |
| Image recognition path not live-tested | 已由 2026-07-15 的后续图片实验补齐；见 `reports/kimi_image_byok_live_REPORT.md` |
| DMG not rebuilt in this run | `dist/mac-arm64/持有.app` was regenerated; the existing DMG may still contain the previous app build |
| App is still unsigned / unnotarized | Suitable for local/internal trial, not polished external distribution |
| API key remains local BYOK data | Good for local testing; production distribution should use a safer backend/proxy or explicit BYOK privacy model |

## Acceptance Call

Kimi BYOK text parsing can be accepted for local/internal testing. The most important real effect is that the app now produces AI-sourced structured previews from real Kimi responses after restart and in the packaged App, instead of silently falling back to local parsing.

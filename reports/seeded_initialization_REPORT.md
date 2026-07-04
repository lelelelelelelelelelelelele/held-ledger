# Seeded Initialization Acceptance Report

## Verdict

通过。macOS 本机版已经从空账本改为默认初始化此前记录过的一组资产，并且可继续通过智能添加录入新资产。

## Current Seeded State

| Metric | Value |
| --- | --- |
| 总资产净值 | `¥256,530.00` |
| 金融资产 | `暂未开发` |
| 实物资产 | `5 项 · ¥256,450.00` |
| 权益票券 | `1 项 · ¥80.00` |
| 会员订阅 | `0 项 · 到期提醒` |
| 生命周期状态 | `服役中 5 · 闲置 0 · 已退役 0 · 已卖出 0` |
| 待办 | `1 项` |

## Initialized Assets

| Group | Assets |
| --- | --- |
| 数码/实物 | MacBook Air 13", 9700X + 5070 主机, Mate 70 Pro+ |
| 家居/实物 | T90 Pro 扫地机器人 |
| 交通/实物 | 极氪001 |
| 权益票券 | 好利来礼品卡 |

## Product Changes

| Area | Change | Result |
| --- | --- | --- |
| 初始化数据 | `DEFAULT_ASSETS` 改为此前记录过的资产集合 | 新安装/新用户目录首次打开即显示资产台账 |
| 资产分组 | 金融资产设为「暂未开发」，会员从「权益票券」拆到「会员订阅」 | 金融资产不混入当前实物/权益生命周期口径 |
| 实物分类 | 智能表归入「数码」，取消单独「腕表」筛选 | GT 6 等可穿戴设备与数码资产保持一致 |
| 本机数据隔离 | IndexedDB 名称改为 `youshu_ledger_seeded_v4` | 避免混入前几轮误初始化数据 |
| 重置入口 | 「清空本机数据」改为「恢复初始化数据」 | 语义匹配当前初始化版本 |
| 详情编辑 | 实物资产详情页增加「改购入日」按钮 | 极氪001 可在 App 内直接编辑购入日期 |
| 验收脚本 | `test:empty-flow` 改为 `test:seeded-flow` | 自动化复验初始化资产和新增录入 |

## Validation Results

| Check | Result |
| --- | --- |
| `npm run test:seeded-flow` | Pass |
| `npm run test:desktop` | Pass |
| `npm run build:desktop` | Pass |
| `npm run test:packaged` | Pass |
| 默认本机目录启动打包 App | Pass |

## Screenshot Evidence

| Screenshot | What It Shows |
| --- | --- |
| `reports/screenshots/seeded_initialization_overview.png` | 本机打包 App 打开后，总览显示 6 项初始化资产、`¥256,530.00` 总净值和 1 项待办 |
| `reports/screenshots/computer_use_zeekr_purchase_date_editor.png` | Computer Use 验证极氪001 详情页可通过「改购入日」编辑 `2026-06-25` |

## Packaged Artifacts

| Artifact | Path |
| --- | --- |
| macOS App | `dist/mac-arm64/持有.app` |
| macOS DMG | `dist/持有-0.1.0-alpha.0-arm64.dmg` |

## Known Gaps

| Gap | Impact | Suggested Follow-up |
| --- | --- | --- |
| 当前仍是本机未签名包 | 本机试用可接受，外发会有 Gatekeeper 提示 | 仅外发时再做签名/公证 |
| 初始化资产来自现有记录集合，尚未做逐项用户确认 | 个别金额/日期可能仍需人工校准 | 后续在 App 里逐项编辑修正 |
| 确认预览仍不可直接编辑字段 | 智能添加解析错时需要先确认后再改 | 增加可编辑确认表单 |
| 单项资产缺少删除/撤销 | 误录后清理不够顺手 | 增加单项删除和撤销 |

## Conclusion

本机版可以结项：它已经是可安装、可打开、带初始化资产数据、可继续录入的桌面试用版。

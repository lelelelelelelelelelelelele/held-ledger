# Todo

## Before Design

- [ ] 明确平台：Web、移动 Web、桌面，或跨端
- [ ] 收集“有数”参考截图或页面路径
- [ ] 确定 MVP 范围
- [ ] 定义默认分类体系
- [ ] 定义非现金资产分类体系
- [ ] 明确“资产”“权益”“票券”“储值卡”的命名边界
- [ ] 确定是否需要账户余额模型
- [ ] 确定是否需要预算提醒
- [ ] 确定第一版要支持哪些资产模板：航段、车辆、礼品卡、票券、保单等
- [ ] 确定非现金资产是否参与总资产估值

## Before Development

- [ ] 选择技术栈
- [ ] 设计数据模型
- [ ] 设计资产模板和自定义字段模型
- [ ] 设计路由和主要页面结构
- [ ] 确定本地存储、后端或云同步方案
- [ ] 准备基础组件清单
- [ ] 准备测试策略

## Candidate Data Model

- Transaction
- Category
- Account
- Asset
- AssetType
- AssetField
- AssetEvent
- Entitlement
- GiftCard
- Vehicle
- Budget
- RecurringRule
- MonthlySummary

## Next Suggested Step

下一步可以先做信息架构和页面清单，再进入低保真原型或直接搭建应用骨架。

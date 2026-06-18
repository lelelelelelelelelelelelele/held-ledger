# Open Source Demos And References

这里记录可参考的开源项目。它们不是要直接照搬，而是用于观察记账、资产记录、权益记录、数据可视化和移动端交互的处理方式。

本项目的方向不是理财工具，而是生活资产、权益和流水台账工具。参考项目时要优先看录入效率、信息架构、分类体系、图表表达和日常资产管理方式。

## Primary References

### BeeCount

- URL: https://github.com/TNT-Likely/BeeCount
- Type: Flutter cross-platform app
- Why it matters: 功能较完整，适合参考记账、预算、多账户、图表、导入导出和本地数据结构。
- Caution: 功能面较宽，后续设计时要避免第一版过重。

### 一刻记账 yike-app

- URL: https://github.com/xiaojinzi123/yike-app
- Type: Android app
- Why it matters: 中文记账产品，更接近国内用户对分类、账本、流水和统计的理解。
- Caution: 参考产品结构和交互，不默认复用代码。

### Dime

- URL: https://github.com/rafsoh/dimeApp
- Type: iOS / SwiftUI app
- Why it matters: 适合参考 iOS 化的简洁视觉、预算、周期记录、提醒和小组件体验。
- Caution: 更偏纯支出追踪，本项目还要扩展到航段、礼品卡、车辆等权益和资产。

## Secondary References

### Squirrel

- URL: https://github.com/PinkXaciD/Squirrel
- Type: iOS app
- Why it matters: 可参考本地优先、快速录入、图表、筛选、导出。

### Open Money Tracker

- URL: https://github.com/xorum-io/open_money_tracker
- Type: Android app
- Why it matters: 可参考传统个人财务记录、账户、转账、多币种、报表等结构。
- Caution: 本项目不是传统理财工具，不需要复制复杂财务能力。

### Lime

- URL: https://github.com/janrone/lime
- Type: Flutter + backend
- Why it matters: 中文跨端项目，可参考项目组织和全栈结构。

### ezBookkeeping

- URL: https://github.com/mayswind/ezbookkeeping
- Type: Web / PWA
- Why it matters: 可参考自部署、PWA、交易记录、图表、搜索筛选和数据导入导出。
- Caution: 不是原生 app，适合作为功能参考，不作为移动端交互主参考。

## Demo Direction For This Project

第一版 demo 不应做成复杂财务系统，建议聚焦：

- 记录一笔流水
- 记录一个资产或权益
- 管理资产模板：航段、车辆、礼品卡
- 查看本月流水摘要
- 查看资产和权益清单
- 提醒快过期或需要处理的项目

## Example Non-Cash Records

- 国航航段：总数 2 个，剩余 2 个，有效期和使用记录
- 车辆：车牌、购入价格、保险到期、保养记录、相关支出
- 好利来礼品卡：面值、余额、有效期、消费记录


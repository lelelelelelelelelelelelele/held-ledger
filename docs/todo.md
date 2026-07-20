# Todo

## Release Readiness

当前状态：已有 Alpha 可继续本机/内部试用；下一次发布前需先修复智能添加 ID 重启后复用问题。BYOK / OpenAI-compatible 文本智能添加和 Kimi Coding 单次图片识别均已完成 live test；暂不建议作为面向大众的稳定正式 App 发布。

### Done

- [x] Electron 桌面入口
- [x] macOS arm64 `.app` / `.dmg` 打包配置
- [x] 本机初始化资产台账
- [x] 资产分类基础口径：金融资产暂未开发、实物资产、权益票券、会员订阅
- [x] 里程按用户口径折算估值
- [x] 智能添加本地解析
- [x] BYOK OpenAI-compatible API mock 验收
- [x] BYOK / OpenAI-compatible API/UI 验收
- [x] BYOK 配置改为 IndexedDB 持久化，保留 localStorage 兼容读取
- [x] 导出 / 导入 JSON，降低本机 IndexedDB 丢失风险
- [x] 单项资产删除 / 撤销，降低误录和误点成本
- [x] 资产列表排序入口：默认、价值最高、最近购入、日均最高、到期最近
- [x] 逾期提醒闭环：已过期权益进入总览和待办页，并在临期筛选/到期排序中可见
- [x] 智能添加确认页支持编辑字段：名称、分类、购入价、购入日、当前估值、备注
- [x] API 错误状态和重试提示：失败后本地兜底、重试 AI、改 API 设置
- [x] 图像/照片资产来源策略：`photoSource` 标注、详情展示、JSON 导出、策略报告
- [x] Release 宣发图：GitHub Release 封面、功能拼图、社群方图和生成脚本
- [x] README 明确本地存储、无云同步、BYOK 密钥存储、未签名安装说明和已知限制
- [x] Release 标记为 Alpha（`0.1.0-alpha.0`）
- [x] 发布前验证重跑：desktop、seeded-flow、byok-api、packaged
- [x] Packaged app smoke test
- [x] 关键验收报告与截图归档

### P0 Before Open Source Alpha

- [ ] 修复智能添加资产 ID 在重启后从 `nl1` 重新计数的问题，避免 IndexedDB 中同 ID 旧资产覆盖新资产

重新发布前需修复该数据持久化问题，并再次运行验证命令。

### P1 Before Wider Beta

- [ ] 数据模型版本迁移策略
- [ ] 更完整的会员、权益到期处理动作：改有效期、标记已处理、批量视图

### P2 Before External Stable Release

- [ ] Apple Developer ID 签名
- [ ] Apple notarization 公证
- [x] Kimi Coding 图片 BYOK live test：base64 `image_url` 请求、结构化预览和确认页均通过；持久化暴露的 ID 冲突另列 P0
- [x] 公开源码 branch 不跟踪 `demo/thumbs/`，默认改用生成占位图
- [ ] 更完整的数据备份/恢复策略

### P3 Later

- [ ] 金融资产模块：现金、存款、基金、持仓独立账户模型
- [ ] 架构图或模块说明
- [ ] 多设备同步或云备份
- [ ] 自动估值历史
- [ ] 月度账单和流水记账模块

## Validation Commands

```sh
npm test
npm run test:p1
npm run test:desktop
npm run test:seeded-flow
npm run test:byok-api
npm run test:byok-api-error
npm run test:packaged
npm run build:promo
```

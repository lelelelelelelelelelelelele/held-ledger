# Todo

## Release Readiness

当前状态：可以作为本机/内部试用版发布；不建议作为外部分发版发布。

### Done

- [x] Electron 桌面入口
- [x] macOS arm64 `.app` / `.dmg` 打包配置
- [x] 本机初始化资产台账
- [x] 资产分类基础口径：金融资产暂未开发、实物资产、权益票券、会员订阅
- [x] 里程按用户口径折算估值
- [x] 智能添加本地解析
- [x] BYOK OpenAI-compatible API mock 验收
- [x] Packaged app smoke test
- [x] 关键验收报告与截图归档

### P0 Before External Release

- [ ] Apple Developer ID 签名
- [ ] Apple notarization 公证
- [ ] 使用真实服务商 token 跑一次 BYOK live API 验收
- [ ] 明确 BYOK 密钥存储和隐私提示：当前仅本机 localStorage，适合本机试用
- [ ] 增加数据导出/备份入口，避免本机 IndexedDB 丢失后无法恢复
- [ ] 给「恢复初始化数据」增加更强确认或备份提示

### P1 Before Wider Beta

- [ ] 单项资产删除/撤销
- [ ] 智能添加确认页支持编辑字段
- [ ] 资产数据导入/导出
- [ ] API 错误状态和重试提示
- [ ] 数据模型版本迁移策略
- [ ] 图像/照片资产来源整理和替换策略
- [ ] 更完整的会员、权益到期提醒视图

### P2 Later

- [ ] 金融资产模块：现金、存款、基金、持仓独立账户模型
- [ ] 架构图或模块说明
- [ ] 多设备同步或云备份
- [ ] 自动估值历史
- [ ] 月度账单和流水记账模块

## Validation Commands

```sh
npm run test:desktop
npm run test:seeded-flow
npm run test:byok-api
npm run test:packaged
```

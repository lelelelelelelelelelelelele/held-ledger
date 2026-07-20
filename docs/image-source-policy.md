# Image Source Policy

## Purpose

图片和照片必须可追踪来源，避免把演示素材、用户上传、AI 识别输入和运行时占位图混在一起。

## Source Types

| Source | Code | Meaning | Release Rule |
| --- | --- | --- | --- |
| 历史本机演示图 | `bundled_demo` | 旧数据可能引用本机 `demo/thumbs/*.jpg` | 目录被 Git 忽略，只允许留在个人工作副本或内部构建，不进入公开 branch |
| 用户上传 | `user_upload` | 用户在资产详情中手动添加/更换的照片 | 属于本机用户数据，导出 JSON 时保留 |
| AI 识别输入图 | `ai_input_upload` | 用户通过智能添加传图识别，并被保存为资产图 | 会发送到用户配置的 BYOK 服务商；确认后保存在本机，导出 JSON 时保留 |
| 生成占位图 | `generated_placeholder` | 没有照片时由本地 SVG 生成的临时缩略图 | 仅作 UI 占位；导出时不保留 SVG 图片内容 |

## Implementation

- 仓库默认种子只使用合成数据，不引用真实图片；启动时生成占位图。
- 旧版 IndexedDB 中的 `bundled_demo` 记录继续兼容，但对应本机图片不再由 Git 跟踪。
- 资产详情上传照片后标记为 `photoSource: "user_upload"`，并记录 `photoUpdated`。
- 智能添加传图确认后标记为 `photoSource: "ai_input_upload"`，并记录 `photoUpdated`。
- 2026-07-15 使用合成图片和 Kimi Coding `kimi-for-coding` 完成单次 live test：图片请求返回 `200`，结构化预览字段全部匹配。
- 确认保存实验暴露出通用智能添加 ID 重启后复用问题；该问题与图片识别能力无关，但修复前不能把图片添加链路视为可靠持久化。
- 没有照片的资产运行时生成占位图并标记为 `generated_placeholder`。
- 资产详情页会显示“图片来源”。
- JSON 导出会保留 `photoSource`；生成占位 SVG 不作为真实照片导出。

## Replacement Strategy

公开分发按以下规则处理：

1. 公开 branch 不包含 `demo/thumbs/`、用户上传图片、验收截图或个人资产宣传图。
2. 默认演示数据只使用生成占位图；若未来增加公开图片，必须先确认授权并记录来源。
3. 保留 `photoSource` 字段，确保导入旧数据后仍能区分用户上传、历史本机图片和占位图。
4. 图片 BYOK live test 只验证识别能力，不等同于图片素材版权验证。

## Current Status

当前 tracked source 已改为合成种子 + 生成占位图；真实资产图片仅可存在于本机 IndexedDB、被忽略的个人目录或内部证据 branch。AI 识别输入会发送给用户主动配置的 BYOK 服务商。公开 branch 需要继续执行隐私扫描，下一版发布前还需修复智能添加 ID 冲突。

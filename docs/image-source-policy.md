# Image Source Policy

## Purpose

图片和照片必须可追踪来源，避免把演示素材、用户上传、AI 识别输入和运行时占位图混在一起。

## Source Types

| Source | Code | Meaning | Release Rule |
| --- | --- | --- | --- |
| 内置演示图 | `bundled_demo` | 随 demo 打包的 `demo/thumbs/*.jpg` | 可用于本机 Alpha；公开营销或正式分发前需要确认版权或替换 |
| 用户上传 | `user_upload` | 用户在资产详情中手动添加/更换的照片 | 属于本机用户数据，导出 JSON 时保留 |
| AI 识别输入图 | `ai_input_upload` | 用户通过智能添加传图识别，并被保存为资产图 | 属于本机用户数据，导出 JSON 时保留；图片识别能力仍需 live test |
| 生成占位图 | `generated_placeholder` | 没有照片时由本地 SVG 生成的临时缩略图 | 仅作 UI 占位；导出时不保留 SVG 图片内容 |

## Implementation

- 默认种子资产的真实缩略图标记为 `photoSource: "bundled_demo"`。
- 资产详情上传照片后标记为 `photoSource: "user_upload"`，并记录 `photoUpdated`。
- 智能添加传图确认后标记为 `photoSource: "ai_input_upload"`，并记录 `photoUpdated`。
- 没有照片的资产运行时生成占位图并标记为 `generated_placeholder`。
- 资产详情页会显示“图片来源”。
- JSON 导出会保留 `photoSource`；生成占位 SVG 不作为真实照片导出。

## Replacement Strategy

公开分发前按以下顺序处理：

1. 审核 `demo/thumbs/*.jpg` 的来源与授权。
2. 无法确认授权的演示图替换为自有拍摄、授权素材或生成占位图。
3. 保留 `photoSource` 字段，确保导入旧数据后仍能区分用户上传和演示素材。
4. 图片 BYOK live test 只验证识别能力，不等同于图片素材版权验证。

## Current Status

当前策略已覆盖来源标注、详情页展示、JSON 导出和自动验收。公开稳定版之前仍需完成演示缩略图版权审核或替换。

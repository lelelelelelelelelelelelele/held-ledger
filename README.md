# Held Ledger（持有）

Held Ledger 是一个 local-first 的个人资产台账与轻量记账工具，当前已经包含可运行 demo 和 macOS 桌面打包配置。

当前桌面版名称为「持有」，版本为 `0.1.0-alpha.1`（Alpha）。

## 启动应用与本地数据

### 启动应用（Mac）

安装后，从「应用程序」打开「持有」，或在终端运行：

```sh
open "/Applications/持有.app"
```

从源码运行时，在项目根目录执行 `npm run desktop`；依赖安装和 DMG 构建步骤见下方「多端安装与运行」。

### 台账存在哪里

台账自动保存在本机数据库中，不会为每件物品生成单独的文档。

| 内容 | 默认位置 / 获取方式 |
| --- | --- |
| 当前版本的 Mac 应用数据目录 | `~/Library/Application Support/held-ledger/`（首次运行后创建） |
| 台账、物品图片和 API 配置 | 上述目录的 `IndexedDB/` 中 |
| API 配置兼容副本 | 上述目录的 `Local Storage/` 中 |
| 可携带的备份文件 | 在「我的 → 导出 JSON 备份」生成 `held-ledger-backup-日期.json`；保存位置以下载提示或下载设置为准 |

在 Finder 中按 `⌘⇧G`，粘贴 `~/Library/Application Support/held-ledger/` 即可前往数据目录。这里的 `~` 代表当前用户的个人文件夹。使用自定义 `--user-data-dir` 启动时，以指定目录为准。

早期版本可能使用 `~/Library/Application Support/youshu-ledger-app/`。旧目录与当前目录不应视为已自动迁移，转移台账请使用应用内 JSON 导出 / 导入。

浏览器预览的数据保存在该浏览器自己的站点存储中，与桌面应用的数据目录独立。日常备份和换机使用 JSON 导出 / 导入即可，无需直接编辑数据库文件。

源码仓库：[held-ledger](https://github.com/lelelelelelelelelelelelele/held-ledger)。

## BYOK：使用自己的 AI API Key

BYOK（Bring Your Own Key）用于「智能添加」：输入一句购买描述，或上传一张图片，提取物品名称、分类、购买价格、购买日期、估值和备注。结果先进入可编辑的确认页，确认后才加入台账；模型给出的价格或估值需要自行核对。

1. 在「我的」中打开「智能添加 · 接入 API」，选择内置的小米 MiMo 预设或「自定义」。
2. 填入服务商的 API Base URL、API Key 和模型名称，点击「保存并启用」。Base URL 填接口根地址，程序会自动追加 `/chat/completions`，不要重复填写完整端点。
3. 打开「智能添加」，输入例如“昨天买了一个 399 元的背包”，或选择图片，核对结果后确认添加。

- 自定义服务商需要兼容 OpenAI 风格的 Chat Completions 接口及 JSON 对象输出；图片识别还需要模型支持 `image_url` 输入。
- 不配置 Key 也能使用本地文字规则解析。文字 AI 请求失败时会回退到本地解析；图片识别需要 AI，失败时显示错误并支持重试。
- Key 和接口配置保存在本机 IndexedDB，同时写入 localStorage 兼容副本，并非系统钥匙串加密存储。
- 启用 AI 后，本次录入的文字或图片会发送给配置的服务商；调用费用及数据处理规则由该服务商决定。普通台账操作不需要 AI。
- 部分接口会限制浏览器跨域请求（CORS），填入 Key 不代表一定能连接。已有 Kimi Coding 单次图片识别历史验证，不能据此保证所有服务商或模型兼容。

## 多端安装与运行

当前没有多设备自动同步。各设备、浏览器和桌面 App 的数据独立；换设备可在「我的」导出 JSON，再在目标端导入。导入会覆盖目标端当前台账，操作前先备份。

| 平台 | 状态 | 安装方式 |
| --- | --- | --- |
| macOS Apple Silicon（M 系列） | Alpha（Apple Silicon） | 通过下方 Release 入口下载 DMG 后安装 |
| Intel Mac | Ongoing（开发中） | 暂未提供已验证的安装方式 |
| Windows | Ongoing（开发中） | 暂未提供安装包 |
| Linux | Ongoing（开发中） | 暂未提供安装包 |
| iPhone / iPad / Android / HarmonyOS（鸿蒙） | Ongoing（开发中） | 暂未提供原生安装包或已验证的 PWA 安装方式 |

其他平台的 Ongoing 为项目状态标记，不代表已完成兼容验证或承诺发布日期。

### Mac 下载安装

安装包入口：[GitHub Releases](https://github.com/lelelelelelelelelelelelele/held-ledger/releases)。

下载 [v0.1.0-alpha.1 安装包](https://github.com/lelelelelelelelelelelelele/held-ledger/releases/tag/v0.1.0-alpha.1) 中的 `.dmg` → 双击打开 → 将「持有.app」拖入「应用程序」→ 打开「持有」。无需安装 Node.js、克隆仓库或运行 npm 命令。`Source code` 是开发用源码，不是安装包。

安装包未签名 / 未公证；若 macOS 阻止打开，可在「系统设置 → 隐私与安全性」处理提示。

## Storage and Limits

- 台账数据存储在本机浏览器 / Electron 的 IndexedDB 中，没有云端台账同步；启用 BYOK 时，本次录入文字或图片会发送给所选 AI 服务商。
- 仓库中的首次启动数据全部是合成示例；真实资产名称、金额、日期和本机图片不应进入 Git。
- 「我的」页支持导出 JSON 备份和导入 JSON 恢复；导入会覆盖本机当前资产数据。
- BYOK API 配置保存在本机 IndexedDB，并保留旧版 localStorage 兼容读取；演示版会由前端直连服务商，请不要在不可信环境粘贴生产密钥。
- 当前安装包未使用 Apple Developer ID 签名，也未 notarization 公证。首次打开时，macOS 可能要求在「系统设置 → 隐私与安全性」中允许打开。
- Kimi Coding 图片 BYOK 已完成一次真实图片识别实验；其他服务商和模型不作稳定兼容承诺。
- 金融资产模块、稳定错误恢复、数据模型迁移和云备份仍属于后续开发范围。

## Documents

- `docs/product-brief.md`：产品方向、用户场景、核心功能边界
- `docs/design-notes.md`：参考产品观察、交互和视觉方向记录
- `docs/image-source-policy.md`：图片来源标注、导出和公开分发前替换策略
- `docs/todo.md`：后续开发前需要确认和执行的事项
- `docs/demo/open-source-demos.md`：可参考的开源项目与 demo 方向
- `reports/promo/`：基于真实截图生成的 release 宣发图

## 开发者：源码运行与打包

以下命令供开发和自行构建使用，不是普通用户的安装步骤。

### 从源码启动（Mac）

准备 Git、Node.js 和 npm。当前依赖中的 Electron 要求 Node.js `>=22.12.0`；本机文档核对环境为 Node.js `24.16.0`。

```sh
git clone https://github.com/lelelelelelelelelelelelele/held-ledger.git
cd held-ledger
npm ci
npm run desktop
```

已有本地仓库时，在项目根目录执行 `npm ci` 和 `npm run desktop` 即可。

### 构建安装包（Mac）

在 Mac 上完成依赖安装后运行：

```sh
npm run build:desktop
npm run test:packaged
```

构建成功后打开 `dist/持有-0.1.0-alpha.1-arm64.dmg`，将「持有.app」拖入「应用程序」，再从「应用程序」启动。构建目录中的 App 位于 `dist/mac-arm64/持有.app`。

上述路径是构建输出位置，不代表仓库已附带安装包。若 macOS 阻止打开，确认来源后在「系统设置 → 隐私与安全性」处理系统提示。

### 桌面浏览器预览

也可在桌面浏览器中直接打开克隆目录中的 `demo/index.html`。浏览器预览的数据与桌面 App 独立，不会自动读取 App 中的台账。


### 验证命令

本地开发运行桌面 App：

```sh
npm run desktop
```

生成 macOS arm64 `.app` 与 `.dmg`：

```sh
npm run build:desktop
```

验证源码桌面入口：

```sh
npm run test:desktop
```

验证已打包 App：

```sh
npm run test:packaged
```

验证初始化资产与首次录入流程：

```sh
npm run test:seeded-flow
```

验证 BYOK / OpenAI-compatible API 调用链路：

```sh
npm run test:byok-api
npm run test:byok-api-error
```

验证智能添加 ID 重启不冲突：

```sh
npm run test:regression-smart-add-id-collision
```

生成 release 宣发图：

```sh
npm run build:promo
```

构建成功后的输出路径：

- `dist/mac-arm64/持有.app`
- `dist/持有-0.1.0-alpha.1-arm64.dmg`

注意：Alpha 包仍未签名/公证，外发前仍需要 Apple Developer ID 签名和 notarization。

## Quick Cd

进入项目文档目录：

```sh
cd /Users/lele/Documents/Projects/youshu-ledger-app/docs
```

或者临时加载快捷函数，然后输入 `heldledger` 直接进入项目目录：

```sh
source /Users/lele/Documents/Projects/youshu-ledger-app/scripts/cd-docs.sh
heldledger
```

## Current Scope

当前已经完成：

1. 建立产品与设计文档
2. 实现可交互移动端 demo
3. 封装 macOS 桌面 App
4. 生成并验证 `.app` 与 `.dmg` 安装包
5. 默认初始化合成示例资产，并验收新增录入流程
6. 修复智能添加资产 ID 在重启后复用导致的 IndexedDB 覆盖问题

## License

[ISC](LICENSE)

## 自动发布

GitHub Actions 工作流位于 `.github/workflows/release.yml`。将 `package.json` 与 lockfile 版本一起更新后，推送同版本的 `v*` 标签，例如 `v0.1.0-alpha.1`，会自动测试、构建 Mac arm64 DMG、计算 SHA-256 并发布 GitHub Release。含连字符的版本标为预发布。发布说明来自 `docs/RELEASE_NOTES.md`。

手动运行工作流只生成可下载的构建产物，不创建 Release。构建或测试失败不会发布。此流程是安装包自动发布，不包含 App 内自动更新。

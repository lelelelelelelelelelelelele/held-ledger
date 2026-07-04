# Youshu-Inspired Ledger App

这是一个参考“有数”体验的个人资产与记账工具原型，当前已经包含可运行 demo 和 macOS 桌面打包配置。

当前桌面版名称为「持有」，使用 Electron 封装 `demo/index.html`，可生成 `.app` 与 `.dmg` 安装包。

## Documents

- `docs/product-brief.md`：产品方向、用户场景、核心功能边界
- `docs/design-notes.md`：参考产品观察、交互和视觉方向记录
- `docs/todo.md`：后续开发前需要确认和执行的事项
- `docs/demo/open-source-demos.md`：可参考的开源项目与 demo 方向

## Desktop Package

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

当前构建产物：

- `dist/mac-arm64/持有.app`
- `dist/持有-1.0.0-arm64.dmg`

注意：当前安装包未使用 Apple Developer ID 签名。首次打开时，macOS 可能要求在「系统设置 → 隐私与安全性」中允许打开。

## Quick Cd

进入项目文档目录：

```sh
cd /Users/lele/Documents/Projects/youshu-ledger-app/docs
```

或者临时加载快捷函数，然后输入 `youshu` 直接进入项目目录：

```sh
source /Users/lele/Documents/Projects/youshu-ledger-app/scripts/cd-docs.sh
youshu
```

## Current Scope

当前已经完成：

1. 建立产品与设计文档
2. 实现可交互移动端 demo
3. 封装 macOS 桌面 App
4. 生成并验证 `.app` 与 `.dmg` 安装包
5. 默认初始化此前记录过的资产，并验收新增录入流程

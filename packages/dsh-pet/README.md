# dsh-pet — DSH 多宠物伴侣

![version](https://img.shields.io/badge/version-0.1.11-4f8ef7) ![license](https://img.shields.io/badge/license-BSD--3--Clause-9b59b6) ![platform](https://img.shields.io/badge/platform-DSH%20Web-00c2a8) ![language](https://img.shields.io/badge/language-TypeScript-3178c6)

在 DeepSeek Harness Web 界面中显示一个会响应工作状态的桌面宠物。默认提供 Whale Girl；后续宠物按约定放入素材目录即可自动注册，并在设置卡中选择。

插件基于官方 `@deepseek-ai/*` NPM SDK，以 Cordis bundle 的 host/client 双端形态实现，不修改 DSH 源码。

## 功能

| 功能 | 说明 |
|---|---|
| 多宠物切换 | 在设置的宠物卡片中选择；同一时刻只显示一只，选择结果持久化 |
| 状态动画 | `thinking/tool` 对应工作、`waiting` 对应等待、`done` 对应庆祝，空闲时播放待机动画 |
| 摸摸与喂食 | 点击宠物或使用面板按钮获得气泡反馈和亲密度；互动带冷却 |
| 共享成长 | 亲密度、零食库存、显示位置和尺寸由所有宠物共享 |
| 独立命名 | 每只宠物保存自己的自定义名字，切换后自动恢复 |
| 拖动 | 按住宠物拖动重新摆放，位置会持久化 |
| 隐藏与恢复 | 面板可隐藏宠物，隐藏后页面不留按钮，可在设置卡中恢复显示 |
| 可访问性 | 设置选择器使用原生表单控件和清晰焦点态，并支持 reduced motion |

## 内置宠物

| ID | 默认名称 | 图集 |
|---|---|---|
| `whale` | Whale Girl | 8 列 × 9 行，v1 |

Whale Girl 动画预览：

| idle 待机 | waiting 等待 | running 工作 | jumping 庆祝 |
|---|---|---|---|
| ![idle](assets/whale/previews/idle.gif) | ![waiting](assets/whale/previews/waiting.gif) | ![running](assets/whale/previews/running.gif) | ![jumping](assets/whale/previews/jumping.gif) |

## 架构

```text
dsh-pet/
|-- src/
|   |-- index.ts            # host 入口、设置与路由注册
|   |-- pets.ts             # assets 自动发现与 manifest 注册表
|   |-- service.ts          # 状态机、切换、互动与配置服务
|   |-- state.ts            # activity/status -> 9 条动画轨道
|   |-- affinity.ts         # 共享亲密度账本
|   |-- treats.ts           # 共享零食库存
|   |-- persist.ts          # $DSH_HOME/pet.json 原子持久化与旧数据迁移
|   |-- routes.ts           # /api/pet/* 与 /pet/<petId>/*
|   `-- client/
|       |-- index.ts        # 全局挂载、轮询与 API 接线
|       |-- PetDockEntry.tsx
|       |-- PetCompanion.tsx # 图集渲染、互动和拖动
|       `-- spritesheet.ts   # 图集几何与动画节奏
|-- assets/<petId>/         # 每只宠物的 manifest 与 spritesheet
`-- cordis.patch.yml
```

浏览器端使用一个挂在 `document.body` 上的全局 React root，因此宠物在新会话页和已有会话中保持一致。客户端约每 800 ms 读取 `/api/pet/state`；切换、互动、隐藏、布局和命名分别写入同源 `/api/pet/*` 端点。host 端监听 `activity/status`，将 DSH 工作阶段转换成动画轨道。

持久化模型中，`petId` 表示当前选择，`names` 按宠物 ID 保存自定义名；`affinity`、`treats` 和 `display` 保持共享。旧版 `name` 字段会在读取时迁移到 `names.whale`。

## 安装

推荐安装聚合包 `@linxin666/dsh-web-ui-all`，也可以单独安装：

```sh
dsh plugin --profile web add @linxin666/dsh-pet
```

仓库开发方式：

```sh
git clone https://github.com/zhu1090093659/dsh-web-ui.git
cd dsh-web-ui
pnpm install
pnpm --filter @linxin666/dsh-pet build
dsh plugin --profile web add link:$(pwd)/packages/dsh-pet
```

安装后重启 `dsh web`。link 模式修改代码后重新构建并刷新页面，无需重装。

## 添加宠物

新宠物不需要修改注册代码。在 `packages/dsh-pet/assets/` 下创建 URL 安全的目录，目录名就是稳定的宠物 ID。每个目录至少包含：

```text
assets/my-pet/
|-- pet.json
`-- spritesheet.webp
```

manifest 示例：

```json
{
  "id": "my-pet",
  "displayName": "My Pet",
  "description": "A short optional description.",
  "spritesheetPath": "spritesheet.webp",
  "spriteVersionNumber": 2,
  "frames": [6, 8, 8, 4, 5, 8, 6, 6, 6]
}
```

注册表以目录名为准，不信任 manifest 中的 `id`。合法 ID 由 ASCII 字母或数字开头，后续可包含字母、数字和连字符，最长 64 字符。`displayName` 必填；`description` 可选；`frames` 可选，存在时必须是 9 个 1–8 的整数。缺少 `frames` 时，客户端会扫描透明像素推断每行实际帧数。

图集单元固定为 192×208、每行 8 列。前 9 行依次为 idle、running-right、running-left、waving、jumping、failed、waiting、running、review。渲染器同时支持 9 行 v1 图集和带额外方向行的 11 行 Codex v2 图集，额外两行不会参与 DSH 状态动画。

添加完成后执行：

```sh
pnpm --filter @linxin666/dsh-pet typecheck
pnpm --filter @linxin666/dsh-pet test
pnpm --filter @linxin666/dsh-pet build
```

重启 `dsh web` 后，新宠物会自动出现在“设置 -> 插件 -> Web UI 插件 -> 宠物”的选择器中。建议用 hatch-pet 校验图集后再提交，并确保 manifest 与 WebP 一起进入包内 `assets/`。

## 开发与验证

```sh
pnpm --filter @linxin666/dsh-pet typecheck
pnpm --filter @linxin666/dsh-pet test
pnpm --filter @linxin666/dsh-pet build
```

浏览器 bundle 使用 `window.__ModuleLoader__.load` 契约，React 和 Cordis 等依赖由 DSH loader 提供；CSS Modules 由 Lightning CSS 打进客户端 bundle。

## License

[BSD-3-Clause](LICENSE)

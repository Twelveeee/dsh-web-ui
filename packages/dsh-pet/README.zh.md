# dsh-pet — DSH 多宠物伴侣

[English](README.md) | 中文

面向 DSH Web GUI 的多宠物伴侣插件，支持工作状态动画、宠物切换、互动、按宠物独立命名和共享亲密度。

本包基于官方 `@deepseek-ai/*` NPM SDK，以包含 host 和 browser 两个半区的 Cordis bundle 交付，不修改 DSH 源码。

## 功能

| 功能 | 说明 |
|---|---|
| 宠物选择 | 在设置卡中选择已安装宠物；同一时刻只激活一只，并持久化选择结果 |
| 状态动画 | 根据核心会话事件将思考和工具调用映射为工作动画，将完成回合映射为庆祝，空闲时播放待机动画 |
| 摸摸与喂食 | 点击宠物或使用悬浮面板获得反馈和亲密度，互动受冷却时间限制 |
| 共享成长 | 所有宠物共享亲密度、零食库存、显示尺寸和位置 |
| 独立命名 | 每只宠物保存自己的自定义名字，再次选择时自动恢复 |
| 拖动 | 拖动宠物重新摆放，位置会持久化 |
| 隐藏与恢复 | 从悬浮面板隐藏宠物；页面不保留按钮，通过设置卡恢复显示 |
| 可访问性 | 选择器使用原生控件和清晰焦点态，动画遵循减少动态效果偏好 |

## 内置宠物

| ID | 默认名称 | 图集 |
|---|---|---|
| `whale` | Whale Girl | 8 列 × 9 行，v1 |

Whale Girl 动画预览：

| idle | waiting | running | jumping |
|---|---|---|---|
| ![idle](assets/whale/previews/idle.gif) | ![waiting](assets/whale/previews/waiting.gif) | ![running](assets/whale/previews/running.gif) | ![jumping](assets/whale/previews/jumping.gif) |

## 安装

推荐安装聚合包 `@linxin666/dsh-web-ui-all`。如需直接安装本插件包：

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

## 配置

安装 `dsh-web-ui-settings` 后，设置卡会出现在“设置、插件、Web UI 插件、宠物”中；聚合包已包含该设置界面。

| 字段 | 默认值 | 含义 |
|---|---:|---|
| `visible` | `true` | 是否显示当前选择的宠物 |
| `size` | `160` | 图集单元的显示高度，单位为像素 |
| `right` | `24` | 距离视口右侧的像素值 |
| `bottom` | `20` | 距离视口底部的像素值 |
| `name` | `Whale Girl` | 当前宠物使用的名字；自定义名会按宠物分别保存 |
| `enabled` | `true` | 控制 host 活动监听和路由的总开关 |

当前宠物 ID、按宠物保存的名字、共享亲密度、零食和显示布局存储在 `$DSH_HOME/pet.json`。读取旧版单一 `name` 字段时会将其迁移到 `names.whale`。

## 添加宠物

新宠物不需要修改注册代码。在 `packages/dsh-pet/assets/` 下创建 URL 安全的目录，目录名就是稳定的宠物 ID。每个宠物目录必须包含：

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

注册表以目录名为准，不信任 manifest 中的 `id`。合法 ID 由 ASCII 字母或数字开头，后续可包含 ASCII 字母、数字和连字符，最长 64 字符。`displayName` 必填，`description` 可选；存在 `frames` 时必须包含 9 个 1 到 8 的整数，缺少时浏览器会根据透明像素估算每行长度。

图集单元固定为 192×208 像素，每行 8 列。前 9 行依次为 idle、running-right、running-left、waving、jumping、failed、waiting、running、review。渲染器同时接受 9 行 v1 图集和 11 行 Codex v2 图集；额外两个方向行不会由 DSH 状态转换触发。

添加素材后验证本包：

```sh
pnpm --filter @linxin666/dsh-pet typecheck
pnpm --filter @linxin666/dsh-pet test
pnpm --filter @linxin666/dsh-pet build
```

重启 `dsh web` 后，新宠物会出现在宠物选择器中。提交前建议使用 hatch-pet 校验生成素材，并同时提交 manifest 和 WebP 文件。

## 架构

```text
dsh-pet/
|-- src/
|   |-- index.ts             # host 入口、设置与路由
|   |-- pets.ts              # 素材发现与 manifest 注册表
|   |-- service.ts           # 会话映射、切换、互动和配置
|   |-- state.ts             # 工作阶段到动画轨道
|   |-- affinity.ts          # 共享亲密度账本
|   |-- treats.ts            # 共享零食库存
|   |-- persist.ts           # 原子持久化与旧数据迁移
|   |-- routes.ts            # /api/pet/* 与 /pet/<petId>/*
|   `-- client/
|       |-- index.ts         # 全局挂载、轮询与 API 接线
|       |-- PetDockEntry.tsx
|       |-- PetCompanion.tsx # 图集渲染、互动和拖动
|       `-- spritesheet.ts   # 图集几何与动画节奏
|-- assets/<petId>/          # 每只宠物的 manifest 与 spritesheet
`-- cordis.patch.yml
```

浏览器端在 `document.body` 上持有一个全局 React root，因此宠物在新会话页和已有会话页保持可用。客户端约每 800 ms 轮询 `/api/pet/state`，并通过同源 `/api/pet/*` 路由写入切换、互动、可见性、布局和命名变化。

host 端根据 rc.6 核心会话事件（如 `turn/start`、`step/start`、`tool/call` 和 `turn/end`）推导工作阶段。它保存一个当前宠物 ID 和按宠物 ID 索引的名字映射，亲密度、零食和显示设置保持共享。

## 开发

```sh
pnpm --filter @linxin666/dsh-pet typecheck
pnpm --filter @linxin666/dsh-pet test
pnpm --filter @linxin666/dsh-pet build
```

浏览器 bundle 使用 `window.__ModuleLoader__.load` 契约。DSH 提供 React、Cordis 等平台依赖，Lightning CSS 将 CSS Modules 嵌入客户端 bundle。

## 已知限制

- 选择器和隐藏后的恢复界面依赖 `dsh-web-ui-settings`；单独安装宠物包时应同时安装该设置插件，或直接使用聚合包。
- 同一时刻只显示一只宠物；亲密度、零食、尺寸和位置按设计保持共享。
- 接受包含前 9 行之外方向行的 Codex v2 素材，但当前 DSH 状态转换不会选择这些额外行。

## 许可证

[Apache-2.0](../../LICENSE)

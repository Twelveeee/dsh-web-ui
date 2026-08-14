# dsh-pet — Multi-pet companion for DSH

English | [中文](README.zh.md)

A multi-pet companion plugin for the DSH Web GUI, with activity-aware animation, pet switching, interactions, per-pet names, and shared affinity.

The package uses the official `@deepseek-ai/*` NPM SDK and ships as a Cordis bundle with host and browser halves. It does not modify DSH source code.

## Features

| Feature | Description |
|---|---|
| Pet selection | Select an installed pet from the settings card; one pet is active at a time and the selection is persisted |
| State animation | Core session events map thinking and tools to working tracks, completed turns to celebration, and idle time to standby |
| Petting and feeding | Click the pet or use the hover panel to receive feedback and affinity, subject to cooldowns |
| Shared growth | Affinity, treat stock, display size, and position are shared across pets |
| Per-pet names | Each pet keeps its own custom name and restores it when selected again |
| Dragging | Drag the pet to reposition it; the position is persisted |
| Hide and restore | Hide the pet from its hover panel; no page-level button remains, and the settings card restores it |
| Accessibility | The selector uses native controls and visible focus states, and animation honors reduced-motion preferences |

## Built-in pet

| ID | Default name | Atlas |
|---|---|---|
| `whale` | Whale Girl | 8 columns × 9 rows, v1 |

Whale Girl animation previews:

| idle | waiting | running | jumping |
|---|---|---|---|
| ![idle](assets/whale/previews/idle.gif) | ![waiting](assets/whale/previews/waiting.gif) | ![running](assets/whale/previews/running.gif) | ![jumping](assets/whale/previews/jumping.gif) |

## Install

The recommended installation is the `@linxin666/dsh-web-ui-all` aggregate. To install this plugin package directly:

```sh
dsh plugin --profile web add @linxin666/dsh-pet
```

For repository development:

```sh
git clone https://github.com/zhu1090093659/dsh-web-ui.git
cd dsh-web-ui
pnpm install
pnpm --filter @linxin666/dsh-pet build
dsh plugin --profile web add link:$(pwd)/packages/dsh-pet
```

Restart `dsh web` after installation. In link mode, rebuild and refresh the page after code changes; reinstalling is unnecessary.

## Configuration

The settings card appears under Settings, Plugins, Web UI plugins, Pet when `dsh-web-ui-settings` is installed. The aggregate package includes that settings surface.

| Field | Default | Meaning |
|---|---:|---|
| `visible` | `true` | Whether the selected pet is displayed |
| `size` | `160` | Sprite cell height in pixels |
| `right` | `24` | Distance from the right viewport edge in pixels |
| `bottom` | `20` | Distance from the bottom viewport edge in pixels |
| `name` | `Whale Girl` | Name used for the current pet; custom names are stored per pet |
| `enabled` | `true` | Host-side master switch for activity listeners and routes |

The active pet ID, per-pet names, shared affinity, treats, and display layout are stored in `$DSH_HOME/pet.json`. A legacy single `name` value is migrated to `names.whale` when loaded.

## Add a pet

A new pet does not require registry code changes. Create a URL-safe directory under `packages/dsh-pet/assets/`; the directory name is the stable pet ID. Every pet directory must contain:

```text
assets/my-pet/
|-- pet.json
`-- spritesheet.webp
```

Example manifest:

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

The directory name is authoritative; the registry does not trust the manifest `id`. A valid ID starts with an ASCII letter or digit, may then contain ASCII letters, digits, and hyphens, and is at most 64 characters. `displayName` is required. `description` is optional. When present, `frames` must contain nine integers from 1 through 8; when absent, the browser estimates row lengths from transparent pixels.

Atlas cells are fixed at 192×208 pixels with eight columns per row. The first nine rows are idle, running-right, running-left, waving, jumping, failed, waiting, running, and review. The renderer accepts both 9-row v1 atlases and 11-row Codex v2 atlases; the two additional directional rows are not driven by DSH state transitions.

Validate the package after adding assets:

```sh
pnpm --filter @linxin666/dsh-pet typecheck
pnpm --filter @linxin666/dsh-pet test
pnpm --filter @linxin666/dsh-pet build
```

Restart `dsh web`; the new pet appears in the pet selector. Validate generated artwork with hatch-pet before contributing it, and commit both the manifest and WebP asset.

## Architecture

```text
dsh-pet/
|-- src/
|   |-- index.ts             # host entry, settings, and routes
|   |-- pets.ts              # asset discovery and manifest registry
|   |-- service.ts           # session mapping, switching, interactions, and config
|   |-- state.ts             # working phases to animation tracks
|   |-- affinity.ts          # shared affinity ledger
|   |-- treats.ts            # shared treat stock
|   |-- persist.ts           # atomic persistence and legacy migration
|   |-- routes.ts            # /api/pet/* and /pet/<petId>/*
|   `-- client/
|       |-- index.ts         # global mount, polling, and API wiring
|       |-- PetDockEntry.tsx
|       |-- PetCompanion.tsx # atlas rendering, interactions, and dragging
|       `-- spritesheet.ts   # atlas geometry and animation timing
|-- assets/<petId>/          # manifest and spritesheet for each pet
`-- cordis.patch.yml
```

The browser owns one global React root on `document.body`, so the pet remains available on new-conversation and existing-conversation pages. It polls `/api/pet/state` about every 800 ms and writes switching, interaction, visibility, layout, and naming changes through same-origin `/api/pet/*` routes.

The host derives working phases from rc.6 core session events such as `turn/start`, `step/start`, `tool/call`, and `turn/end`. It keeps one active pet ID and a name map keyed by pet ID, while affinity, treats, and display settings remain shared.

## Development

```sh
pnpm --filter @linxin666/dsh-pet typecheck
pnpm --filter @linxin666/dsh-pet test
pnpm --filter @linxin666/dsh-pet build
```

The browser bundle uses the `window.__ModuleLoader__.load` contract. DSH supplies React, Cordis, and other platform dependencies, while Lightning CSS embeds CSS Modules into the client bundle.

## Known limitations

- The selector and hidden-state recovery UI require `dsh-web-ui-settings`; use the aggregate package or install that settings plugin alongside a standalone pet package.
- Only one pet is displayed at a time; affinity, treats, size, and position are deliberately shared.
- Codex v2 directional rows beyond the first nine animation rows are accepted as assets but are not selected by current DSH state transitions.

## License

[Apache-2.0](../../LICENSE)

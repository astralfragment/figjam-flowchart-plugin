# LegendFlow Manager (GridMarshal)

LegendFlow Manager is a FigJam-only plugin for standardizing disorganized diagrams with deterministic, selection-first operations.

## What it does

- Manage reusable shape style presets.
- Define legend categories and map categories to style rules.
- Manage connector style presets and normalize connectors.
- Organize diagrams with guided layout presets:
  - `Process LR`
  - `Hierarchy TB`
  - `Swimlane by Category`

## Tech stack

- TypeScript
- React (plugin UI)
- Vite (UI bundling)
- Esbuild (plugin main runtime bundle)
- Vitest (unit tests)

## Project structure

- `src/main/code.ts`: FigJam runtime entry, message routing, operations.
- `src/ui/App.tsx`: tabbed panel UI.
- `src/core/styles/*`: shape preset CRUD/apply logic.
- `src/core/legend/*`: category assignment and legend mapping.
- `src/core/connectors/*`: connector preset apply/normalize logic.
- `src/core/organize/*`: deterministic layout strategies.
- `src/core/persistence/*`: state schema, import/export, plugin data storage.
- `src/shared/*`: contracts, state types, defaults.

## State and persistence

- Namespace: `legendflow.manager`
- Key: `state.v1`
- Storage: file-local plugin data (`figma.root.setPluginData`)
- Import/export: JSON bundle with `schemaVersion: 1`

## Setup

1. Install dependencies:

```bash
npm install
```

2. Build UI + main bundles:

```bash
npm run build
```

3. In Figma Desktop:
   1. Open `Plugins` -> `Development` -> `Import plugin from manifest...`
   2. Select `manifest.json` from this project.

4. Open a FigJam file and run `LegendFlow Manager` from Development plugins.

## End-to-end usage

1. Open the plugin in a FigJam board.
2. In `Styles`, create shape presets and save.
3. In `Legend`, create categories and bind each category to a shape preset (optional connector preset).
4. Select shapes on the board and click `Assign to selection` for the relevant category.
5. Click `Apply legend mapping` to enforce mapped styling.
6. In `Connectors`, create or choose a preset and click `Normalize`.
7. In `Organize`, choose layout preset + spacing and click `Run organize`.
8. If needed, use native FigJam Undo (`Ctrl+Z` / `Cmd+Z`).
9. Use `Export` to save presets as JSON.
10. Use `Import` in another file to reuse presets.

## Commands

```bash
npm run build      # Production build
npm run lint       # Lint code
npm test           # Run unit tests
```

## Notes

- Corner radius for FigJam `SHAPE_WITH_TEXT` is currently read-only in the plugin API; radius values are stored but cannot be mutated at runtime.
- Default operation scope is selection-first; you can switch to entire board in the UI.
- No telemetry is implemented in v1.

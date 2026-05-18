# Fragment Flow

Fragment Flow is a FigJam-only plugin for turning diagram fragments into reusable legends, applying those legends to selected shapes, and organizing flowcharts with deterministic, selection-first operations.

## What it does

- Convert selected board legends into reusable entries.
- Save, load, and delete reusable legend sets.
- Create or update shape and system entries from selected FigJam shapes.
- Bulk apply legends to selected diagram shapes with a grouped resolver.
- Organize diagrams with guided layout presets:
  - `Flow ->`
  - `Flow down`
  - `Tree`
  - `Swimlane`

## Tech stack

- TypeScript
- React (plugin UI)
- Vite (UI bundling)
- Esbuild (plugin main runtime bundle)
- Vitest (unit tests)

## Project structure

- `src/main/fragmentFlowPlugin.ts`: FigJam runtime entry, message routing, operations.
- `src/ui/App.tsx`: tabbed panel UI.
- `src/core/styles/*`: shape preset CRUD/apply logic.
- `src/core/legend/*`: category assignment and legend mapping.
- `src/core/connectors/*`: connector preset apply/normalize logic.
- `src/core/organize/*`: deterministic layout strategies.
- `src/core/persistence/*`: state schema, import/export, plugin data storage.
- `src/shared/*`: contracts, state types, defaults.

## State and persistence

- Namespace: legacy-compatible plugin storage
- Key: current state bundle
- Storage: file-local plugin data (`figma.root.setPluginData`)
- Import/export: JSON bundle with `schemaVersion: 2`

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

4. Open a FigJam file and run `Fragment Flow` from Development plugins.

## End-to-end usage

1. Open the plugin in a FigJam board.
2. In `Legend`, create shape roles and systems, or convert an existing selected legend.
3. Save the current legend as a reusable set.
4. Select shapes on the board and use quick create, import style, or bulk apply.
5. Use the resolver when selected shapes cannot be confidently matched.
6. In `Organize`, choose layout preset + spacing and click `Organize Now`.
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
- No telemetry is implemented.

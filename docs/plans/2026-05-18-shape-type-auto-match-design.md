# Shape-Type Auto-Match — Design

**Date:** 2026-05-18
**Status:** Approved, ready for implementation plan

## Problem

The current tagging system requires users to manually assign every shape to a legend entry before "Apply Legend" will style it. With shape entries already keyed by shape type, this is redundant work: the system has enough information to match shapes to entries automatically. As the user put it: "manually tagging is no better than manually setting styles."

## Goal

Remove manual tagging from the shape-role workflow. Apply Legend should auto-match every shape on the board to its corresponding legend entry by shape type, with no per-node assignment step.

Keep system entries (color overlays) as opt-in manual overrides, since they express cross-cutting meaning (e.g. "this is a deprecated step") that shape type cannot encode.

## Model

Two independent layers, applied in order per shape:

1. **Shape entry** — matched by `shape.shapeType`. Sets fill, stroke, strokeWidth, text color/size/weight, opacity, and connector defaults. **One entry per shape type.**
2. **System override** — matched by explicit assignment in `systemOverrides[node.id]`. If present, overrides fill, stroke, and text color from the shape entry. Stays manual ("Tag selection as <system>").

Connectors are styled from the source node's matched entry (shape or system), as today.

## Apply pipeline

For each shape in scope:

1. Look up shape entry by `shape.shapeType`. If found, apply its full style.
2. Look up system override id in `systemOverrides[node.id]`. If present and the system entry exists, override fill/stroke/textColor with that system entry's values.
3. If neither matches, skip the node.

For each connector in scope: use the source node's matched entry (system override wins over shape entry) for connector styling. Connectors whose source has no match are skipped.

## Data model changes

`PluginState` (schema bump `2 → 3`):

- Remove `nodeAssignments.shape`.
- Flatten `nodeAssignments.system` to a top-level `systemOverrides: Record<string, string>`.
- Remove the `NodeAssignments` type (or repurpose).

`SelectionSummary`:

- Drop `shapeAssignedCount`, `shapeBreakdown` (no shape assignments exist).
- Add `shapeMatchedCount` and `shapeUnmatchedCount`, computed live from each selected shape's `shapeType` vs. current shape entries.
- Keep `systemAssignedCount`, `systemBreakdown` for the system-override tab.

Delete types: `BulkApplyPreview`, `BulkApplyGroup`, `BulkApplyDecision`, `BulkApplyAutoMatch`.

## Migration (v2 → v3)

On load, if `schemaVersion < 3`:

- Drop `nodeAssignments.shape`.
- Rename `nodeAssignments.system` to `systemOverrides`.
- If multiple shape entries share a shape type, keep the one with the lowest `order` and drop the rest. Surface a one-time notice in the UI on next launch.
- Bump `schemaVersion` to 3.

## UI changes

`LegendPanel`:

- Remove the "Apply Legend to Selection" button and its bulk-resolver flow.
- Remove "Tag Selection" from the shape entry inspector. Keep it on the system entry inspector.
- "Style Selection" / "Style Entire Board" buttons remain; they now trigger the auto-match apply directly.
- Replace the selection-summary "unmapped" indicator with "X shapes, Y will be styled, Z have no matching entry."
- "Add Shape Entry" defaults to the next unmapped shape type; blocks (inline message) if all shape types are mapped.
- Changing an entry's shape type to one already taken by another entry blocks with the same inline message.

`QuickCreateCard`: stays. After create, the source shape auto-matches the new entry on next apply — no explicit tagging step.

Delete file: `src/ui/panels/legend/BulkApplyResolver.tsx`.

## Messages removed

- `ASSIGN_SHAPE`, `UNASSIGN_SHAPE`
- `PREVIEW_BULK_APPLY`, `COMMIT_BULK_APPLY`, `BULK_APPLY_PREVIEW`

Messages renamed (for clarity, optional):

- `ASSIGN_SYSTEM` → `ASSIGN_SYSTEM_OVERRIDE`
- `UNASSIGN_SYSTEM` → `UNASSIGN_SYSTEM_OVERRIDE`

## Functions removed

In `src/core/legend/selectionStyle.ts`:

- `buildBulkApplyPreview`
- `scoreShapeEntry`, `scoreSystemEntry`, `bestUnique`
- `groupKeyForNode`

## Files touched

| File | Change |
|---|---|
| `src/shared/types.ts` | Drop bulk-apply types; flatten `nodeAssignments`; bump schema; adjust `SelectionSummary`. |
| `src/shared/contracts.ts` | Remove bulk-apply and shape-assign messages. |
| `src/core/legend/selectionStyle.ts` | Delete scoring/grouping/preview helpers. |
| `src/core/persistence/schema.ts` | Add v2 → v3 migration. |
| `src/core/persistence/storage.ts` | Wire migration into load. |
| `src/main/fragmentFlowPlugin.ts` | Rewrite `applyLegend` to shape-type lookup + system override. Delete bulk-apply handlers. Update `getSelectionSummary`. |
| `src/ui/panels/LegendPanel.tsx` | Drop bulk-apply UI, drop shape-tag button, add duplicate-shape-type guard, update selection summary copy. |
| `src/ui/panels/legend/BulkApplyResolver.tsx` | Delete. |
| `src/ui/App.tsx` | Drop bulk-apply state/handlers if present. |

## Out of scope

- Reorganizing fill vs. stroke vs. text-color responsibilities between shape and system entries (i.e. shape sets stroke/text, system sets fill). The current overlap is acceptable; system override wins where they overlap.
- Adding multi-entry-per-shape-type support (explicitly rejected — "one shape = one entry" is the chosen model).

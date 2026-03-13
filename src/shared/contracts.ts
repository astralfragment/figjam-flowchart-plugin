import type {
  ActionResult,
  ApplyScope,
  ConnectorStylePreset,
  LegendCategory,
  OrganizeConfig,
  OrganizeConfigV2,
  PluginStateV1,
  PluginStateV2,
  PresetBundleV1,
  PresetBundleV2,
  SelectionSummary,
  SelectionSummaryV2,
  ShapeLegendEntry,
  ShapeStylePreset,
  SystemLegendEntry,
  ValidationError
} from "./types";

// ─── V2 Protocol ────────────────────────────────────────────────────

export type UIToMainV2 =
  | { type: "INIT_REQUEST" }
  | { type: "GET_SELECTION" }
  | { type: "RESIZE_UI"; width: number; height: number }
  | { type: "SET_THEME_MODE"; themeMode: PluginStateV2["themeMode"] }
  // Legend — Systems
  | { type: "SYSTEM_ENTRY_UPSERT"; entry: SystemLegendEntry }
  | { type: "SYSTEM_ENTRY_DELETE"; entryId: string }
  | { type: "SYSTEM_ENTRY_REORDER"; entryIds: string[] }
  // Legend — Shapes
  | { type: "SHAPE_ENTRY_UPSERT"; entry: ShapeLegendEntry }
  | { type: "SHAPE_ENTRY_DELETE"; entryId: string }
  | { type: "SHAPE_ENTRY_REORDER"; entryIds: string[] }
  // Node assignment
  | { type: "ASSIGN_SYSTEM"; entryId: string; nodeIds: string[] }
  | { type: "ASSIGN_SHAPE"; entryId: string; nodeIds: string[] }
  | { type: "UNASSIGN_SYSTEM"; nodeIds: string[] }
  | { type: "UNASSIGN_SHAPE"; nodeIds: string[] }
  // Apply
  | { type: "APPLY_LEGEND"; scope: ApplyScope }
  | { type: "RUN_ORGANIZE_V2"; config: OrganizeConfigV2; scope: ApplyScope }
  // Import/Export
  | { type: "EXPORT_PRESETS_V2" }
  | { type: "IMPORT_PRESETS_V2"; payload: PresetBundleV2 };

export type MainToUIV2 =
  | { type: "INIT_STATE_V2"; state: PluginStateV2 }
  | { type: "SELECTION_STATE_V2"; selection: SelectionSummaryV2 }
  | { type: "ACTION_RESULT"; result: ActionResult }
  | { type: "VALIDATION_ERROR"; error: ValidationError };

// ─── V1 Protocol (kept for migration) ───────────────────────────────

export type UIToMain =
  | { type: "INIT_REQUEST" }
  | { type: "GET_SELECTION" }
  | { type: "RESIZE_UI"; width: number; height: number }
  | { type: "SET_THEME_MODE"; themeMode: PluginStateV1["themeMode"] }
  | { type: "STYLE_PRESET_UPSERT"; preset: ShapeStylePreset }
  | { type: "STYLE_PRESET_DELETE"; presetId: string }
  | { type: "CREATE_STYLE_FROM_SELECTED" }
  | { type: "APPLY_STYLE_PRESET"; presetId: string; scope: ApplyScope }
  | { type: "CATEGORY_UPSERT"; category: LegendCategory }
  | { type: "CATEGORY_DELETE"; categoryId: string }
  | { type: "CATEGORY_MOVE"; categoryId: string; direction: "up" | "down" }
  | { type: "ASSIGN_CATEGORY"; categoryId: string; nodeIds: string[] }
  | { type: "UNASSIGN_CATEGORY"; nodeIds: string[] }
  | { type: "APPLY_LEGEND_MAPPING"; scope: ApplyScope }
  | { type: "CONNECTOR_PRESET_UPSERT"; preset: ConnectorStylePreset }
  | { type: "CONNECTOR_PRESET_DELETE"; presetId: string }
  | { type: "APPLY_CONNECTOR_PRESET"; presetId: string; scope: ApplyScope }
  | { type: "RUN_ORGANIZE"; config: OrganizeConfig; scope: ApplyScope }
  | { type: "EXPORT_PRESETS" }
  | { type: "IMPORT_PRESETS"; payload: PresetBundleV1 };

export type MainToUI =
  | { type: "INIT_STATE"; state: PluginStateV1 }
  | { type: "SELECTION_STATE"; selection: SelectionSummary }
  | { type: "ACTION_RESULT"; result: ActionResult }
  | { type: "VALIDATION_ERROR"; error: ValidationError };

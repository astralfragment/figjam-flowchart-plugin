import type {
  ActionResult,
  BulkApplyDecision,
  BulkApplyPreview,
  ApplyScope,
  ConnectorStylePreset,
  LegendCandidateKind,
  LegendConversionCandidate,
  LegendConversionDecision,
  LegendCategory,
  LayoutRole,
  OrganizeConfig,
  LegacyOrganizeConfig,
  LegacyPluginState,
  PluginState,
  LegacyPresetBundle,
  PresetBundle,
  SelectionSummary,
  LegacySelectionSummary,
  ShapeLegendEntry,
  ShapeStylePreset,
  SystemLegendEntry,
  ValidationError
} from "./types";

// ─── Active Protocol ────────────────────────────────────────────────

export type UIToMain =
  | { type: "INIT_REQUEST" }
  | { type: "GET_SELECTION" }
  | { type: "RESIZE_UI"; width: number; height: number }
  | { type: "SET_THEME_MODE"; themeMode: PluginState["themeMode"] }
  // Legend — Systems
  | { type: "SYSTEM_ENTRY_UPSERT"; entry: SystemLegendEntry }
  | { type: "SYSTEM_ENTRY_DELETE"; entryId: string }
  | { type: "SYSTEM_ENTRY_REORDER"; entryIds: string[] }
  // Legend — Shapes
  | { type: "SHAPE_ENTRY_UPSERT"; entry: ShapeLegendEntry }
  | { type: "SHAPE_ENTRY_DELETE"; entryId: string }
  | { type: "SHAPE_ENTRY_REORDER"; entryIds: string[] }
  // Legend sets
  | { type: "SAVE_LEGEND_SET"; name: string }
  | { type: "LOAD_LEGEND_SET"; setId: string }
  | { type: "DELETE_LEGEND_SET"; setId: string }
  // Node assignment
  | { type: "ASSIGN_SYSTEM"; entryId: string; nodeIds: string[] }
  | { type: "ASSIGN_SHAPE"; entryId: string; nodeIds: string[] }
  | { type: "UNASSIGN_SYSTEM"; nodeIds: string[] }
  | { type: "UNASSIGN_SHAPE"; nodeIds: string[] }
  // Apply
  | { type: "APPLY_LEGEND"; scope: ApplyScope }
  | { type: "PREVIEW_LEGEND_CONVERSION" }
  | { type: "COMMIT_LEGEND_CONVERSION"; decisions: LegendConversionDecision[] }
  | { type: "QUICK_CREATE_FROM_SELECTION"; kind: Exclude<LegendCandidateKind, "ignore">; name: string; layoutRole: LayoutRole }
  | { type: "IMPORT_SELECTED_STYLE_INTO_ENTRY"; kind: Exclude<LegendCandidateKind, "ignore">; entryId: string }
  | { type: "PREVIEW_BULK_APPLY"; scope: ApplyScope }
  | { type: "COMMIT_BULK_APPLY"; preview: BulkApplyPreview; decisions: BulkApplyDecision[]; scope: ApplyScope }
  | { type: "RUN_ORGANIZE"; config: OrganizeConfig; scope: ApplyScope }
  // Import/Export
  | { type: "EXPORT_PRESETS" }
  | { type: "IMPORT_PRESETS"; payload: PresetBundle };

export type MainToUI =
  | { type: "INIT_STATE"; state: PluginState }
  | { type: "SELECTION_STATE"; selection: SelectionSummary }
  | { type: "LEGEND_CONVERSION_PREVIEW"; candidates: LegendConversionCandidate[] }
  | { type: "BULK_APPLY_PREVIEW"; preview: BulkApplyPreview }
  | { type: "ACTION_RESULT"; result: ActionResult }
  | { type: "VALIDATION_ERROR"; error: ValidationError };

// ─── Legacy Protocol (kept for migration) ───────────────────────────

export type LegacyUIToMain =
  | { type: "INIT_REQUEST" }
  | { type: "GET_SELECTION" }
  | { type: "RESIZE_UI"; width: number; height: number }
  | { type: "SET_THEME_MODE"; themeMode: LegacyPluginState["themeMode"] }
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
  | { type: "RUN_ORGANIZE"; config: LegacyOrganizeConfig; scope: ApplyScope }
  | { type: "EXPORT_PRESETS" }
  | { type: "IMPORT_PRESETS"; payload: LegacyPresetBundle };

export type LegacyMainToUI =
  | { type: "INIT_STATE"; state: LegacyPluginState }
  | { type: "SELECTION_STATE"; selection: LegacySelectionSummary }
  | { type: "ACTION_RESULT"; result: ActionResult }
  | { type: "VALIDATION_ERROR"; error: ValidationError };


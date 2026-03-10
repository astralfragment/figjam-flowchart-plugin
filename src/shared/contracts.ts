import type {
  ActionResult,
  ApplyScope,
  ConnectorStylePreset,
  LegendCategory,
  OrganizeConfig,
  PluginStateV1,
  PresetBundleV1,
  SelectionSummary,
  ShapeStylePreset,
  ValidationError
} from "./types";

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
  | { type: "ASSIGN_CATEGORY"; categoryId: string; nodeIds: string[] }
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

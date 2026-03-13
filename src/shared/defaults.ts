import type {
  ConnectorStylePreset,
  LayoutRole,
  LegendCategory,
  PluginStateV1,
  PluginStateV2,
  ShapeLegendEntry,
  ShapeStylePreset,
  SystemLegendEntry
} from "./types";

export const NAMESPACE_KEY = "legendflow.manager";
export const STATE_KEY = "state.v1";

export const DEFAULT_SHAPE_PRESET: ShapeStylePreset = {
  id: "preset-shape-default",
  name: "Process Node",
  targetNodeTypes: ["SHAPE_WITH_TEXT"],
  shapeType: "ROUNDED_RECTANGLE",
  fill: "#F6F8FC",
  stroke: "#5C6B8A",
  strokeWidth: 2,
  cornerRadius: 12,
  textColor: "#10223A",
  textSize: 16,
  textWeight: 500,
  opacity: 1
};

export const DEFAULT_CONNECTOR_PRESET: ConnectorStylePreset = {
  id: "preset-connector-default",
  name: "Default Flow",
  stroke: "#5C6B8A",
  strokeWidth: 2,
  lineStyle: "solid",
  pathType: "ELBOWED",
  arrowStart: "none",
  arrowEnd: "triangle",
  opacity: 1
};

export const DEFAULT_CATEGORY: LegendCategory = {
  id: "category-process",
  label: "Process",
  order: 1,
  shapePresetId: DEFAULT_SHAPE_PRESET.id,
  connectorPresetId: DEFAULT_CONNECTOR_PRESET.id,
  marker: "P",
  semanticRole: "process"
};

export const defaultState = (): PluginStateV1 => ({
  schemaVersion: 1,
  themeMode: "light",
  shapePresets: [DEFAULT_SHAPE_PRESET],
  connectorPresets: [DEFAULT_CONNECTOR_PRESET],
  categories: [DEFAULT_CATEGORY],
  nodeCategoryAssignments: {}
});

// ─── V2 Defaults ────────────────────────────────────────────────────

export const LAYOUT_ROLE_DESCRIPTIONS: Record<LayoutRole, string> = {
  entry: "Flow start — pinned to first position",
  exit: "Flow end — pinned to last position",
  process: "Sequential step — standard inline flow",
  decision: "Branch point — yes/no branches auto-routed to sides",
  merge: "Convergence — multiple paths join into one",
  fork: "Parallel split — equal-weight outgoing paths",
  loop: "Back-edge aware — return connectors routed outside flow",
  io: "Data flow — offset from main column",
  manual: "Manual step — same as process, visually distinct",
  subprocess: "Collapsed sub-process — weighted heavier in layout",
  annotation: "Note — floated near connected node, outside flow",
  delay: "Wait — extra spacing before this node",
  default: "Standard — treated as process"
};

const CONNECTOR_DEFAULTS = {
  connectorStroke: "#5C6B8A",
  connectorWidth: 2,
  connectorLineStyle: "solid" as const,
  connectorPathType: "ELBOWED" as const,
  connectorArrowStart: "none" as const,
  connectorArrowEnd: "triangle" as const,
  connectorOpacity: 1
};

const SHAPE_STYLE_DEFAULTS = {
  fill: "#F0F4FA",
  stroke: "#6B88AA",
  strokeWidth: 2,
  textColor: "#10223A",
  textSize: 16,
  textWeight: 500,
  opacity: 1,
  ...CONNECTOR_DEFAULTS
};

export const DEFAULT_SHAPE_ENTRIES: ShapeLegendEntry[] = [
  { id: "shape-entry-start-end", name: "START / END", order: 1, shapeType: "ELLIPSE", layoutRole: "entry", ...SHAPE_STYLE_DEFAULTS, textWeight: 600 },
  { id: "shape-entry-process", name: "Process", order: 2, shapeType: "ROUNDED_RECTANGLE", layoutRole: "process", ...SHAPE_STYLE_DEFAULTS },
  { id: "shape-entry-decision", name: "Choice", order: 3, shapeType: "DIAMOND", layoutRole: "decision", ...SHAPE_STYLE_DEFAULTS },
  { id: "shape-entry-io", name: "Input / Output", order: 4, shapeType: "PARALLELOGRAM_RIGHT", layoutRole: "io", ...SHAPE_STYLE_DEFAULTS },
  { id: "shape-entry-manual-process", name: "Manual Process", order: 5, shapeType: "TRAPEZOID", layoutRole: "manual", ...SHAPE_STYLE_DEFAULTS },
  { id: "shape-entry-manual-input", name: "Manual Input", order: 6, shapeType: "MANUAL_INPUT", layoutRole: "manual", ...SHAPE_STYLE_DEFAULTS },
  { id: "shape-entry-merge", name: "Merge", order: 7, shapeType: "ELLIPSE", layoutRole: "merge", ...SHAPE_STYLE_DEFAULTS },
  { id: "shape-entry-fork", name: "Fork", order: 8, shapeType: "SQUARE", layoutRole: "fork", ...SHAPE_STYLE_DEFAULTS }
];

export const DEFAULT_SYSTEM_ENTRIES: SystemLegendEntry[] = [];

export const defaultStateV2 = (): PluginStateV2 => ({
  schemaVersion: 2,
  themeMode: "light",
  systemEntries: [...DEFAULT_SYSTEM_ENTRIES],
  shapeEntries: DEFAULT_SHAPE_ENTRIES.map(e => ({ ...e })),
  nodeAssignments: { system: {}, shape: {} }
});

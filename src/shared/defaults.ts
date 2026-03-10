import type {
  ConnectorStylePreset,
  LegendCategory,
  PluginStateV1,
  ShapeStylePreset
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
  marker: "P"
};

export const defaultState = (): PluginStateV1 => ({
  schemaVersion: 1,
  themeMode: "light",
  shapePresets: [DEFAULT_SHAPE_PRESET],
  connectorPresets: [DEFAULT_CONNECTOR_PRESET],
  categories: [DEFAULT_CATEGORY],
  nodeCategoryAssignments: {}
});

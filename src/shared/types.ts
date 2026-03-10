export type ApplyScope = "selection" | "board";
export type ThemeMode = "light" | "dark";
export type LayoutPreset = "process_lr" | "hierarchy_tb" | "swimlane_category";

export type ConnectorLineStyle = "solid" | "dashed" | "dotted";
export type ArrowCap = "none" | "line" | "triangle";

export type FigJamShapeType =
  | "SQUARE"
  | "ELLIPSE"
  | "ROUNDED_RECTANGLE"
  | "DIAMOND"
  | "TRIANGLE_UP"
  | "TRIANGLE_DOWN"
  | "PARALLELOGRAM_RIGHT"
  | "PARALLELOGRAM_LEFT"
  | "ENG_DATABASE"
  | "ENG_QUEUE"
  | "ENG_FILE"
  | "ENG_FOLDER"
  | "STAR";

export interface ShapeStylePreset {
  id: string;
  name: string;
  targetNodeTypes: string[];
  shapeType?: FigJamShapeType;
  fill: string;
  stroke: string;
  strokeWidth: number;
  cornerRadius: number;
  textColor: string;
  textSize: number;
  textWeight: number;
  opacity: number;
}

export interface ShapeStylePreview {
  sourceNodeId: string;
  sourceNodeName: string;
  name: string;
  targetNodeTypes: string[];
  shapeType?: FigJamShapeType;
  fill: string;
  stroke: string;
  strokeWidth: number;
  cornerRadius: number;
  textColor: string;
  textSize: number;
  textWeight: number;
  opacity: number;
}

export interface ConnectorStylePreset {
  id: string;
  name: string;
  stroke: string;
  strokeWidth: number;
  lineStyle: ConnectorLineStyle;
  arrowStart: ArrowCap;
  arrowEnd: ArrowCap;
  opacity: number;
}

export interface LegendCategory {
  id: string;
  label: string;
  order: number;
  shapePresetId: string;
  connectorPresetId?: string;
  marker?: string;
}

export interface OrganizeConfig {
  preset: LayoutPreset;
  nodeGap: number;
  laneGap: number;
  alignStrict: boolean;
}

export interface PluginStateV1 {
  schemaVersion: 1;
  themeMode: ThemeMode;
  shapePresets: ShapeStylePreset[];
  connectorPresets: ConnectorStylePreset[];
  categories: LegendCategory[];
  nodeCategoryAssignments: Record<string, string>;
}

export interface PresetBundleV1 {
  schemaVersion: 1;
  namespace: string;
  exportedAt: string;
  shapePresets: ShapeStylePreset[];
  connectorPresets: ConnectorStylePreset[];
  categories: LegendCategory[];
}

export interface SelectionSummary {
  total: number;
  shapes: number;
  connectors: number;
  shapeStylePreview?: ShapeStylePreview;
}

export type ActionSeverity = "info" | "warning" | "error";

export interface ActionResult {
  action: string;
  severity: ActionSeverity;
  message: string;
  changed: number;
  skipped: number;
  details?: string[];
  exportJson?: string;
}

export interface ValidationError {
  action: string;
  message: string;
}

export interface OrganizeNodePlacement {
  nodeId: string;
  x: number;
  y: number;
}

export interface OrganizeComputationResult {
  placements: OrganizeNodePlacement[];
  summary: {
    moved: number;
    skipped: number;
  };
}

export type ApplyScope = "selection" | "board";
export type ThemeMode = "light" | "dark";
export type LegacyLayoutPreset = "process_lr" | "decision_tree_tb" | "hierarchy_tb" | "swimlane_category";
export type LegendSemanticRole = "process" | "decision" | "terminator" | "data" | "annotation";
export type ConnectorPathType = "ELBOWED" | "STRAIGHT" | "CURVED";
export type RoutingMode = "auto" | "safe" | "moderate" | "aggressive";
export type OrganizeSpacingMode = "compact" | "balanced" | "spacious";
export type ConnectorHandlingMode = "minimal" | "spread" | "tree";

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
  | "TRAPEZOID"
  | "PREDEFINED_PROCESS"
  | "SHIELD"
  | "DOCUMENT_SINGLE"
  | "DOCUMENT_MULTIPLE"
  | "MANUAL_INPUT"
  | "HEXAGON"
  | "CHEVRON"
  | "PENTAGON"
  | "OCTAGON"
  | "STAR"
  | "PLUS"
  | "ARROW_LEFT"
  | "ARROW_RIGHT"
  | "SUMMING_JUNCTION"
  | "OR"
  | "SPEECH_BUBBLE"
  | "INTERNAL_STORAGE";

// ─── Active Types ───────────────────────────────────────────────────

export type LayoutRole =
  | "entry" | "exit" | "process" | "decision"
  | "merge" | "fork" | "loop" | "io"
  | "manual" | "subprocess" | "annotation"
  | "delay" | "default";

export type LayoutPreset = "flow_lr" | "flow_tb" | "tree" | "swimlane" | "compact";

export type ConnectorStyleOption = "clean" | "smooth" | "direct";

export interface ConnectorStyleFields {
  connectorStroke: string;
  connectorWidth: number;
  connectorLineStyle: ConnectorLineStyle;
  connectorPathType: ConnectorPathType;
  connectorArrowStart: ArrowCap;
  connectorArrowEnd: ArrowCap;
  connectorOpacity: number;
}

export interface SystemLegendEntry extends ConnectorStyleFields {
  id: string;
  name: string;
  order: number;
  fill: string;
  stroke: string;
  strokeWidth: number;
  textColor: string;
  textSize: number;
  textWeight: number;
  opacity: number;
}

export interface ShapeLegendEntry extends ConnectorStyleFields {
  id: string;
  name: string;
  order: number;
  shapeType: FigJamShapeType;
  layoutRole: LayoutRole;
  fill: string;
  stroke: string;
  strokeWidth: number;
  textColor: string;
  textSize: number;
  textWeight: number;
  opacity: number;
}

export interface NodeAssignments {
  system: Record<string, string>;
  shape: Record<string, string>;
}

export interface LegendSet {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  systemEntries: SystemLegendEntry[];
  shapeEntries: ShapeLegendEntry[];
}

export interface OrganizeConfig {
  preset: LayoutPreset;
  spacingValue: number;
  connectorStyle: ConnectorStyleOption;
  nodeGap: number;
  laneGap: number;
  alignStrict: boolean;
  autoFixCrossings: boolean;
}

export interface PluginState {
  schemaVersion: 2;
  themeMode: ThemeMode;
  systemEntries: SystemLegendEntry[];
  shapeEntries: ShapeLegendEntry[];
  legendSets: LegendSet[];
  activeLegendSetId?: string;
  nodeAssignments: NodeAssignments;
}

export interface PresetBundle {
  schemaVersion: 2;
  namespace: string;
  exportedAt: string;
  systemEntries: SystemLegendEntry[];
  shapeEntries: ShapeLegendEntry[];
  legendSets?: LegendSet[];
}

export interface DiagramScanResult {
  shapeCount: number;
  connectorCount: number;
  shapeTypeCounts: Record<string, number>;
  colorGroupCounts: Record<string, number>;
  mappedCount: number;
  unmappedCount: number;
  crossingCount: number;
}

export interface OrganizeDiagnostics {
  componentCount: number;
  decisionsDetected: number;
  mergesDetected: number;
  forksDetected: number;
  crossingsBefore: number;
  crossingsAfter: number;
  crossingReductionPercent: number;
  connectorsProcessed: number;
}

export interface SelectionSummary {
  total: number;
  shapes: number;
  connectors: number;
  systemAssignedCount: number;
  shapeAssignedCount: number;
  unmappedCount: number;
  systemBreakdown: { entryId: string; name: string; count: number }[];
  shapeBreakdown: { entryId: string; name: string; role: LayoutRole; count: number }[];
  quickCreatePreview?: LegendConversionCandidate;
}

export type LegendCandidateKind = "system" | "shape" | "ignore";

export interface LegendConversionCandidate {
  id: string;
  sourceNodeId: string;
  label: string;
  suggestedKind: Exclude<LegendCandidateKind, "ignore">;
  shapeType: FigJamShapeType;
  layoutRole: LayoutRole;
  fill: string;
  stroke: string;
  strokeWidth: number;
  textColor: string;
  textSize: number;
  textWeight: number;
  opacity: number;
}

export interface LegendConversionDecision {
  candidateId: string;
  kind: LegendCandidateKind;
  name: string;
  layoutRole: LayoutRole;
}

export interface BulkApplyAutoMatch {
  nodeId: string;
  shapeEntryId?: string;
  systemEntryId?: string;
}

export interface BulkApplyGroup {
  id: string;
  nodeIds: string[];
  count: number;
  sampleLabel: string;
  shapeType: FigJamShapeType;
  fill: string;
  stroke: string;
  textColor: string;
  defaultShapeEntryId?: string;
  defaultSystemEntryId?: string;
  shapeCandidates: { entryId: string; name: string; role: LayoutRole }[];
  systemCandidates: { entryId: string; name: string }[];
}

export interface BulkApplyPreview {
  autoMatches: BulkApplyAutoMatch[];
  groups: BulkApplyGroup[];
}

export interface BulkApplyDecision {
  groupId: string;
  shapeEntryId?: string;
  systemEntryId?: string;
}

// ─── V1 Types (kept for migration) ─────────────────────────────────

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
  pathType: ConnectorPathType;
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
  semanticRole?: LegendSemanticRole;
}

export interface LegacyOrganizeConfig {
  preset: LegacyLayoutPreset;
  routingMode: RoutingMode;
  spacingMode: OrganizeSpacingMode;
  connectorHandling: ConnectorHandlingMode;
  nodeGap: number;
  laneGap: number;
  alignStrict: boolean;
}

export interface LegacyPluginState {
  schemaVersion: 1;
  themeMode: ThemeMode;
  shapePresets: ShapeStylePreset[];
  connectorPresets: ConnectorStylePreset[];
  categories: LegendCategory[];
  nodeCategoryAssignments: Record<string, string>;
}

export interface LegacyPresetBundle {
  schemaVersion: 1;
  namespace: string;
  exportedAt: string;
  shapePresets: ShapeStylePreset[];
  connectorPresets: ConnectorStylePreset[];
  categories: LegendCategory[];
}

export interface CategoryBreakdownItem {
  categoryId: string;
  label: string;
  semanticRole: LegendSemanticRole;
  assignedCount: number;
}

export interface LegacySelectionSummary {
  total: number;
  shapes: number;
  connectors: number;
  assignedShapeCount: number;
  unassignedShapeCount: number;
  categoryBreakdown: CategoryBreakdownItem[];
  shapeStylePreview?: ShapeStylePreview;
}

export type ActionSeverity = "info" | "warning" | "error";

export interface OrganizeRunDiagnostics {
  componentCount: number;
  detectedDecisions: number;
  crossingsReducedEstimate: number;
  connectorsSkipped: number;
  modeChosen: Exclude<RoutingMode, "auto">;
}

export interface ActionResult {
  action: string;
  severity: ActionSeverity;
  message: string;
  changed: number;
  skipped: number;
  details?: string[];
  organizeDiagnostics?: OrganizeRunDiagnostics;
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


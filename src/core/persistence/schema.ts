import { defaultState, defaultStateV2 } from "@shared/defaults";
import { normalizeHexColor } from "@core/common/paint";
import type {
  ConnectorPathType,
  ConnectorStylePreset,
  FigJamShapeType,
  LayoutRole,
  LegendCategory,
  LegendSemanticRole,
  PluginStateV1,
  PluginStateV2,
  PresetBundleV1,
  NodeAssignments,
  ShapeLegendEntry,
  ShapeStylePreset,
  SystemLegendEntry
} from "@shared/types";

const VALID_SHAPE_TYPES: ReadonlySet<string> = new Set<FigJamShapeType>([
  "SQUARE", "ELLIPSE", "ROUNDED_RECTANGLE", "DIAMOND",
  "TRIANGLE_UP", "TRIANGLE_DOWN", "PARALLELOGRAM_RIGHT", "PARALLELOGRAM_LEFT",
  "ENG_DATABASE", "ENG_QUEUE", "ENG_FILE", "ENG_FOLDER", "TRAPEZOID", "PREDEFINED_PROCESS",
  "SHIELD", "DOCUMENT_SINGLE", "DOCUMENT_MULTIPLE", "MANUAL_INPUT", "HEXAGON", "CHEVRON",
  "PENTAGON", "OCTAGON", "STAR", "PLUS", "ARROW_LEFT", "ARROW_RIGHT", "SUMMING_JUNCTION", "OR",
  "SPEECH_BUBBLE", "INTERNAL_STORAGE"
]);

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

const VALID_PATH_TYPES: ReadonlySet<ConnectorPathType> = new Set<ConnectorPathType>([
  "ELBOWED",
  "STRAIGHT",
  "CURVED"
]);

const VALID_SEMANTIC_ROLES: ReadonlySet<LegendSemanticRole> = new Set<LegendSemanticRole>([
  "process",
  "decision",
  "terminator",
  "data",
  "annotation"
]);

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const asString = (value: unknown, fallback = ""): string =>
  typeof value === "string" ? value : fallback;

const asNumber = (value: unknown, fallback: number): number =>
  typeof value === "number" && Number.isFinite(value) ? value : fallback;

const normalizeColor = (value: unknown, fallback: string): string => {
  const color = asString(value, fallback);
  return normalizeHexColor(color, fallback, { allowAlpha: false });
};

const normalizeShapePreset = (value: unknown): ShapeStylePreset | null => {
  if (!isObject(value)) {
    return null;
  }

  const id = asString(value.id);
  const name = asString(value.name);
  if (!id || !name) {
    return null;
  }

  const targetNodeTypes = Array.isArray(value.targetNodeTypes)
    ? value.targetNodeTypes.filter((item): item is string => typeof item === "string")
    : [];

  const rawShapeType = asString(value.shapeType);
  const shapeType = VALID_SHAPE_TYPES.has(rawShapeType) ? (rawShapeType as FigJamShapeType) : undefined;

  return {
    id,
    name,
    targetNodeTypes: targetNodeTypes.length > 0 ? targetNodeTypes : ["SHAPE_WITH_TEXT"],
    shapeType,
    fill: normalizeColor(value.fill, "#F6F8FC"),
    stroke: normalizeColor(value.stroke, "#5C6B8A"),
    strokeWidth: clamp(asNumber(value.strokeWidth, 2), 0, 24),
    cornerRadius: clamp(asNumber(value.cornerRadius, 12), 0, 48),
    textColor: normalizeColor(value.textColor, "#10223A"),
    textSize: clamp(asNumber(value.textSize, 16), 8, 72),
    textWeight: clamp(asNumber(value.textWeight, 500), 100, 900),
    opacity: clamp(asNumber(value.opacity, 1), 0.1, 1)
  };
};

const normalizeConnectorPreset = (value: unknown): ConnectorStylePreset | null => {
  if (!isObject(value)) {
    return null;
  }

  const id = asString(value.id);
  const name = asString(value.name);
  if (!id || !name) {
    return null;
  }

  const lineStyle =
    value.lineStyle === "solid" || value.lineStyle === "dashed" || value.lineStyle === "dotted"
      ? value.lineStyle
      : "solid";

  const rawPathType = asString(value.pathType);
  const pathType = VALID_PATH_TYPES.has(rawPathType as ConnectorPathType)
    ? (rawPathType as ConnectorPathType)
    : "ELBOWED";

  const arrowStart =
    value.arrowStart === "none" || value.arrowStart === "line" || value.arrowStart === "triangle"
      ? value.arrowStart
      : "none";

  const arrowEnd =
    value.arrowEnd === "none" || value.arrowEnd === "line" || value.arrowEnd === "triangle"
      ? value.arrowEnd
      : "triangle";

  return {
    id,
    name,
    stroke: normalizeColor(value.stroke, "#5C6B8A"),
    strokeWidth: clamp(asNumber(value.strokeWidth, 2), 0, 24),
    lineStyle,
    pathType,
    arrowStart,
    arrowEnd,
    opacity: clamp(asNumber(value.opacity, 1), 0.1, 1)
  };
};

const normalizeCategory = (
  value: unknown,
  shapePresets: ShapeStylePreset[],
  connectorPresets: ConnectorStylePreset[]
): LegendCategory | null => {
  if (!isObject(value)) {
    return null;
  }

  const id = asString(value.id);
  const label = asString(value.label);
  const shapePresetId = asString(value.shapePresetId);

  if (!id || !label || !shapePresetId) {
    return null;
  }

  const hasShapePreset = shapePresets.some((preset) => preset.id === shapePresetId);
  if (!hasShapePreset) {
    return null;
  }

  const connectorPresetId = asString(value.connectorPresetId) || undefined;
  const hasConnectorPreset =
    connectorPresetId === undefined || connectorPresets.some((preset) => preset.id === connectorPresetId);
  const rawSemanticRole = asString(value.semanticRole);
  const semanticRole = VALID_SEMANTIC_ROLES.has(rawSemanticRole as LegendSemanticRole)
    ? (rawSemanticRole as LegendSemanticRole)
    : "process";

  return {
    id,
    label,
    order: clamp(asNumber(value.order, 1), 1, 999),
    shapePresetId,
    connectorPresetId: hasConnectorPreset ? connectorPresetId : undefined,
    marker: asString(value.marker) || undefined,
    semanticRole
  };
};

export const sanitizeState = (raw: unknown): PluginStateV1 => {
  const baseline = defaultState();
  if (!isObject(raw)) {
    return baseline;
  }

  const shapePresets = Array.isArray(raw.shapePresets)
    ? raw.shapePresets.map(normalizeShapePreset).filter((item): item is ShapeStylePreset => item !== null)
    : [];

  const connectorPresets = Array.isArray(raw.connectorPresets)
    ? raw.connectorPresets
        .map(normalizeConnectorPreset)
        .filter((item): item is ConnectorStylePreset => item !== null)
    : [];

  const categories = Array.isArray(raw.categories)
    ? raw.categories
        .map((category) => normalizeCategory(category, shapePresets, connectorPresets))
        .filter((item): item is LegendCategory => item !== null)
        .sort((a, b) => a.order - b.order || a.label.localeCompare(b.label))
    : [];

  const assignments: Record<string, string> = {};
  if (isObject(raw.nodeCategoryAssignments)) {
    for (const [nodeId, categoryId] of Object.entries(raw.nodeCategoryAssignments)) {
      if (typeof categoryId !== "string") {
        continue;
      }

      if (categories.some((category) => category.id === categoryId)) {
        assignments[nodeId] = categoryId;
      }
    }
  }

  return {
    schemaVersion: 1,
    themeMode: raw.themeMode === "dark" ? "dark" : "light",
    shapePresets: shapePresets.length > 0 ? shapePresets : baseline.shapePresets,
    connectorPresets: connectorPresets.length > 0 ? connectorPresets : baseline.connectorPresets,
    categories: categories.length > 0 ? categories : baseline.categories,
    nodeCategoryAssignments: assignments
  };
};

export const toPresetBundle = (state: PluginStateV1, namespace: string): PresetBundleV1 => ({
  schemaVersion: 1,
  namespace,
  exportedAt: new Date().toISOString(),
  shapePresets: state.shapePresets,
  connectorPresets: state.connectorPresets,
  categories: state.categories
});

// ─── V1 → V2 Migration ─────────────────────────────────────────────

const SEMANTIC_ROLE_TO_LAYOUT_ROLE: Record<LegendSemanticRole, LayoutRole> = {
  process: "process",
  decision: "decision",
  terminator: "entry",
  data: "io",
  annotation: "annotation"
};

const VALID_LAYOUT_ROLES: ReadonlySet<string> = new Set<LayoutRole>([
  "entry", "exit", "process", "decision", "merge", "fork",
  "loop", "io", "manual", "subprocess", "annotation", "delay", "default"
]);

export const migrateV1toV2 = (v1: PluginStateV1): PluginStateV2 => {
  const shapeEntries: ShapeLegendEntry[] = [];
  const systemEntries: SystemLegendEntry[] = [];
  const categoryIdToEntryId = new Map<string, string>();

  for (const category of v1.categories) {
    const shapePreset = v1.shapePresets.find(p => p.id === category.shapePresetId);
    const connectorPreset = category.connectorPresetId
      ? v1.connectorPresets.find(p => p.id === category.connectorPresetId)
      : undefined;

    const layoutRole = SEMANTIC_ROLE_TO_LAYOUT_ROLE[category.semanticRole ?? "process"];
    const entryId = `migrated-shape-${category.id}`;
    categoryIdToEntryId.set(category.id, entryId);

    shapeEntries.push({
      id: entryId,
      name: category.label,
      order: category.order,
      shapeType: shapePreset?.shapeType ?? "ROUNDED_RECTANGLE",
      layoutRole,
      fill: shapePreset?.fill ?? "#F0F4FA",
      stroke: shapePreset?.stroke ?? "#6B88AA",
      strokeWidth: shapePreset?.strokeWidth ?? 2,
      textColor: shapePreset?.textColor ?? "#10223A",
      textSize: shapePreset?.textSize ?? 16,
      textWeight: shapePreset?.textWeight ?? 500,
      opacity: shapePreset?.opacity ?? 1,
      connectorStroke: connectorPreset?.stroke ?? "#5C6B8A",
      connectorWidth: connectorPreset?.strokeWidth ?? 2,
      connectorLineStyle: connectorPreset?.lineStyle ?? "solid",
      connectorPathType: connectorPreset?.pathType ?? "ELBOWED",
      connectorArrowStart: connectorPreset?.arrowStart ?? "none",
      connectorArrowEnd: connectorPreset?.arrowEnd ?? "triangle",
      connectorOpacity: connectorPreset?.opacity ?? 1
    });
  }

  const shapeAssignments: Record<string, string> = {};
  for (const [nodeId, categoryId] of Object.entries(v1.nodeCategoryAssignments)) {
    const entryId = categoryIdToEntryId.get(categoryId);
    if (entryId) {
      shapeAssignments[nodeId] = entryId;
    }
  }

  return {
    schemaVersion: 2,
    themeMode: v1.themeMode,
    systemEntries,
    shapeEntries: shapeEntries.length > 0 ? shapeEntries : defaultStateV2().shapeEntries,
    nodeAssignments: { system: {}, shape: shapeAssignments }
  };
};

const normalizeSystemEntry = (value: unknown): SystemLegendEntry | null => {
  if (!isObject(value)) return null;
  const id = asString(value.id);
  const name = asString(value.name);
  if (!id || !name) return null;
  return {
    id, name,
    order: clamp(asNumber(value.order, 1), 1, 999),
    fill: normalizeColor(value.fill, "#6BA4D9"),
    stroke: normalizeColor(value.stroke, "#4A8BC2"),
    strokeWidth: clamp(asNumber(value.strokeWidth, 2), 0, 24),
    textColor: normalizeColor(value.textColor, "#FFFFFF"),
    textSize: clamp(asNumber(value.textSize, 16), 8, 72),
    textWeight: clamp(asNumber(value.textWeight, 600), 100, 900),
    opacity: clamp(asNumber(value.opacity, 1), 0.1, 1),
    connectorStroke: normalizeColor(value.connectorStroke, "#5C6B8A"),
    connectorWidth: clamp(asNumber(value.connectorWidth, 2), 0, 24),
    connectorLineStyle: value.connectorLineStyle === "dashed" || value.connectorLineStyle === "dotted" ? value.connectorLineStyle : "solid",
    connectorPathType: VALID_PATH_TYPES.has(asString(value.connectorPathType) as ConnectorPathType) ? asString(value.connectorPathType) as ConnectorPathType : "ELBOWED",
    connectorArrowStart: value.connectorArrowStart === "line" || value.connectorArrowStart === "triangle" ? value.connectorArrowStart : "none",
    connectorArrowEnd: value.connectorArrowEnd === "none" || value.connectorArrowEnd === "line" ? value.connectorArrowEnd as "none" | "line" : "triangle",
    connectorOpacity: clamp(asNumber(value.connectorOpacity, 1), 0.1, 1)
  };
};

const normalizeShapeEntry = (value: unknown): ShapeLegendEntry | null => {
  if (!isObject(value)) return null;
  const id = asString(value.id);
  const name = asString(value.name);
  if (!id || !name) return null;

  const rawShapeType = asString(value.shapeType);
  const shapeType = VALID_SHAPE_TYPES.has(rawShapeType) ? rawShapeType as FigJamShapeType : "ROUNDED_RECTANGLE";
  const rawRole = asString(value.layoutRole);
  const layoutRole = VALID_LAYOUT_ROLES.has(rawRole) ? rawRole as LayoutRole : "default";

  return {
    id, name, shapeType, layoutRole,
    order: clamp(asNumber(value.order, 1), 1, 999),
    fill: normalizeColor(value.fill, "#F0F4FA"),
    stroke: normalizeColor(value.stroke, "#6B88AA"),
    strokeWidth: clamp(asNumber(value.strokeWidth, 2), 0, 24),
    textColor: normalizeColor(value.textColor, "#10223A"),
    textSize: clamp(asNumber(value.textSize, 16), 8, 72),
    textWeight: clamp(asNumber(value.textWeight, 500), 100, 900),
    opacity: clamp(asNumber(value.opacity, 1), 0.1, 1),
    connectorStroke: normalizeColor(value.connectorStroke, "#5C6B8A"),
    connectorWidth: clamp(asNumber(value.connectorWidth, 2), 0, 24),
    connectorLineStyle: value.connectorLineStyle === "dashed" || value.connectorLineStyle === "dotted" ? value.connectorLineStyle : "solid",
    connectorPathType: VALID_PATH_TYPES.has(asString(value.connectorPathType) as ConnectorPathType) ? asString(value.connectorPathType) as ConnectorPathType : "ELBOWED",
    connectorArrowStart: value.connectorArrowStart === "line" || value.connectorArrowStart === "triangle" ? value.connectorArrowStart : "none",
    connectorArrowEnd: value.connectorArrowEnd === "none" || value.connectorArrowEnd === "line" ? value.connectorArrowEnd as "none" | "line" : "triangle",
    connectorOpacity: clamp(asNumber(value.connectorOpacity, 1), 0.1, 1)
  };
};

export const sanitizeStateV2 = (raw: unknown): PluginStateV2 => {
  const baseline = defaultStateV2();
  if (!isObject(raw)) return baseline;

  const systemEntries = Array.isArray(raw.systemEntries)
    ? raw.systemEntries.map(normalizeSystemEntry).filter((e): e is SystemLegendEntry => e !== null)
    : [];

  const shapeEntries = Array.isArray(raw.shapeEntries)
    ? raw.shapeEntries.map(normalizeShapeEntry).filter((e): e is ShapeLegendEntry => e !== null)
    : [];

  const nodeAssignments: NodeAssignments = isObject(raw.nodeAssignments)
    ? {
        system: isObject((raw.nodeAssignments as Record<string, unknown>).system)
          ? Object.fromEntries(
              Object.entries((raw.nodeAssignments as Record<string, unknown>).system as Record<string, unknown>)
                .filter((entry): entry is [string, string] => typeof entry[1] === "string")
            )
          : {},
        shape: isObject((raw.nodeAssignments as Record<string, unknown>).shape)
          ? Object.fromEntries(
              Object.entries((raw.nodeAssignments as Record<string, unknown>).shape as Record<string, unknown>)
                .filter((entry): entry is [string, string] => typeof entry[1] === "string")
            )
          : {}
      }
    : { system: {}, shape: {} };

  return {
    schemaVersion: 2,
    themeMode: raw.themeMode === "dark" ? "dark" : "light",
    systemEntries,
    shapeEntries: shapeEntries.length > 0 ? shapeEntries : baseline.shapeEntries,
    nodeAssignments
  };
};

export const sanitizeBundle = (raw: unknown): PresetBundleV1 | null => {
  if (!isObject(raw) || raw.schemaVersion !== 1) {
    return null;
  }

  const sanitized = sanitizeState({
    schemaVersion: 1,
    themeMode: "light",
    shapePresets: raw.shapePresets,
    connectorPresets: raw.connectorPresets,
    categories: raw.categories,
    nodeCategoryAssignments: {}
  });

  return {
    schemaVersion: 1,
    namespace: asString(raw.namespace, "legendflow.manager"),
    exportedAt: asString(raw.exportedAt, new Date().toISOString()),
    shapePresets: sanitized.shapePresets,
    connectorPresets: sanitized.connectorPresets,
    categories: sanitized.categories
  };
};

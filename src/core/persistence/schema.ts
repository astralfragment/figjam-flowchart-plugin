import { defaultState } from "@shared/defaults";
import { normalizeHexColor } from "@core/common/paint";
import type {
  ConnectorStylePreset,
  FigJamShapeType,
  LegendCategory,
  PluginStateV1,
  PresetBundleV1,
  ShapeStylePreset
} from "@shared/types";

const VALID_SHAPE_TYPES: ReadonlySet<string> = new Set<FigJamShapeType>([
  "SQUARE", "ELLIPSE", "ROUNDED_RECTANGLE", "DIAMOND",
  "TRIANGLE_UP", "TRIANGLE_DOWN", "PARALLELOGRAM_RIGHT", "PARALLELOGRAM_LEFT",
  "ENG_DATABASE", "ENG_QUEUE", "ENG_FILE", "ENG_FOLDER", "STAR"
]);

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

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

  return {
    id,
    label,
    order: clamp(asNumber(value.order, 1), 1, 999),
    shapePresetId,
    connectorPresetId: hasConnectorPreset ? connectorPresetId : undefined,
    marker: asString(value.marker) || undefined
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

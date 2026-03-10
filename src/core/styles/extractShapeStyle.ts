import { firstSolidPaintToHex } from "@core/common/paint";
import type { FigJamShapeType, ShapeStylePreview, ShapeStylePreset } from "@shared/types";

const VALID_SHAPE_TYPES: ReadonlySet<string> = new Set<FigJamShapeType>([
  "SQUARE", "ELLIPSE", "ROUNDED_RECTANGLE", "DIAMOND",
  "TRIANGLE_UP", "TRIANGLE_DOWN", "PARALLELOGRAM_RIGHT", "PARALLELOGRAM_LEFT",
  "ENG_DATABASE", "ENG_QUEUE", "ENG_FILE", "ENG_FOLDER", "STAR"
]);

const readShapeType = (node: ShapeWithTextNode): FigJamShapeType | undefined => {
  const raw = (node as unknown as { shapeType?: string }).shapeType;
  if (typeof raw === "string" && VALID_SHAPE_TYPES.has(raw)) {
    return raw as FigJamShapeType;
  }
  return undefined;
};

const makePresetId = (): string =>
  `shape-${Math.random().toString(36).slice(2, 8)}-${Date.now().toString(36)}`;

const getFirstSelectedShape = (): ShapeWithTextNode | null => {
  for (const node of figma.currentPage.selection) {
    if (node.type === "SHAPE_WITH_TEXT") {
      return node;
    }
  }

  return null;
};

const readTextSize = (textNode: TextSublayerNode, length: number): number => {
  if (length <= 0) {
    return 16;
  }

  const size = textNode.getRangeFontSize(0, length);
  return typeof size === "number" ? size : 16;
};

const readTextWeight = (textNode: TextSublayerNode, length: number): number => {
  if (length <= 0) {
    return 500;
  }

  const weight = textNode.getRangeFontWeight(0, length);
  return typeof weight === "number" ? weight : 500;
};

const hasVisibleSolidPaint = (paints: unknown): boolean => {
  if (!Array.isArray(paints)) {
    return false;
  }

  return paints.some((paint) => {
    if (!paint || typeof paint !== "object") {
      return false;
    }

    const candidate = paint as Partial<SolidPaint & { visible?: boolean }>;
    return candidate.type === "SOLID" && candidate.visible !== false;
  });
};

export const extractSelectedShapeStylePreview = (): ShapeStylePreview | null => {
  const shape = getFirstSelectedShape();
  if (!shape) {
    return null;
  }

  const textNode = shape.text;
  const textLength = textNode.characters.length;
  const hasStroke = hasVisibleSolidPaint(shape.strokes);

  return {
    sourceNodeId: shape.id,
    sourceNodeName: shape.name,
    name: shape.name ? `${shape.name} Style` : "Selected Shape Style",
    targetNodeTypes: ["SHAPE_WITH_TEXT"],
    shapeType: readShapeType(shape),
    fill: firstSolidPaintToHex(shape.fills, "#F6F8FC"),
    stroke: firstSolidPaintToHex(shape.strokes, "#5C6B8A"),
    strokeWidth: hasStroke && typeof shape.strokeWeight === "number" ? shape.strokeWeight : 0,
    cornerRadius: shape.cornerRadius ?? 0,
    textColor: firstSolidPaintToHex(textNode.fills, "#10223A"),
    textSize: readTextSize(textNode, textLength),
    textWeight: readTextWeight(textNode, textLength),
    opacity: shape.opacity
  };
};

export const createPresetFromSelectedShape = (): ShapeStylePreset | null => {
  const preview = extractSelectedShapeStylePreview();
  if (!preview) {
    return null;
  }

  return {
    id: makePresetId(),
    name: preview.name,
    targetNodeTypes: preview.targetNodeTypes,
    shapeType: preview.shapeType,
    fill: preview.fill,
    stroke: preview.stroke,
    strokeWidth: preview.strokeWidth,
    cornerRadius: preview.cornerRadius,
    textColor: preview.textColor,
    textSize: preview.textSize,
    textWeight: preview.textWeight,
    opacity: preview.opacity
  };
};

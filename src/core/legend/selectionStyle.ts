import { firstSolidPaintToHex } from "@core/common/paint";
import type {
  BulkApplyAutoMatch,
  BulkApplyGroup,
  BulkApplyPreview,
  FigJamShapeType,
  LayoutRole,
  LegendConversionCandidate,
  LegendConversionDecision,
  ShapeLegendEntry,
  SystemLegendEntry
} from "@shared/types";

export const normalizeLabel = (value: string): string =>
  value.trim().toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

const numericValue = (value: unknown, fallback: number): number =>
  typeof value === "number" && Number.isFinite(value) ? value : fallback;

export const nodeLabel = (node: ShapeWithTextNode): string => {
  try {
    return node.text.characters.trim();
  } catch {
    return node.name.trim();
  }
};

export const nodeFill = (node: ShapeWithTextNode, fallback = "#F0F4FA"): string =>
  firstSolidPaintToHex(node.fills, fallback);

export const nodeStroke = (node: ShapeWithTextNode, fallback = "#6B88AA"): string =>
  firstSolidPaintToHex(node.strokes, fallback);

export const nodeTextColor = (node: ShapeWithTextNode, fallback = "#10223A"): string => {
  try {
    return firstSolidPaintToHex(node.text.fills, fallback);
  } catch {
    return fallback;
  }
};

export const nodeTextSize = (node: ShapeWithTextNode, fallback = 16): number => {
  try {
    return numericValue(node.text.fontSize, fallback);
  } catch {
    return fallback;
  }
};

export const collectShapeNodes = (nodes: readonly SceneNode[]): ShapeWithTextNode[] => {
  const shapes: ShapeWithTextNode[] = [];
  const visit = (node: SceneNode): void => {
    if (node.type === "SHAPE_WITH_TEXT") {
      shapes.push(node);
    }
    if ("children" in node) {
      for (const child of node.children) {
        visit(child);
      }
    }
  };

  for (const node of nodes) {
    visit(node);
  }

  return shapes;
};

export const inferLayoutRole = (label: string, shapeType: FigJamShapeType): LayoutRole => {
  const normalized = normalizeLabel(label);
  if (normalized.includes("start") || normalized.includes("end")) return "entry";
  if (normalized.includes("choice") || normalized.includes("decision")) return "decision";
  if (normalized.includes("input") || normalized.includes("output")) return "io";
  if (normalized.includes("manual")) return "manual";
  if (normalized.includes("process")) return "process";
  if (shapeType === "DIAMOND") return "decision";
  if (shapeType === "PARALLELOGRAM_RIGHT" || shapeType === "PARALLELOGRAM_LEFT") return "io";
  if (shapeType === "TRAPEZOID" || shapeType === "MANUAL_INPUT") return "manual";
  if (shapeType === "ELLIPSE") return "entry";
  return "process";
};

const isLikelySystemSwatch = (node: ShapeWithTextNode, fill: string, stroke: string): boolean => {
  if (node.shapeType !== "ROUNDED_RECTANGLE" && node.shapeType !== "SQUARE") {
    return false;
  }
  return fill !== stroke && fill !== "#F0F4FA" && fill !== "#FFFFFF" && fill !== "#F6F8FC";
};

export const candidateFromShapeNode = (node: ShapeWithTextNode, index = 0): LegendConversionCandidate => {
  const label = nodeLabel(node) || node.name || `Legend Item ${index + 1}`;
  const fill = nodeFill(node);
  const stroke = nodeStroke(node);
  const shapeType = node.shapeType as FigJamShapeType;
  return {
    id: `candidate-${node.id.replace(/[^a-zA-Z0-9_-]/g, "-")}`,
    sourceNodeId: node.id,
    label,
    suggestedKind: isLikelySystemSwatch(node, fill, stroke) ? "system" : "shape",
    shapeType,
    layoutRole: inferLayoutRole(label, shapeType),
    fill,
    stroke,
    strokeWidth: numericValue(node.strokeWeight, 2),
    textColor: nodeTextColor(node),
    textSize: nodeTextSize(node),
    textWeight: 500,
    opacity: numericValue(node.opacity, 1)
  };
};

export const connectorDefaults = {
  connectorStroke: "#5C6B8A",
  connectorWidth: 2,
  connectorLineStyle: "solid" as const,
  connectorPathType: "ELBOWED" as const,
  connectorArrowStart: "none" as const,
  connectorArrowEnd: "triangle" as const,
  connectorOpacity: 1
};

export const systemEntryFromCandidate = (
  candidate: LegendConversionCandidate,
  decision: LegendConversionDecision,
  id: string,
  order: number
): SystemLegendEntry => ({
  id,
  name: decision.name.trim() || candidate.label,
  order,
  fill: candidate.fill,
  stroke: candidate.stroke,
  strokeWidth: candidate.strokeWidth,
  textColor: candidate.textColor,
  textSize: candidate.textSize,
  textWeight: candidate.textWeight,
  opacity: candidate.opacity,
  ...connectorDefaults,
  connectorStroke: candidate.stroke
});

export const shapeEntryFromCandidate = (
  candidate: LegendConversionCandidate,
  decision: LegendConversionDecision,
  id: string,
  order: number
): ShapeLegendEntry => ({
  id,
  name: decision.name.trim() || candidate.label,
  order,
  shapeType: candidate.shapeType,
  layoutRole: decision.layoutRole,
  fill: candidate.fill,
  stroke: candidate.stroke,
  strokeWidth: candidate.strokeWidth,
  textColor: candidate.textColor,
  textSize: candidate.textSize,
  textWeight: candidate.textWeight,
  opacity: candidate.opacity,
  ...connectorDefaults,
  connectorStroke: candidate.stroke
});

export const updateShapeEntryStyle = (
  entry: ShapeLegendEntry,
  candidate: LegendConversionCandidate
): ShapeLegendEntry => ({
  ...entry,
  shapeType: candidate.shapeType,
  fill: candidate.fill,
  stroke: candidate.stroke,
  strokeWidth: candidate.strokeWidth,
  textColor: candidate.textColor,
  textSize: candidate.textSize,
  textWeight: candidate.textWeight,
  opacity: candidate.opacity,
  connectorStroke: candidate.stroke
});

export const updateSystemEntryStyle = (
  entry: SystemLegendEntry,
  candidate: LegendConversionCandidate
): SystemLegendEntry => ({
  ...entry,
  fill: candidate.fill,
  stroke: candidate.stroke,
  strokeWidth: candidate.strokeWidth,
  textColor: candidate.textColor,
  textSize: candidate.textSize,
  textWeight: candidate.textWeight,
  opacity: candidate.opacity,
  connectorStroke: candidate.stroke
});

const scoreShapeEntry = (node: ShapeWithTextNode, entry: ShapeLegendEntry): number => {
  let score = 0;
  if (node.shapeType === entry.shapeType) score += 4;
  if (nodeFill(node) === entry.fill) score += 2;
  if (nodeStroke(node) === entry.stroke) score += 1;
  const label = normalizeLabel(nodeLabel(node));
  if (label && normalizeLabel(entry.name).includes(label)) score += 1;
  return score;
};

const scoreSystemEntry = (node: ShapeWithTextNode, entry: SystemLegendEntry): number => {
  let score = 0;
  if (nodeFill(node) === entry.fill) score += 4;
  if (nodeStroke(node) === entry.stroke) score += 2;
  return score;
};

const bestUnique = <T>(items: T[], score: (item: T) => number, minScore: number): T | undefined => {
  const scored = items
    .map((item) => ({ item, score: score(item) }))
    .filter((item) => item.score >= minScore)
    .sort((a, b) => b.score - a.score);
  if (scored.length === 0) return undefined;
  if (scored.length > 1 && scored[0].score === scored[1].score) return undefined;
  return scored[0].item;
};

const groupKeyForNode = (node: ShapeWithTextNode): string =>
  [node.shapeType, nodeFill(node), nodeStroke(node), nodeTextColor(node)].join("|");

export const buildBulkApplyPreview = (
  shapes: ShapeWithTextNode[],
  shapeEntries: ShapeLegendEntry[],
  systemEntries: SystemLegendEntry[]
): BulkApplyPreview => {
  const autoMatches: BulkApplyAutoMatch[] = [];
  const groupMap = new Map<string, BulkApplyGroup>();

  for (const node of shapes) {
    const shapeEntry = bestUnique(shapeEntries, (entry) => scoreShapeEntry(node, entry), 4);
    const systemEntry = bestUnique(systemEntries, (entry) => scoreSystemEntry(node, entry), 4);
    const needsShapeResolver = !shapeEntry && shapeEntries.length > 0;
    const needsSystemResolver = !systemEntry && systemEntries.length > 0;

    if (!needsShapeResolver && !needsSystemResolver && (shapeEntry || systemEntry)) {
      autoMatches.push({
        nodeId: node.id,
        shapeEntryId: shapeEntry?.id,
        systemEntryId: systemEntry?.id
      });
      continue;
    }

    const key = groupKeyForNode(node);
    const existing = groupMap.get(key);
    if (existing) {
      existing.nodeIds.push(node.id);
      existing.count += 1;
      continue;
    }

    groupMap.set(key, {
      id: `group-${groupMap.size + 1}`,
      nodeIds: [node.id],
      count: 1,
      sampleLabel: nodeLabel(node) || node.name,
      shapeType: node.shapeType as FigJamShapeType,
      fill: nodeFill(node),
      stroke: nodeStroke(node),
      textColor: nodeTextColor(node),
      defaultShapeEntryId: shapeEntry?.id,
      defaultSystemEntryId: systemEntry?.id,
      shapeCandidates: shapeEntries
        .filter((entry) => node.shapeType === entry.shapeType || scoreShapeEntry(node, entry) >= 2)
        .slice(0, 8)
        .map((entry) => ({ entryId: entry.id, name: entry.name, role: entry.layoutRole })),
      systemCandidates: systemEntries
        .filter((entry) => scoreSystemEntry(node, entry) >= 2)
        .slice(0, 8)
        .map((entry) => ({ entryId: entry.id, name: entry.name }))
    });
  }

  return { autoMatches, groups: [...groupMap.values()] };
};

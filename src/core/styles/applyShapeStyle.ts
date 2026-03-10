import { hexToSolidPaint } from "@core/common/paint";
import { getNodesInScope, isShapeNode } from "@core/common/selection";
import type { ActionResult, ApplyScope, ShapeStylePreset } from "@shared/types";

const mapWeightToStyle = (weight: number): string => {
  if (weight >= 700) {
    return "Bold";
  }

  if (weight >= 600) {
    return "SemiBold";
  }

  if (weight >= 500) {
    return "Medium";
  }

  return "Regular";
};

const loadTextFonts = async (textNode: TextSublayerNode, length: number): Promise<void> => {
  if (length <= 0) {
    return;
  }

  const fontNames = textNode.getRangeAllFontNames(0, length);
  const unique = new Map<string, FontName>();

  for (const font of fontNames) {
    unique.set(`${font.family}:${font.style}`, font);
  }

  for (const font of unique.values()) {
    await figma.loadFontAsync(font);
  }
};

export const applyShapePresetToNode = async (
  node: ShapeWithTextNode,
  preset: ShapeStylePreset
): Promise<number> => {
  if (preset.shapeType) {
    (node as unknown as { shapeType: string }).shapeType = preset.shapeType;
  }

  node.fills = [hexToSolidPaint(preset.fill)];

  if (preset.strokeWidth <= 0) {
    node.strokes = [];
    node.strokeWeight = 0;
  } else {
    node.strokes = [hexToSolidPaint(preset.stroke)];
    node.strokeWeight = preset.strokeWidth;
  }

  node.opacity = preset.opacity;

  // FigJam ShapeWithText cornerRadius is read-only in the Plugin API.
  const textNode = node.text;
  const length = textNode.characters.length;

  if (length > 0) {
    await loadTextFonts(textNode, length);
    textNode.setRangeFills(0, length, [hexToSolidPaint(preset.textColor)]);
    textNode.setRangeFontSize(0, length, preset.textSize);

    const firstFont = textNode.getRangeFontName(0, Math.min(1, length));
    if (firstFont !== figma.mixed) {
      const weightedFont: FontName = {
        family: firstFont.family,
        style: mapWeightToStyle(preset.textWeight)
      };

      try {
        await figma.loadFontAsync(weightedFont);
        textNode.setRangeFontName(0, length, weightedFont);
      } catch (_error) {
        // Keep existing style when target weight is unavailable in the active family.
      }
    }
  }

  return 1;
};

export const applyShapePreset = async (
  preset: ShapeStylePreset,
  scope: ApplyScope
): Promise<ActionResult> => {
  const nodes = getNodesInScope(scope);
  let changed = 0;
  let skipped = 0;

  for (const node of nodes) {
    if (!isShapeNode(node) || !preset.targetNodeTypes.includes(node.type)) {
      skipped += 1;
      continue;
    }

    try {
      changed += await applyShapePresetToNode(node, preset);
    } catch (_error) {
      skipped += 1;
    }
  }

  return {
    action: "APPLY_STYLE_PRESET",
    severity: changed > 0 ? "info" : "warning",
    message:
      changed > 0
        ? `Applied style preset \"${preset.name}\" to ${changed} shape(s).`
        : "No compatible shapes found for the selected style preset.",
    changed,
    skipped,
    details: ["Corner radius is currently read-only in the FigJam plugin API and was not changed."]
  };
};


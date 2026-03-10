import type { ApplyScope } from "@shared/types";

export const getNodesInScope = (scope: ApplyScope): SceneNode[] => {
  if (scope === "selection") {
    return [...figma.currentPage.selection];
  }

  const all = figma.currentPage.findAll((node) => node.type !== "SECTION");
  return all.filter((node): node is SceneNode => "id" in node);
};

export const getShapeNodes = (nodes: readonly SceneNode[]): SceneNode[] => {
  return nodes.filter((node) => node.type === "SHAPE_WITH_TEXT");
};

export const getConnectorNodes = (nodes: readonly SceneNode[]): ConnectorNode[] => {
  return nodes.filter((node): node is ConnectorNode => node.type === "CONNECTOR");
};

export const isShapeNode = (node: SceneNode): node is ShapeWithTextNode => node.type === "SHAPE_WITH_TEXT";

export const uniqueById = <T extends { id: string }>(items: readonly T[]): T[] => {
  const seen = new Set<string>();
  const next: T[] = [];

  for (const item of items) {
    if (seen.has(item.id)) {
      continue;
    }

    seen.add(item.id);
    next.push(item);
  }

  return next;
};

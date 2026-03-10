import type {
  LegendCategory,
  OrganizeComputationResult,
  OrganizeConfig,
  PluginStateV1
} from "@shared/types";

interface OrganizeInputNode {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

const stableNodeSort = (nodes: OrganizeInputNode[]): OrganizeInputNode[] =>
  [...nodes].sort((a, b) => a.y - b.y || a.x - b.x || a.id.localeCompare(b.id));

const laneSortedCategories = (categories: LegendCategory[]): LegendCategory[] =>
  [...categories].sort((a, b) => a.order - b.order || a.label.localeCompare(b.label));

const getBoardOrigin = (nodes: OrganizeInputNode[]): { x: number; y: number } => ({
  x: Math.min(...nodes.map((node) => node.x)),
  y: Math.min(...nodes.map((node) => node.y))
});

const getLayoutDimensions = (nodes: OrganizeInputNode[]): { maxWidth: number; maxHeight: number } => ({
  maxWidth: Math.max(...nodes.map((node) => node.width), 220),
  maxHeight: Math.max(...nodes.map((node) => node.height), 120)
});

const chunk = <T,>(items: T[], size: number): T[][] => {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
};

const layoutProcessLR = (
  nodes: OrganizeInputNode[],
  config: OrganizeConfig
): OrganizeComputationResult => {
  const sorted = stableNodeSort(nodes);
  const origin = getBoardOrigin(sorted);
  const { maxWidth, maxHeight } = getLayoutDimensions(sorted);
  const rowSize = Math.max(4, Math.ceil(Math.sqrt(sorted.length)));

  const placements = chunk(sorted, rowSize).flatMap((row, rowIndex) =>
    row.map((node, colIndex) => ({
      nodeId: node.id,
      x: origin.x + colIndex * (maxWidth + config.nodeGap),
      y: origin.y + rowIndex * (maxHeight + config.nodeGap)
    }))
  );

  return {
    placements,
    summary: {
      moved: placements.length,
      skipped: 0
    }
  };
};

const layoutHierarchyTB = (
  nodes: OrganizeInputNode[],
  config: OrganizeConfig
): OrganizeComputationResult => {
  const sorted = stableNodeSort(nodes);
  const origin = getBoardOrigin(sorted);
  const { maxWidth, maxHeight } = getLayoutDimensions(sorted);
  const layerSize = Math.max(2, Math.floor(Math.sqrt(sorted.length)));

  const placements = chunk(sorted, layerSize).flatMap((layer, layerIndex) => {
    const layerOffset = Math.max(0, (layerSize - layer.length) * (maxWidth + config.nodeGap) * 0.5);
    return layer.map((node, colIndex) => ({
      nodeId: node.id,
      x: origin.x + layerOffset + colIndex * (maxWidth + config.nodeGap),
      y: origin.y + layerIndex * (maxHeight + config.nodeGap)
    }));
  });

  return {
    placements,
    summary: {
      moved: placements.length,
      skipped: 0
    }
  };
};

const layoutSwimlaneByCategory = (
  nodes: OrganizeInputNode[],
  config: OrganizeConfig,
  state: PluginStateV1
): OrganizeComputationResult => {
  const sorted = stableNodeSort(nodes);
  const origin = getBoardOrigin(sorted);
  const { maxWidth, maxHeight } = getLayoutDimensions(sorted);
  const categories = laneSortedCategories(state.categories);

  const laneIndexByCategoryId = new Map<string, number>();
  categories.forEach((category, index) => laneIndexByCategoryId.set(category.id, index));

  const lanes = new Map<number, OrganizeInputNode[]>();
  const unknownLane = categories.length;

  for (const node of sorted) {
    const categoryId = state.nodeCategoryAssignments[node.id];
    const lane = categoryId ? (laneIndexByCategoryId.get(categoryId) ?? unknownLane) : unknownLane;
    const existing = lanes.get(lane) ?? [];
    existing.push(node);
    lanes.set(lane, existing);
  }

  const laneIndexes = [...lanes.keys()].sort((a, b) => a - b);
  const placements = laneIndexes.flatMap((laneIndex) => {
    const laneNodes = stableNodeSort(lanes.get(laneIndex) ?? []);
    return laneNodes.map((node, rowIndex) => ({
      nodeId: node.id,
      x: origin.x + laneIndex * (maxWidth + config.laneGap),
      y: origin.y + rowIndex * (maxHeight + config.nodeGap)
    }));
  });

  return {
    placements,
    summary: {
      moved: placements.length,
      skipped: 0
    }
  };
};

export const computeOrganizeLayout = (
  nodes: OrganizeInputNode[],
  config: OrganizeConfig,
  state: PluginStateV1
): OrganizeComputationResult => {
  if (nodes.length === 0) {
    return {
      placements: [],
      summary: {
        moved: 0,
        skipped: 0
      }
    };
  }

  if (config.preset === "process_lr") {
    return layoutProcessLR(nodes, config);
  }

  if (config.preset === "hierarchy_tb") {
    return layoutHierarchyTB(nodes, config);
  }

  return layoutSwimlaneByCategory(nodes, config, state);
};

export type { OrganizeInputNode };

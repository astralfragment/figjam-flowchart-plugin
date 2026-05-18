import {
  assignDecisionBranchSides,
  chooseRoutingMode,
  extractOrganizeGraph,
  getGeometryOrderedNodes,
  type OrganizeGraph,
  type OrganizeGraphEdge,
  type OrganizeGraphNode,
  type OrganizeInputConnector,
  type OrganizeInputNode
} from "@core/organize/graph";
import type {
  ConnectorPathType,
  ConnectorHandlingMode,
  LayoutPreset,
  OrganizeConfig,
  OrganizeNodePlacement,
  OrganizeRunDiagnostics,
  LegacyPluginState
} from "@shared/types";

type LayoutOrientation = "horizontal" | "vertical";
type ConnectorMagnet = "NONE" | "AUTO" | "TOP" | "LEFT" | "BOTTOM" | "RIGHT" | "CENTER";

interface ConnectorEndpointPlan {
  endpointNodeId: string;
  magnet?: ConnectorMagnet;
  position?: {
    x: number;
    y: number;
  };
}

export interface OrganizeConnectorPlan {
  connectorId: string;
  sourceNodeId: string;
  targetNodeId: string;
  pathType: ConnectorPathType;
  start: ConnectorEndpointPlan;
  end: ConnectorEndpointPlan;
}

export interface OrganizeComputationResult {
  placements: OrganizeNodePlacement[];
  connectorPlans: OrganizeConnectorPlan[];
  recreateConnectorIds: string[];
  summary: {
    moved: number;
    skipped: number;
  };
  diagnostics: OrganizeRunDiagnostics;
}

export interface LayeredComponentLayout {
  layers: string[][];
  layerByNodeId: Map<string, number>;
  backwardEdgeIds: string[];
  dagEdges: OrganizeGraphEdge[];
  dummyNodeIds: Set<string>;
}

const CLUSTER_GAP = 140;
const DECISION_INSET = 12;

interface OrganizeSpacing {
  nodeGap: number;
  laneGap: number;
  clusterGap: number;
}

const getSpacing = (config: OrganizeConfig): OrganizeSpacing => {
  const scale = config.spacingMode === "compact" ? 0.8 : config.spacingMode === "spacious" ? 1.35 : 1;
  return {
    nodeGap: Math.round(config.nodeGap * scale),
    laneGap: Math.round(config.laneGap * scale),
    clusterGap: Math.round(CLUSTER_GAP * scale)
  };
};

const getOrientation = (preset: LayoutPreset): LayoutOrientation =>
  preset === "process_lr" ? "horizontal" : "vertical";

const getNodeCenter = (node: Pick<OrganizeGraphNode, "x" | "y" | "width" | "height">): { x: number; y: number } => ({
  x: node.x + node.width / 2,
  y: node.y + node.height / 2
});

const getPrimaryValue = (node: OrganizeGraphNode, preset: LayoutPreset): number =>
  preset === "process_lr" ? node.x : node.y;

const getSecondaryValue = (node: OrganizeGraphNode, preset: LayoutPreset): number =>
  preset === "process_lr" ? node.y : node.x;

const createEdgeMap = (edges: readonly OrganizeGraphEdge[]): Map<string, OrganizeGraphEdge[]> => {
  const map = new Map<string, OrganizeGraphEdge[]>();
  for (const edge of edges) {
    if (!edge.sourceNodeId) {
      continue;
    }
    const existing = map.get(edge.sourceNodeId) ?? [];
    existing.push(edge);
    map.set(edge.sourceNodeId, existing);
  }
  return map;
};

const buildVirtualEdges = (
  componentNodes: readonly OrganizeGraphNode[],
  preset: LayoutPreset
): OrganizeGraphEdge[] => {
  const orderedNodes = getGeometryOrderedNodes(componentNodes, preset);
  const virtualEdges: OrganizeGraphEdge[] = [];
  for (let index = 0; index < orderedNodes.length - 1; index += 1) {
    const source = orderedNodes[index];
    const target = orderedNodes[index + 1];
    virtualEdges.push({
      id: `virtual-${source.id}-${target.id}`,
      connectorId: `virtual-${source.id}-${target.id}`,
      sourceNodeId: source.id,
      targetNodeId: target.id,
      label: "",
      pathType: "ELBOWED",
      isAttached: true,
      isAmbiguous: false
    });
  }
  return virtualEdges;
};

export const buildLayeredComponentLayout = (
  componentNodes: readonly OrganizeGraphNode[],
  componentEdges: readonly OrganizeGraphEdge[],
  preset: LayoutPreset
): LayeredComponentLayout => {
  const nodeById = new Map(componentNodes.map((node) => [node.id, node]));
  const workingEdges = componentEdges.length > 0 ? [...componentEdges] : buildVirtualEdges(componentNodes, preset);
  const geometryOrder = getGeometryOrderedNodes(componentNodes, preset);
  const geometryRank = new Map(geometryOrder.map((node, index) => [node.id, index]));
  const adjacency = createEdgeMap(
    workingEdges.sort((a, b) => {
      const aTargetRank = geometryRank.get(a.targetNodeId ?? "") ?? Number.MAX_SAFE_INTEGER;
      const bTargetRank = geometryRank.get(b.targetNodeId ?? "") ?? Number.MAX_SAFE_INTEGER;
      return aTargetRank - bTargetRank || a.id.localeCompare(b.id);
    })
  );

  const backwardEdgeIds = new Set<string>();
  const state = new Map<string, 0 | 1 | 2>();
  for (const node of componentNodes) {
    state.set(node.id, 0);
  }

  const visit = (nodeId: string): void => {
    state.set(nodeId, 1);
    for (const edge of adjacency.get(nodeId) ?? []) {
      if (!edge.targetNodeId) {
        continue;
      }
      const targetState = state.get(edge.targetNodeId) ?? 0;
      if (targetState === 1) {
        backwardEdgeIds.add(edge.id);
        continue;
      }
      if (targetState === 0) {
        visit(edge.targetNodeId);
      }
    }
    state.set(nodeId, 2);
  };

  for (const node of geometryOrder) {
    if ((state.get(node.id) ?? 0) === 0) {
      visit(node.id);
    }
  }

  const dagEdges = workingEdges.filter((edge) => !backwardEdgeIds.has(edge.id));
  const incomingCounts = new Map<string, number>();
  const outgoing = new Map<string, OrganizeGraphEdge[]>();

  for (const node of componentNodes) {
    incomingCounts.set(node.id, 0);
    outgoing.set(node.id, []);
  }

  for (const edge of dagEdges) {
    if (!edge.sourceNodeId || !edge.targetNodeId) {
      continue;
    }
    incomingCounts.set(edge.targetNodeId, (incomingCounts.get(edge.targetNodeId) ?? 0) + 1);
    outgoing.get(edge.sourceNodeId)?.push(edge);
  }

  const queue = geometryOrder
    .filter((node) => (incomingCounts.get(node.id) ?? 0) === 0)
    .map((node) => node.id);
  if (queue.length === 0 && geometryOrder[0]) {
    queue.push(geometryOrder[0].id);
  }

  const orderedNodeIds: string[] = [];
  const seen = new Set<string>();
  while (queue.length > 0) {
    const nodeId = queue.shift()!;
    if (seen.has(nodeId)) {
      continue;
    }
    seen.add(nodeId);
    orderedNodeIds.push(nodeId);
    for (const edge of outgoing.get(nodeId) ?? []) {
      if (!edge.targetNodeId) {
        continue;
      }
      const nextCount = (incomingCounts.get(edge.targetNodeId) ?? 0) - 1;
      incomingCounts.set(edge.targetNodeId, nextCount);
      if (nextCount <= 0) {
        queue.push(edge.targetNodeId);
      }
    }
  }

  for (const node of geometryOrder) {
    if (!seen.has(node.id)) {
      orderedNodeIds.push(node.id);
    }
  }

  const layerByNodeId = new Map<string, number>();
  for (const nodeId of orderedNodeIds) {
    layerByNodeId.set(nodeId, 0);
  }
  for (const nodeId of orderedNodeIds) {
    for (const edge of outgoing.get(nodeId) ?? []) {
      if (!edge.targetNodeId) {
        continue;
      }
      const nextRank = (layerByNodeId.get(nodeId) ?? 0) + 1;
      if (nextRank > (layerByNodeId.get(edge.targetNodeId) ?? 0)) {
        layerByNodeId.set(edge.targetNodeId, nextRank);
      }
    }
  }

  // ── Dummy node insertion for long edges ──
  const dummyNodeIds = new Set<string>();
  let dummyCounter = 0;
  const longEdgesToReplace: { edge: OrganizeGraphEdge; dummyChain: string[] }[] = [];

  for (const edge of dagEdges) {
    if (!edge.sourceNodeId || !edge.targetNodeId) continue;
    const srcLayer = layerByNodeId.get(edge.sourceNodeId) ?? 0;
    const tgtLayer = layerByNodeId.get(edge.targetNodeId) ?? 0;
    const span = tgtLayer - srcLayer;
    if (span <= 1) continue;

    const chain: string[] = [];
    for (let layer = srcLayer + 1; layer < tgtLayer; layer++) {
      const dummyId = `__dummy_${dummyCounter++}`;
      dummyNodeIds.add(dummyId);
      layerByNodeId.set(dummyId, layer);
      chain.push(dummyId);
    }
    longEdgesToReplace.push({ edge, dummyChain: chain });
  }

  for (const { edge, dummyChain } of longEdgesToReplace) {
    const idx = dagEdges.indexOf(edge);
    if (idx === -1) continue;

    const replacementEdges: OrganizeGraphEdge[] = [];
    const allNodes = [edge.sourceNodeId!, ...dummyChain, edge.targetNodeId!];
    for (let i = 0; i < allNodes.length - 1; i++) {
      replacementEdges.push({
        id: `${edge.id}__seg${i}`,
        connectorId: edge.connectorId,
        sourceNodeId: allNodes[i],
        targetNodeId: allNodes[i + 1],
        pathType: edge.pathType,
        isAttached: edge.isAttached,
        isAmbiguous: edge.isAmbiguous
      });
    }
    dagEdges.splice(idx, 1, ...replacementEdges);
  }

  const layersMap = new Map<number, string[]>();
  for (const nodeId of orderedNodeIds) {
    const layer = layerByNodeId.get(nodeId) ?? 0;
    const existing = layersMap.get(layer) ?? [];
    existing.push(nodeId);
    layersMap.set(layer, existing);
  }
  // Add dummy nodes to their layers
  for (const dummyId of dummyNodeIds) {
    const layer = layerByNodeId.get(dummyId) ?? 0;
    const existing = layersMap.get(layer) ?? [];
    existing.push(dummyId);
    layersMap.set(layer, existing);
  }

  const predecessorIndex = new Map<string, number>();
  geometryOrder.forEach((node, index) => predecessorIndex.set(node.id, index));
  const incoming = new Map<string, OrganizeGraphEdge[]>();
  const outgoingByTarget = new Map<string, OrganizeGraphEdge[]>();
  for (const node of componentNodes) {
    incoming.set(node.id, []);
    outgoingByTarget.set(node.id, []);
  }
  for (const dummyId of dummyNodeIds) {
    incoming.set(dummyId, []);
    outgoingByTarget.set(dummyId, []);
  }
  for (const edge of dagEdges) {
    if (!edge.sourceNodeId || !edge.targetNodeId) {
      continue;
    }
    incoming.get(edge.targetNodeId)?.push(edge);
    outgoingByTarget.get(edge.sourceNodeId)?.push(edge);
  }

  const orderedLayers = [...layersMap.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([, nodeIds]) =>
      [...nodeIds].sort((leftId, rightId) => {
        const left = nodeById.get(leftId)!;
        const right = nodeById.get(rightId)!;
        return getSecondaryValue(left, preset) - getSecondaryValue(right, preset) || left.id.localeCompare(right.id);
      })
    );

  const computeBarycenter = (
    nodeId: string,
    edgeLookup: ReadonlyMap<string, OrganizeGraphEdge[]>,
    targetLookup: (edge: OrganizeGraphEdge) => string | undefined,
    positionMap: ReadonlyMap<string, number>
  ): number => {
    const relatedEdges = edgeLookup.get(nodeId) ?? [];
    if (relatedEdges.length === 0) {
      return predecessorIndex.get(nodeId) ?? 0;
    }
    const positions = relatedEdges
      .map((edge) => targetLookup(edge))
      .filter((targetId): targetId is string => Boolean(targetId))
      .map((targetId) => positionMap.get(targetId))
      .filter((value): value is number => value !== undefined);
    if (positions.length === 0) {
      return predecessorIndex.get(nodeId) ?? 0;
    }
    return positions.reduce((total, value) => total + value, 0) / positions.length;
  };

  const computeMedian = (
    nodeId: string,
    edgeLookup: ReadonlyMap<string, OrganizeGraphEdge[]>,
    targetLookup: (edge: OrganizeGraphEdge) => string | undefined,
    positionMap: ReadonlyMap<string, number>
  ): number => {
    const relatedEdges = edgeLookup.get(nodeId) ?? [];
    if (relatedEdges.length === 0) {
      return predecessorIndex.get(nodeId) ?? 0;
    }
    const positions = relatedEdges
      .map((edge) => targetLookup(edge))
      .filter((targetId): targetId is string => Boolean(targetId))
      .map((targetId) => positionMap.get(targetId))
      .filter((value): value is number => value !== undefined)
      .sort((a, b) => a - b);
    if (positions.length === 0) {
      return predecessorIndex.get(nodeId) ?? 0;
    }
    return positions[Math.floor(positions.length / 2)];
  };

  const countLayerCrossings = (layers: string[][]): number => {
    let crossings = 0;
    for (let li = 0; li < layers.length - 1; li++) {
      const upperLayer = layers[li];
      const lowerLayer = layers[li + 1];
      const upperPos = new Map(upperLayer.map((id, i) => [id, i]));
      const lowerPos = new Map(lowerLayer.map((id, i) => [id, i]));
      const edgePairs: [number, number][] = [];
      for (const edge of dagEdges) {
        if (!edge.sourceNodeId || !edge.targetNodeId) continue;
        const uPos = upperPos.get(edge.sourceNodeId);
        const lPos = lowerPos.get(edge.targetNodeId);
        if (uPos !== undefined && lPos !== undefined) {
          edgePairs.push([uPos, lPos]);
        }
      }
      edgePairs.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
      for (let i = 0; i < edgePairs.length; i++) {
        for (let j = i + 1; j < edgePairs.length; j++) {
          if (edgePairs[i][1] > edgePairs[j][1]) crossings++;
        }
      }
    }
    return crossings;
  };

  const adjacentExchange = (layers: string[][]): void => {
    let improved = true;
    while (improved) {
      improved = false;
      for (const layer of layers) {
        for (let i = 0; i < layer.length - 1; i++) {
          const before = countLayerCrossings(layers);
          [layer[i], layer[i + 1]] = [layer[i + 1], layer[i]];
          const after = countLayerCrossings(layers);
          if (after < before) {
            improved = true;
          } else {
            [layer[i], layer[i + 1]] = [layer[i + 1], layer[i]];
          }
        }
      }
    }
  };

  const snapshotLayers = (layers: string[][]): string[][] => layers.map(l => [...l]);

  let bestLayers = snapshotLayers(orderedLayers);
  let bestCrossings = countLayerCrossings(orderedLayers);

  for (let pass = 0; pass < 12; pass += 1) {
    const useMedian = pass % 2 === 1;
    const heuristic = useMedian ? computeMedian : computeBarycenter;

    let previousLayerPositions = new Map<string, number>();
    orderedLayers[0]?.forEach((nodeId, index) => previousLayerPositions.set(nodeId, index));

    for (let layerIndex = 1; layerIndex < orderedLayers.length; layerIndex += 1) {
      orderedLayers[layerIndex].sort((leftId, rightId) => {
        const leftScore = heuristic(leftId, incoming, (edge) => edge.sourceNodeId, previousLayerPositions);
        const rightScore = heuristic(rightId, incoming, (edge) => edge.sourceNodeId, previousLayerPositions);
        return leftScore - rightScore || (predecessorIndex.get(leftId) ?? 0) - (predecessorIndex.get(rightId) ?? 0);
      });
      previousLayerPositions = new Map(orderedLayers[layerIndex].map((nodeId, index) => [nodeId, index]));
    }

    let nextLayerPositions = new Map<string, number>();
    const lastLayerIndex = orderedLayers.length - 1;
    orderedLayers[lastLayerIndex]?.forEach((nodeId, index) => nextLayerPositions.set(nodeId, index));

    for (let layerIndex = orderedLayers.length - 2; layerIndex >= 0; layerIndex -= 1) {
      orderedLayers[layerIndex].sort((leftId, rightId) => {
        const leftScore = heuristic(leftId, outgoingByTarget, (edge) => edge.targetNodeId, nextLayerPositions);
        const rightScore = heuristic(rightId, outgoingByTarget, (edge) => edge.targetNodeId, nextLayerPositions);
        return leftScore - rightScore || (predecessorIndex.get(leftId) ?? 0) - (predecessorIndex.get(rightId) ?? 0);
      });
      nextLayerPositions = new Map(orderedLayers[layerIndex].map((nodeId, index) => [nodeId, index]));
    }

    adjacentExchange(orderedLayers);

    const currentCrossings = countLayerCrossings(orderedLayers);
    if (currentCrossings < bestCrossings) {
      bestCrossings = currentCrossings;
      bestLayers = snapshotLayers(orderedLayers);
    }
  }

  for (let i = 0; i < orderedLayers.length; i++) {
    orderedLayers[i] = bestLayers[i];
  }

  return {
    layers: orderedLayers,
    layerByNodeId,
    backwardEdgeIds: [...backwardEdgeIds],
    dagEdges,
    dummyNodeIds
  };
};

const makeMagnetEndpoint = (nodeId: string, magnet: ConnectorMagnet): ConnectorEndpointPlan => ({
  endpointNodeId: nodeId,
  magnet
});

const makePositionEndpoint = (node: OrganizeGraphNode, x: number, y: number): ConnectorEndpointPlan => ({
  endpointNodeId: node.id,
  position: { x, y }
});

const normalizePathType = (
  pathType: ConnectorPathType,
  start: ConnectorEndpointPlan,
  end: ConnectorEndpointPlan
): { pathType: ConnectorPathType; start: ConnectorEndpointPlan; end: ConnectorEndpointPlan } => {
  if (pathType !== "STRAIGHT") {
    return { pathType, start, end };
  }

  return {
    pathType,
    start: makeMagnetEndpoint(start.endpointNodeId, "CENTER"),
    end: makeMagnetEndpoint(end.endpointNodeId, "CENTER")
  };
};

const getLaneIndexMap = (nodes: readonly OrganizeGraphNode[], state: LegacyPluginState): Map<string, number> => {
  const categories = [...state.categories].sort((a, b) => a.order - b.order || a.label.localeCompare(b.label));
  const laneIndexByCategoryId = new Map(categories.map((category, index) => [category.id, index]));
  const unknownLane = categories.length;
  return new Map(
    nodes.map((node) => [node.id, node.categoryId ? (laneIndexByCategoryId.get(node.categoryId) ?? unknownLane) : unknownLane])
  );
};

const placeStandardComponent = (
  nodesById: ReadonlyMap<string, OrganizeGraphNode>,
  layered: LayeredComponentLayout,
  preset: LayoutPreset,
  spacing: OrganizeSpacing,
  origin: { x: number; y: number }
): { placements: OrganizeNodePlacement[]; bounds: { width: number; height: number } } => {
  const orientation = getOrientation(preset);
  const placements: OrganizeNodePlacement[] = [];
  let primaryCursor = 0;
  let maxSecondarySpan = 0;

  const DECISION_EXTRA_GAP = spacing.nodeGap * 0.5;
  const DELAY_EXTRA_GAP = spacing.nodeGap * 0.75;
  const IO_SECONDARY_OFFSET = spacing.nodeGap * 0.3;

  layered.layers.forEach((layer) => {
    const layerNodes = layer
      .filter((nodeId) => !layered.dummyNodeIds.has(nodeId))
      .map((nodeId) => nodesById.get(nodeId)!)
      .filter(Boolean);
    if (layerNodes.length === 0) return;

    // Role-based extra gap before this layer
    const dominantRole = layerNodes[0]?.layoutRole ?? "process";
    if (dominantRole === "decision" || dominantRole === "fork") {
      primaryCursor += DECISION_EXTRA_GAP;
    } else if (dominantRole === "delay") {
      primaryCursor += DELAY_EXTRA_GAP;
    }

    const layerPrimarySpan = Math.max(
      ...layerNodes.map((node) => (orientation === "horizontal" ? node.width : node.height)),
      0
    );
    let secondaryCursor = 0;
    let layerSecondarySpan = 0;

    for (const node of layerNodes) {
      // IO nodes get a secondary offset
      const secondaryOffset = (node.layoutRole === "io") ? IO_SECONDARY_OFFSET : 0;

      const placement =
        orientation === "horizontal"
          ? { nodeId: node.id, x: origin.x + primaryCursor, y: origin.y + secondaryCursor + secondaryOffset }
          : { nodeId: node.id, x: origin.x + secondaryCursor + secondaryOffset, y: origin.y + primaryCursor };
      placements.push(placement);
      secondaryCursor += (orientation === "horizontal" ? node.height : node.width) + spacing.nodeGap;
      layerSecondarySpan = secondaryCursor - spacing.nodeGap;
    }

    primaryCursor += layerPrimarySpan + spacing.nodeGap;
    maxSecondarySpan = Math.max(maxSecondarySpan, layerSecondarySpan);
  });

  return {
    placements,
    bounds: {
      width: orientation === "horizontal" ? Math.max(0, primaryCursor - spacing.nodeGap) : maxSecondarySpan,
      height: orientation === "horizontal" ? maxSecondarySpan : Math.max(0, primaryCursor - spacing.nodeGap)
    }
  };
};

const isTreeLikeLayout = (
  componentNodes: readonly OrganizeGraphNode[],
  layered: LayeredComponentLayout
): boolean => {
  const indegree = new Map(componentNodes.map((node) => [node.id, 0]));
  for (const edge of layered.dagEdges) {
    if (!edge.targetNodeId || layered.dummyNodeIds.has(edge.targetNodeId)) {
      continue;
    }
    if (!layered.dummyNodeIds.has(edge.sourceNodeId ?? "")) {
      indegree.set(edge.targetNodeId, (indegree.get(edge.targetNodeId) ?? 0) + 1);
    }
  }

  return componentNodes.every((node) => (indegree.get(node.id) ?? 0) <= 1);
};

const placeTreeComponent = (
  nodesById: ReadonlyMap<string, OrganizeGraphNode>,
  layered: LayeredComponentLayout,
  spacing: OrganizeSpacing,
  origin: { x: number; y: number }
): { placements: OrganizeNodePlacement[]; bounds: { width: number; height: number } } => {
  const childIdsByNodeId = new Map<string, string[]>();
  const indegree = new Map<string, number>();
  const orderIndex = new Map<string, number>();

  const realNodeIds = layered.layers.flat().filter(id => !layered.dummyNodeIds.has(id));
  realNodeIds.forEach((nodeId, index) => orderIndex.set(nodeId, index));
  for (const nodeId of realNodeIds) {
    childIdsByNodeId.set(nodeId, []);
    indegree.set(nodeId, 0);
  }

  // Build adjacency skipping dummy chain nodes
  const resolveTarget = (targetId: string): string[] => {
    if (!layered.dummyNodeIds.has(targetId)) return [targetId];
    const results: string[] = [];
    for (const edge of layered.dagEdges) {
      if (edge.sourceNodeId === targetId && edge.targetNodeId) {
        results.push(...resolveTarget(edge.targetNodeId));
      }
    }
    return results;
  };

  for (const edge of layered.dagEdges) {
    if (!edge.sourceNodeId || !edge.targetNodeId) continue;
    if (layered.dummyNodeIds.has(edge.sourceNodeId)) continue;
    const realTargets = resolveTarget(edge.targetNodeId);
    for (const rt of realTargets) {
      childIdsByNodeId.get(edge.sourceNodeId)?.push(rt);
      indegree.set(rt, (indegree.get(rt) ?? 0) + 1);
    }
  }

  for (const children of childIdsByNodeId.values()) {
    children.sort((leftId, rightId) => (orderIndex.get(leftId) ?? 0) - (orderIndex.get(rightId) ?? 0));
  }

  const roots = [...childIdsByNodeId.keys()]
    .filter((nodeId) => (indegree.get(nodeId) ?? 0) === 0)
    .sort((leftId, rightId) => (orderIndex.get(leftId) ?? 0) - (orderIndex.get(rightId) ?? 0));

  const subtreeWidth = new Map<string, number>();
  const measure = (nodeId: string): number => {
    if (subtreeWidth.has(nodeId)) {
      return subtreeWidth.get(nodeId)!;
    }

    const node = nodesById.get(nodeId)!;
    const children = childIdsByNodeId.get(nodeId) ?? [];
    if (children.length === 0) {
      subtreeWidth.set(nodeId, node.width);
      return node.width;
    }

    const width = Math.max(
      node.width,
      children.reduce((total, childId, index) => {
        return total + measure(childId) + (index > 0 ? spacing.nodeGap : 0);
      }, 0)
    );
    subtreeWidth.set(nodeId, width);
    return width;
  };

  const placements = new Map<string, OrganizeNodePlacement>();
  const maxNodeHeight = Math.max(...[...nodesById.values()].map((node) => node.height), 80);
  let usedWidth = 0;

  const assign = (nodeId: string, leftX: number): void => {
    const node = nodesById.get(nodeId)!;
    const children = childIdsByNodeId.get(nodeId) ?? [];
    const childCenters: number[] = [];
    let childCursor = leftX;

    for (const childId of children) {
      assign(childId, childCursor);
      const childPlacement = placements.get(childId)!;
      const childNode = nodesById.get(childId)!;
      childCenters.push(childPlacement.x + childNode.width / 2);
      childCursor += measure(childId) + spacing.nodeGap;
    }

    const centerX =
      childCenters.length > 0
        ? childCenters.reduce((total, value) => total + value, 0) / childCenters.length
        : leftX + measure(nodeId) / 2;

    placements.set(nodeId, {
      nodeId,
      x: Math.round(centerX - node.width / 2),
      y: origin.y + (layered.layerByNodeId.get(nodeId) ?? 0) * (maxNodeHeight + Math.round(spacing.nodeGap * 1.25))
    });
    usedWidth = Math.max(usedWidth, leftX + measure(nodeId));
  };

  let rootCursor = origin.x;
  for (const rootId of roots) {
    assign(rootId, rootCursor);
    rootCursor += measure(rootId) + spacing.laneGap;
  }

  const placementList = [...placements.values()];
  const maxY = Math.max(...placementList.map((placement) => placement.y), origin.y);

  return {
    placements: placementList,
    bounds: {
      width: Math.max(0, usedWidth - origin.x),
      height: Math.max(0, maxY - origin.y + maxNodeHeight)
    }
  };
};

const placeSwimlaneComponent = (
  nodesById: ReadonlyMap<string, OrganizeGraphNode>,
  layered: LayeredComponentLayout,
  spacing: OrganizeSpacing,
  origin: { x: number; y: number },
  laneIndexByNodeId: ReadonlyMap<string, number>,
  laneBaseX: ReadonlyMap<number, number>,
  laneWidth: number
): { placements: OrganizeNodePlacement[]; bounds: { width: number; height: number } } => {
  const placements: OrganizeNodePlacement[] = [];
  let yCursor = 0;
  const lastLane = Math.max(...laneBaseX.keys(), 0);

  layered.layers.forEach((layer) => {
    const layerNodes = layer.map((nodeId) => nodesById.get(nodeId)!);
    const layerHeight = Math.max(...layerNodes.map((node) => node.height), 0);
    const grouped = new Map<number, OrganizeGraphNode[]>();

    for (const node of layerNodes) {
      const lane = laneIndexByNodeId.get(node.id) ?? lastLane;
      const existing = grouped.get(lane) ?? [];
      existing.push(node);
      grouped.set(lane, existing);
    }

    for (const [lane, laneNodes] of grouped.entries()) {
      laneNodes.forEach((node, index) => {
        const laneOriginX = laneBaseX.get(lane) ?? origin.x;
        placements.push({
          nodeId: node.id,
          x: laneOriginX + index * Math.max(spacing.nodeGap * 0.5, 32),
          y: origin.y + yCursor
        });
      });
    }

    yCursor += layerHeight + spacing.nodeGap;
  });

  return {
    placements,
    bounds: {
      width: Math.max(0, (lastLane + 1) * laneWidth),
      height: Math.max(0, yCursor - spacing.nodeGap)
    }
  };
};

const getPlacedNodes = (
  graphNodes: readonly OrganizeGraphNode[],
  placements: readonly OrganizeNodePlacement[]
): Map<string, OrganizeGraphNode> => {
  const placementById = new Map(placements.map((placement) => [placement.nodeId, placement]));
  return new Map(
    graphNodes.map((node) => [
      node.id,
      {
        ...node,
        x: placementById.get(node.id)?.x ?? node.x,
        y: placementById.get(node.id)?.y ?? node.y
      }
    ])
  );
};

const defaultEndpoints = (
  source: OrganizeGraphNode,
  target: OrganizeGraphNode,
  preset: LayoutPreset
): { start: ConnectorEndpointPlan; end: ConnectorEndpointPlan } => {
  if (preset === "process_lr") {
    return {
      start: makeMagnetEndpoint(source.id, "RIGHT"),
      end: makeMagnetEndpoint(target.id, "LEFT")
    };
  }

  return {
    start: makeMagnetEndpoint(source.id, "BOTTOM"),
    end: makeMagnetEndpoint(target.id, "TOP")
  };
};

const getDecisionEntryEndpoint = (node: OrganizeGraphNode, preset: LayoutPreset): ConnectorEndpointPlan =>
  preset === "process_lr"
    ? makePositionEndpoint(node, node.x, node.y + node.height / 2)
    : makePositionEndpoint(node, node.x + node.width / 2, node.y);

const getDecisionExitEndpoint = (
  node: OrganizeGraphNode,
  side: "left" | "right",
  preset: LayoutPreset
): ConnectorEndpointPlan => {
  if (preset === "process_lr") {
    return side === "right"
      ? makePositionEndpoint(node, node.x + node.width, node.y + node.height - DECISION_INSET)
      : makePositionEndpoint(node, node.x + node.width, node.y + DECISION_INSET);
  }

  return side === "right"
    ? makePositionEndpoint(node, node.x + node.width - DECISION_INSET, node.y + node.height)
    : makePositionEndpoint(node, node.x + DECISION_INSET, node.y + node.height);
};

const allocateSidePorts = (
  node: OrganizeGraphNode,
  edges: readonly OrganizeGraphEdge[],
  placedNodeMap: ReadonlyMap<string, OrganizeGraphNode>,
  preset: LayoutPreset,
  side: "incoming" | "outgoing"
): Map<string, ConnectorEndpointPlan> => {
  const nodeCenterX = node.x + node.width / 2;
  const nodeCenterY = node.y + node.height / 2;

  const angleToTarget = (edge: OrganizeGraphEdge): number => {
    const targetId = side === "outgoing" ? edge.targetNodeId : edge.sourceNodeId;
    const target = targetId ? placedNodeMap.get(targetId) : undefined;
    if (!target) return 0;
    const targetCenterX = target.x + target.width / 2;
    const targetCenterY = target.y + target.height / 2;
    return Math.atan2(targetCenterY - nodeCenterY, targetCenterX - nodeCenterX);
  };

  const sortedEdges = [...edges].sort((left, right) => {
    return angleToTarget(left) - angleToTarget(right) || left.id.localeCompare(right.id);
  });
  const plans = new Map<string, ConnectorEndpointPlan>();
  const orientation = getOrientation(preset);
  const span = Math.max(
    1,
    (orientation === "horizontal" ? node.height : node.width) - DECISION_INSET * 2
  );

  sortedEdges.forEach((edge, index) => {
    const slot = (index + 1) / (sortedEdges.length + 1);
    if (orientation === "horizontal") {
      const y = node.y + DECISION_INSET + span * slot;
      plans.set(
        edge.id,
        makePositionEndpoint(node, side === "outgoing" ? node.x + node.width : node.x, Math.round(y))
      );
      return;
    }

    const x = node.x + DECISION_INSET + span * slot;
    plans.set(
      edge.id,
      makePositionEndpoint(node, Math.round(x), side === "outgoing" ? node.y + node.height : node.y)
    );
  });

  return plans;
};

const buildConnectorPlans = (
  graph: OrganizeGraph,
  placedNodeMap: ReadonlyMap<string, OrganizeGraphNode>,
  config: OrganizeConfig,
  backwardEdgeIds: ReadonlySet<string> = new Set()
): OrganizeConnectorPlan[] => {
  const preset = config.preset;
  const decisionAssignments = new Map<string, "left" | "right">();
  const outgoingByNodeId = new Map<string, OrganizeGraphEdge[]>();
  const incomingByNodeId = new Map<string, OrganizeGraphEdge[]>();

  for (const node of graph.nodes) {
    outgoingByNodeId.set(node.id, []);
    incomingByNodeId.set(node.id, []);
  }

  for (const edge of graph.edges) {
    if (!edge.isAttached || !edge.sourceNodeId || !edge.targetNodeId) {
      continue;
    }
    outgoingByNodeId.get(edge.sourceNodeId)?.push(edge);
    incomingByNodeId.get(edge.targetNodeId)?.push(edge);
  }

  for (const node of graph.nodes.filter((item) => item.isDecision)) {
    const outgoingEdges = graph.edges.filter((edge) => edge.isAttached && edge.sourceNodeId === node.id);
    for (const assignment of assignDecisionBranchSides(node, outgoingEdges, placedNodeMap, preset)) {
      decisionAssignments.set(assignment.connectorId, assignment.side);
    }
  }

  const outgoingPorts = new Map<string, ConnectorEndpointPlan>();
  const incomingPorts = new Map<string, ConnectorEndpointPlan>();
  if (config.connectorHandling !== "minimal") {
    for (const node of graph.nodes.filter((item) => !item.isDecision)) {
      const placedNode = placedNodeMap.get(node.id);
      if (!placedNode) {
        continue;
      }
      for (const [edgeId, endpoint] of allocateSidePorts(
        placedNode,
        outgoingByNodeId.get(node.id) ?? [],
        placedNodeMap,
        preset,
        "outgoing"
      )) {
        outgoingPorts.set(edgeId, endpoint);
      }
      for (const [edgeId, endpoint] of allocateSidePorts(
        placedNode,
        incomingByNodeId.get(node.id) ?? [],
        placedNodeMap,
        preset,
        "incoming"
      )) {
        incomingPorts.set(edgeId, endpoint);
      }
    }
  }

  const plans: OrganizeConnectorPlan[] = [];
  for (const edge of graph.edges) {
    if (!edge.isAttached || !edge.sourceNodeId || !edge.targetNodeId) {
      continue;
    }

    const source = placedNodeMap.get(edge.sourceNodeId);
    const target = placedNodeMap.get(edge.targetNodeId);
    if (!source || !target) {
      continue;
    }

    let { start, end } = defaultEndpoints(source, target, preset);
    let pathType: ConnectorPathType =
      config.connectorHandling === "minimal" ? edge.pathType ?? "ELBOWED" : "ELBOWED";

    // Back-edge routing: route loop edges around the outside
    if (backwardEdgeIds.has(edge.id)) {
      pathType = "ELBOWED";
      if (preset === "process_lr") {
        start = makeMagnetEndpoint(source.id, "LEFT");
        end = makeMagnetEndpoint(target.id, "LEFT");
      } else {
        start = makeMagnetEndpoint(source.id, "TOP");
        end = makeMagnetEndpoint(target.id, "TOP");
      }
      const normalized = normalizePathType(pathType, start, end);
      plans.push({
        connectorId: edge.connectorId,
        sourceNodeId: source.id,
        targetNodeId: target.id,
        pathType: normalized.pathType,
        start: normalized.start,
        end: normalized.end
      });
      continue;
    }

    if (source.isDecision) {
      pathType = "ELBOWED";
      start = getDecisionExitEndpoint(source, decisionAssignments.get(edge.id) ?? "right", preset);
    } else if (config.connectorHandling !== "minimal") {
      start = outgoingPorts.get(edge.id) ?? start;
    }

    if (target.isDecision) {
      pathType = "ELBOWED";
      end = getDecisionEntryEndpoint(target, preset);
    } else if (config.connectorHandling !== "minimal") {
      end = incomingPorts.get(edge.id) ?? end;
    }

    if (config.connectorHandling === "tree" && !source.isDecision && !target.isDecision) {
      pathType = "ELBOWED";
    }

    const normalized = normalizePathType(pathType, start, end);
    plans.push({
      connectorId: edge.connectorId,
      sourceNodeId: source.id,
      targetNodeId: target.id,
      pathType: normalized.pathType,
      start: normalized.start,
      end: normalized.end
    });
  }

  return plans;
};

const orientationDefaults = (
  source: OrganizeGraphNode,
  target: OrganizeGraphNode,
  preset: LayoutPreset
): { start: { x: number; y: number }; end: { x: number; y: number } } => {
  if (preset === "process_lr") {
    return {
      start: { x: source.x + source.width, y: source.y + source.height / 2 },
      end: { x: target.x, y: target.y + target.height / 2 }
    };
  }
  return {
    start: { x: source.x + source.width / 2, y: source.y + source.height },
    end: { x: target.x + target.width / 2, y: target.y }
  };
};

const pointFromEndpoint = (
  nodeById: ReadonlyMap<string, OrganizeGraphNode>,
  endpoint: ConnectorEndpointPlan,
  fallbackNodeId: string,
  fallbackPoint: { x: number; y: number }
): { x: number; y: number } => {
  if (endpoint.position) {
    return endpoint.position;
  }

  const node = nodeById.get(endpoint.endpointNodeId) ?? nodeById.get(fallbackNodeId);
  if (!node || !endpoint.magnet) {
    return fallbackPoint;
  }

  switch (endpoint.magnet) {
    case "TOP":
      return { x: node.x + node.width / 2, y: node.y };
    case "BOTTOM":
      return { x: node.x + node.width / 2, y: node.y + node.height };
    case "LEFT":
      return { x: node.x, y: node.y + node.height / 2 };
    case "RIGHT":
      return { x: node.x + node.width, y: node.y + node.height / 2 };
    case "CENTER":
    case "AUTO":
    case "NONE":
    default:
      return getNodeCenter(node);
  }
};

const orientation = (a: { x: number; y: number }, b: { x: number; y: number }, c: { x: number; y: number }): number =>
  (b.y - a.y) * (c.x - b.x) - (b.x - a.x) * (c.y - b.y);

const segmentsIntersect = (
  a1: { x: number; y: number },
  a2: { x: number; y: number },
  b1: { x: number; y: number },
  b2: { x: number; y: number }
): boolean => {
  const o1 = orientation(a1, a2, b1);
  const o2 = orientation(a1, a2, b2);
  const o3 = orientation(b1, b2, a1);
  const o4 = orientation(b1, b2, a2);
  return o1 * o2 < 0 && o3 * o4 < 0;
};

export const getCrossingConnectorIds = (
  graph: OrganizeGraph,
  placedNodeMap: ReadonlyMap<string, OrganizeGraphNode>,
  preset: LayoutPreset,
  plans: readonly OrganizeConnectorPlan[]
): string[] => {
  const planById = new Map(plans.map((plan) => [plan.connectorId, plan]));
  const crossingIds = new Set<string>();
  const edges = graph.edges.filter((edge) => edge.isAttached && edge.sourceNodeId && edge.targetNodeId);

  for (let index = 0; index < edges.length; index += 1) {
    const left = edges[index];
    const leftPlan = planById.get(left.id);
    const leftSource = placedNodeMap.get(left.sourceNodeId!);
    const leftTarget = placedNodeMap.get(left.targetNodeId!);
    if (!leftSource || !leftTarget) {
      continue;
    }

    const leftFallback = orientationDefaults(leftSource, leftTarget, preset);
    const leftStart = leftPlan
      ? pointFromEndpoint(placedNodeMap, leftPlan.start, leftSource.id, leftFallback.start)
      : leftFallback.start;
    const leftEnd = leftPlan
      ? pointFromEndpoint(placedNodeMap, leftPlan.end, leftTarget.id, leftFallback.end)
      : leftFallback.end;

    for (let compareIndex = index + 1; compareIndex < edges.length; compareIndex += 1) {
      const right = edges[compareIndex];
      if (
        left.sourceNodeId === right.sourceNodeId ||
        left.sourceNodeId === right.targetNodeId ||
        left.targetNodeId === right.sourceNodeId ||
        left.targetNodeId === right.targetNodeId
      ) {
        continue;
      }

      const rightPlan = planById.get(right.id);
      const rightSource = placedNodeMap.get(right.sourceNodeId!);
      const rightTarget = placedNodeMap.get(right.targetNodeId!);
      if (!rightSource || !rightTarget) {
        continue;
      }

      const rightFallback = orientationDefaults(rightSource, rightTarget, preset);
      const rightStart = rightPlan
        ? pointFromEndpoint(placedNodeMap, rightPlan.start, rightSource.id, rightFallback.start)
        : rightFallback.start;
      const rightEnd = rightPlan
        ? pointFromEndpoint(placedNodeMap, rightPlan.end, rightTarget.id, rightFallback.end)
        : rightFallback.end;

      if (segmentsIntersect(leftStart, leftEnd, rightStart, rightEnd)) {
        crossingIds.add(left.id);
        crossingIds.add(right.id);
      }
    }
  }

  return [...crossingIds];
};

export const countEstimatedCrossings = (
  graph: OrganizeGraph,
  placedNodeMap: ReadonlyMap<string, OrganizeGraphNode>,
  preset: LayoutPreset,
  plans: readonly OrganizeConnectorPlan[] = []
): number => getCrossingConnectorIds(graph, placedNodeMap, preset, plans).length / 2;

export const computeOrganizeLayout = (
  nodes: OrganizeInputNode[],
  connectors: OrganizeInputConnector[],
  config: OrganizeConfig,
  state: LegacyPluginState
): OrganizeComputationResult => {
  const graph = extractOrganizeGraph(nodes, connectors);
  const requestedMode = config.routingMode;
  const initialMode = chooseRoutingMode(requestedMode, graph);

  if (nodes.length === 0) {
    return {
      placements: [],
      connectorPlans: [],
      recreateConnectorIds: [],
      summary: {
        moved: 0,
        skipped: 0
      },
      diagnostics: {
        componentCount: 0,
        detectedDecisions: 0,
        crossingsReducedEstimate: 0,
        connectorsSkipped: 0,
        modeChosen: initialMode
      }
    };
  }

  const nodeById = new Map(graph.nodes.map((node) => [node.id, node]));
  const laneIndexByNodeId = getLaneIndexMap(graph.nodes, state);
  const spacing = getSpacing(config);
  const origin = {
    x: Math.min(...graph.nodes.map((node) => node.x)),
    y: Math.min(...graph.nodes.map((node) => node.y))
  };
  const maxNodeWidth = Math.max(...graph.nodes.map((node) => node.width), 220);
  const laneWidth = maxNodeWidth + spacing.laneGap;
  const laneBaseX = new Map<number, number>();
  for (const laneIndex of laneIndexByNodeId.values()) {
    if (!laneBaseX.has(laneIndex)) {
      laneBaseX.set(laneIndex, origin.x + laneIndex * laneWidth);
    }
  }

  const placements: OrganizeNodePlacement[] = [];
  const allBackwardEdgeIds = new Set<string>();
  let clusterY = origin.y;
  for (const component of graph.components) {
    const componentNodes = component.nodeIds.map((nodeId) => nodeById.get(nodeId)!);
    const componentNodeIdSet = new Set(component.nodeIds);
    const componentEdges = graph.edges.filter(
      (edge) =>
        edge.isAttached &&
        edge.sourceNodeId &&
        edge.targetNodeId &&
        componentNodeIdSet.has(edge.sourceNodeId) &&
        componentNodeIdSet.has(edge.targetNodeId)
    );
    const layered = buildLayeredComponentLayout(componentNodes, componentEdges, config.preset);
    for (const beId of layered.backwardEdgeIds) allBackwardEdgeIds.add(beId);
    const placed =
      config.preset === "swimlane_category"
        ? placeSwimlaneComponent(
            nodeById,
            layered,
            spacing,
            { x: origin.x, y: clusterY },
            laneIndexByNodeId,
            laneBaseX,
            laneWidth
          )
        : config.preset === "decision_tree_tb" && isTreeLikeLayout(componentNodes, layered)
          ? placeTreeComponent(nodeById, layered, spacing, { x: origin.x, y: clusterY })
          : placeStandardComponent(nodeById, layered, config.preset, spacing, {
              x: origin.x,
              y: clusterY
            });

    placements.push(...placed.placements);
    clusterY += placed.bounds.height + spacing.clusterGap;
  }

  const beforeNodeMap = new Map(graph.nodes.map((node) => [node.id, node]));
  const afterNodeMap = getPlacedNodes(graph.nodes, placements);
  const crossingsBefore = countEstimatedCrossings(graph, beforeNodeMap, config.preset);
  const moderatePlans = buildConnectorPlans(graph, afterNodeMap, config, allBackwardEdgeIds);
  const crossingsAfterModerate = countEstimatedCrossings(graph, afterNodeMap, config.preset, moderatePlans);
  const crossingConnectorIds = getCrossingConnectorIds(graph, afterNodeMap, config.preset, moderatePlans);
  const resolvedMode = chooseRoutingMode(requestedMode, graph, crossingsAfterModerate, crossingConnectorIds);
  const crossingsAfter =
    resolvedMode === "aggressive" ? Math.max(0, crossingsAfterModerate - crossingConnectorIds.length / 2) : crossingsAfterModerate;

  return {
    placements,
    connectorPlans: moderatePlans,
    recreateConnectorIds: resolvedMode === "aggressive" ? crossingConnectorIds : [],
    summary: {
      moved: placements.length,
      skipped: 0
    },
    diagnostics: {
      componentCount: graph.components.length,
      detectedDecisions: graph.nodes.filter((node) => node.isDecision).length,
      crossingsReducedEstimate: Math.max(0, Math.round(crossingsBefore - crossingsAfter)),
      connectorsSkipped:
        graph.detachedConnectorCount +
        graph.edges.filter((edge) => edge.isAttached).length -
          (resolvedMode === "safe" ? 0 : moderatePlans.length),
      modeChosen: resolvedMode
    }
  };
};

export type { OrganizeInputConnector, OrganizeInputNode };


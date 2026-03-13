import type {
  ConnectorPathType,
  FigJamShapeType,
  LayoutPreset,
  LayoutRole,
  LegendSemanticRole,
  RoutingMode
} from "@shared/types";

export interface OrganizeInputNode {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  shapeType?: FigJamShapeType;
  categoryId?: string;
  semanticRole?: LegendSemanticRole;
  layoutRole?: LayoutRole;
}

export interface OrganizeInputConnector {
  id: string;
  sourceNodeId?: string;
  targetNodeId?: string;
  label?: string;
  pathType?: ConnectorPathType;
}

export interface OrganizeGraphNode extends OrganizeInputNode {
  attachedConnectorIds: string[];
  indegree: number;
  outdegree: number;
  isDecision: boolean;
  layoutRole: LayoutRole;
}

export interface OrganizeGraphEdge extends Omit<OrganizeInputConnector, "sourceNodeId" | "targetNodeId"> {
  sourceNodeId?: string;
  targetNodeId?: string;
  connectorId: string;
  isAttached: boolean;
  isAmbiguous: boolean;
}

export interface OrganizeGraphComponent {
  id: string;
  nodeIds: string[];
  edgeIds: string[];
}

export interface OrganizeGraph {
  nodes: OrganizeGraphNode[];
  edges: OrganizeGraphEdge[];
  components: OrganizeGraphComponent[];
  detachedConnectorCount: number;
  ambiguousConnectorCount: number;
  attachedConnectorCount: number;
}

const stableNodeSortLR = (nodes: readonly OrganizeInputNode[]): OrganizeInputNode[] =>
  [...nodes].sort((a, b) => a.x - b.x || a.y - b.y || a.id.localeCompare(b.id));

const stableNodeSortTB = (nodes: readonly OrganizeInputNode[]): OrganizeInputNode[] =>
  [...nodes].sort((a, b) => a.y - b.y || a.x - b.x || a.id.localeCompare(b.id));

export const getGeometryOrderedNodes = (
  nodes: readonly OrganizeInputNode[],
  preset: LayoutPreset
): OrganizeInputNode[] =>
  preset === "process_lr" ? stableNodeSortLR(nodes) : stableNodeSortTB(nodes);

export const extractOrganizeGraph = (
  nodes: readonly OrganizeInputNode[],
  connectors: readonly OrganizeInputConnector[]
): OrganizeGraph => {
  const nodeMap = new Map<string, OrganizeGraphNode>();
  for (const node of nodes) {
    const role: LayoutRole = node.layoutRole
      ?? (node.semanticRole === "decision" ? "decision"
        : node.semanticRole === "terminator" ? "entry"
        : node.semanticRole === "data" ? "io"
        : node.semanticRole === "annotation" ? "annotation"
        : node.shapeType === "DIAMOND" ? "decision"
        : "process");
    nodeMap.set(node.id, {
      ...node,
      attachedConnectorIds: [],
      indegree: 0,
      outdegree: 0,
      isDecision: role === "decision",
      layoutRole: role
    });
  }

  const edges: OrganizeGraphEdge[] = connectors.map((connector) => {
    const sourceNodeId =
      connector.sourceNodeId && nodeMap.has(connector.sourceNodeId) ? connector.sourceNodeId : undefined;
    const targetNodeId =
      connector.targetNodeId && nodeMap.has(connector.targetNodeId) ? connector.targetNodeId : undefined;
    const isAttached = Boolean(sourceNodeId && targetNodeId);
    const isAmbiguous = Boolean((sourceNodeId && !targetNodeId) || (!sourceNodeId && targetNodeId));

    if (sourceNodeId) {
      nodeMap.get(sourceNodeId)?.attachedConnectorIds.push(connector.id);
    }
    if (targetNodeId && targetNodeId !== sourceNodeId) {
      nodeMap.get(targetNodeId)?.attachedConnectorIds.push(connector.id);
    }
    if (sourceNodeId && targetNodeId) {
      nodeMap.get(sourceNodeId)!.outdegree += 1;
      nodeMap.get(targetNodeId)!.indegree += 1;
    }

    return {
      ...connector,
      sourceNodeId,
      targetNodeId,
      connectorId: connector.id,
      isAttached,
      isAmbiguous
    };
  });

  const adjacency = new Map<string, Set<string>>();
  for (const node of nodeMap.values()) {
    adjacency.set(node.id, new Set<string>());
  }
  for (const edge of edges) {
    if (!edge.isAttached || !edge.sourceNodeId || !edge.targetNodeId) {
      continue;
    }
    adjacency.get(edge.sourceNodeId)?.add(edge.targetNodeId);
    adjacency.get(edge.targetNodeId)?.add(edge.sourceNodeId);
  }

  const components: OrganizeGraphComponent[] = [];
  const visited = new Set<string>();
  for (const node of nodeMap.values()) {
    if (visited.has(node.id)) {
      continue;
    }

    const queue = [node.id];
    const componentNodeIds: string[] = [];
    visited.add(node.id);

    while (queue.length > 0) {
      const currentId = queue.shift()!;
      componentNodeIds.push(currentId);
      for (const nextId of adjacency.get(currentId) ?? []) {
        if (visited.has(nextId)) {
          continue;
        }
        visited.add(nextId);
        queue.push(nextId);
      }
    }

    const nodeIdSet = new Set(componentNodeIds);
    const edgeIds = edges
      .filter(
        (edge) =>
          (edge.sourceNodeId && nodeIdSet.has(edge.sourceNodeId)) ||
          (edge.targetNodeId && nodeIdSet.has(edge.targetNodeId))
      )
      .map((edge) => edge.id);

    componentNodeIds.sort((a, b) => {
      const left = nodeMap.get(a)!;
      const right = nodeMap.get(b)!;
      return left.y - right.y || left.x - right.x || left.id.localeCompare(right.id);
    });

    components.push({
      id: `component-${components.length + 1}`,
      nodeIds: componentNodeIds,
      edgeIds
    });
  }

  components.sort((a, b) => {
    const left = nodeMap.get(a.nodeIds[0])!;
    const right = nodeMap.get(b.nodeIds[0])!;
    return left.y - right.y || left.x - right.x || left.id.localeCompare(right.id);
  });

  return {
    nodes: [...nodeMap.values()],
    edges,
    components,
    attachedConnectorCount: edges.filter((edge) => edge.isAttached).length,
    detachedConnectorCount: edges.filter((edge) => !edge.isAttached).length,
    ambiguousConnectorCount: edges.filter((edge) => edge.isAmbiguous).length
  };
};

export interface BranchSideAssignment {
  connectorId: string;
  side: "left" | "right";
}

const RIGHT_LABEL_RE = /\b(yes|true|approve|approved|accept|accepted|go|pass)\b/i;
const LEFT_LABEL_RE = /\b(no|false|reject|rejected|deny|denied|stop|fail)\b/i;

export const getBranchPreferenceFromLabel = (label?: string): "left" | "right" | null => {
  if (!label) {
    return null;
  }
  if (RIGHT_LABEL_RE.test(label)) {
    return "right";
  }
  if (LEFT_LABEL_RE.test(label)) {
    return "left";
  }
  return null;
};

export const assignDecisionBranchSides = (
  decisionNode: OrganizeGraphNode,
  outgoingEdges: readonly OrganizeGraphEdge[],
  nodeById: ReadonlyMap<string, OrganizeGraphNode>,
  preset: LayoutPreset
): BranchSideAssignment[] => {
  const secondaryValue = (node: OrganizeGraphNode): number => (preset === "process_lr" ? node.y : node.x);
  const assignments = new Map<string, "left" | "right">();
  const remainingEdges = [...outgoingEdges].filter((edge) => edge.targetNodeId && nodeById.has(edge.targetNodeId));

  const labeled = remainingEdges
    .map((edge) => ({ edge, preferred: getBranchPreferenceFromLabel(edge.label) }))
    .filter((item): item is { edge: OrganizeGraphEdge; preferred: "left" | "right" } => item.preferred !== null);

  const reserved = new Set<"left" | "right">();
  for (const item of labeled) {
    if (reserved.has(item.preferred)) {
      continue;
    }
    assignments.set(item.edge.id, item.preferred);
    reserved.add(item.preferred);
  }

  const unlabeled = remainingEdges
    .filter((edge) => !assignments.has(edge.id))
    .sort((a, b) => {
      const targetA = nodeById.get(a.targetNodeId!)!;
      const targetB = nodeById.get(b.targetNodeId!)!;
      return secondaryValue(targetA) - secondaryValue(targetB) || targetA.id.localeCompare(targetB.id);
    });

  for (const edge of unlabeled) {
    const target = nodeById.get(edge.targetNodeId!)!;
    const fallback = secondaryValue(target) >= secondaryValue(decisionNode) ? "right" : "left";
    if (!reserved.has(fallback)) {
      assignments.set(edge.id, fallback);
      reserved.add(fallback);
      continue;
    }

    const alternate = fallback === "right" ? "left" : "right";
    assignments.set(edge.id, alternate);
    reserved.add(alternate);
  }

  return [...assignments.entries()].map(([connectorId, side]) => ({
    connectorId,
    side
  }));
};

const AUTO_AGGRESSIVE_THRESHOLD = 1;

export const chooseRoutingMode = (
  requestedMode: RoutingMode,
  graph: OrganizeGraph,
  remainingCrossings = 0,
  remainingCrossingConnectorIds: readonly string[] = []
): Exclude<RoutingMode, "auto"> => {
  if (requestedMode !== "auto") {
    return requestedMode;
  }

  if (graph.detachedConnectorCount > 0 || graph.ambiguousConnectorCount > 0) {
    return "safe";
  }

  if (
    remainingCrossings > AUTO_AGGRESSIVE_THRESHOLD &&
    remainingCrossingConnectorIds.length > 0 &&
    remainingCrossingConnectorIds.every((connectorId) => {
      const edge = graph.edges.find((item) => item.id === connectorId);
      return Boolean(edge?.isAttached && edge.sourceNodeId && edge.targetNodeId);
    })
  ) {
    return "aggressive";
  }

  return "moderate";
};

import { getConnectorNodes, getNodesInScope, isShapeNode } from "@core/common/selection";
import {
  computeOrganizeLayout,
  type OrganizeConnectorPlan,
  type OrganizeInputConnector,
  type OrganizeInputNode
} from "@core/organize/layout";
import type {
  ActionResult,
  ApplyScope,
  OrganizeConfig,
  OrganizeRunDiagnostics,
  LegacyPluginState
} from "@shared/types";

const rounded = (value: number): number => Math.round(value * 100) / 100;

const getConnectorLabel = (connector: ConnectorNode): string => {
  try {
    return connector.text.characters.trim();
  } catch {
    return "";
  }
};

const endpointToConnectorEndpoint = (
  endpoint: OrganizeConnectorPlan["start"],
  pathType: OrganizeConnectorPlan["pathType"]
): ConnectorEndpoint => {
  if (pathType === "STRAIGHT") {
    return {
      endpointNodeId: endpoint.endpointNodeId,
      magnet: "CENTER"
    };
  }

  if (endpoint.position) {
    return {
      endpointNodeId: endpoint.endpointNodeId,
      position: endpoint.position
    };
  }

  return {
    endpointNodeId: endpoint.endpointNodeId,
    magnet: endpoint.magnet ?? "AUTO"
  };
};

const fallbackEndpoint = (
  endpoint: OrganizeConnectorPlan["start"],
  pathType: OrganizeConnectorPlan["pathType"]
): ConnectorEndpoint => ({
  endpointNodeId: endpoint.endpointNodeId,
  magnet: pathType === "STRAIGHT" ? "CENTER" : endpoint.magnet ?? "AUTO"
});

const applyConnectorPlan = (
  connector: ConnectorNode,
  plan: OrganizeConnectorPlan,
  mode: OrganizeRunDiagnostics["modeChosen"]
): number => {
  connector.connectorLineType = plan.pathType;
  if (mode === "safe") {
    return 1;
  }

  try {
    connector.connectorStart = endpointToConnectorEndpoint(plan.start, plan.pathType);
  } catch {
    connector.connectorStart = fallbackEndpoint(plan.start, plan.pathType);
  }

  try {
    connector.connectorEnd = endpointToConnectorEndpoint(plan.end, plan.pathType);
  } catch {
    connector.connectorEnd = fallbackEndpoint(plan.end, plan.pathType);
  }

  return 1;
};

const cloneConnectorStyle = (
  source: ConnectorNode,
  target: ConnectorNode,
  plan: OrganizeConnectorPlan
): void => {
  target.strokes = source.strokes;
  target.strokeWeight = source.strokeWeight;
  target.opacity = source.opacity;
  target.dashPattern = [...source.dashPattern];
  target.connectorStartStrokeCap = source.connectorStartStrokeCap;
  target.connectorEndStrokeCap = source.connectorEndStrokeCap;
  target.connectorLineType = plan.pathType;
};

export const runOrganize = (
  state: LegacyPluginState,
  config: OrganizeConfig,
  scope: ApplyScope
): ActionResult => {
  const scopedNodes = getNodesInScope(scope);
  const shapes = scopedNodes.filter(isShapeNode);
  const connectors = getConnectorNodes(scopedNodes);
  const categoryById = new Map(state.categories.map((category) => [category.id, category]));

  const inputs: OrganizeInputNode[] = shapes.map((node) => {
    const categoryId = state.nodeCategoryAssignments[node.id];
    const category = categoryId ? categoryById.get(categoryId) : undefined;
    return {
      id: node.id,
      x: node.x,
      y: node.y,
      width: node.width,
      height: node.height,
      shapeType: node.shapeType,
      categoryId,
      semanticRole: category?.semanticRole ?? "process"
    };
  });

  const connectorInputs: OrganizeInputConnector[] = connectors.map((connector) => ({
    id: connector.id,
    sourceNodeId:
      "endpointNodeId" in connector.connectorStart ? connector.connectorStart.endpointNodeId ?? undefined : undefined,
    targetNodeId:
      "endpointNodeId" in connector.connectorEnd ? connector.connectorEnd.endpointNodeId ?? undefined : undefined,
    label: getConnectorLabel(connector),
    pathType: connector.connectorLineType
  }));

  const layout = computeOrganizeLayout(inputs, connectorInputs, config, state);

  let changed = 0;
  let skipped = 0;
  const shapeById = new Map(shapes.map((node) => [node.id, node]));
  const connectorById = new Map(connectors.map((connector) => [connector.id, connector]));

  for (const placement of layout.placements) {
    const target = shapeById.get(placement.nodeId);
    if (!target) {
      skipped += 1;
      continue;
    }

    const nextX = config.alignStrict ? Math.round(placement.x) : rounded(placement.x);
    const nextY = config.alignStrict ? Math.round(placement.y) : rounded(placement.y);

    if (target.x !== nextX || target.y !== nextY) {
      target.x = nextX;
      target.y = nextY;
      changed += 1;
    }
  }

  const recreatedConnectorIds = new Set(layout.recreateConnectorIds);
  for (const plan of layout.connectorPlans) {
    if (recreatedConnectorIds.has(plan.connectorId)) {
      continue;
    }

    const connector = connectorById.get(plan.connectorId);
    if (!connector) {
      skipped += 1;
      continue;
    }

    try {
      changed += applyConnectorPlan(connector, plan, layout.diagnostics.modeChosen);
    } catch {
      skipped += 1;
    }
  }

  if (layout.diagnostics.modeChosen === "aggressive") {
    for (const connectorId of layout.recreateConnectorIds) {
      const original = connectorById.get(connectorId);
      const plan = layout.connectorPlans.find((item) => item.connectorId === connectorId);
      if (!original || !plan) {
        skipped += 1;
        continue;
      }

      try {
        const replacement = figma.createConnector();
        cloneConnectorStyle(original, replacement, plan);
        replacement.connectorStart = endpointToConnectorEndpoint(plan.start, plan.pathType);
        replacement.connectorEnd = endpointToConnectorEndpoint(plan.end, plan.pathType);
        original.remove();
        changed += 1;
      } catch {
        skipped += 1;
      }
    }
  }

  const organizedCount = layout.placements.filter((placement) => shapeById.has(placement.nodeId)).length;
  return {
    action: "RUN_ORGANIZE",
    severity: changed > 0 ? "info" : "warning",
    message:
      changed > 0
        ? `Smart organize updated ${organizedCount} shape(s) using ${config.preset}.`
        : "No movable shapes found in scope.",
    changed,
    skipped,
    organizeDiagnostics: layout.diagnostics
  };
};


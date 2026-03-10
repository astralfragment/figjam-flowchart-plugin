import { getConnectorNodes, getNodesInScope, isShapeNode, uniqueById } from "@core/common/selection";
import { applyConnectorPresetToConnector } from "@core/connectors/applyConnectorStyle";
import { applyShapePresetToNode } from "@core/styles/applyShapeStyle";
import type { ActionResult, ApplyScope, LegendCategory, PluginStateV1 } from "@shared/types";

export const upsertCategory = (state: PluginStateV1, category: LegendCategory): PluginStateV1 => {
  const index = state.categories.findIndex((item) => item.id === category.id);
  if (index === -1) {
    return {
      ...state,
      categories: [...state.categories, category].sort(
        (a, b) => a.order - b.order || a.label.localeCompare(b.label)
      )
    };
  }

  const next = [...state.categories];
  next[index] = category;
  next.sort((a, b) => a.order - b.order || a.label.localeCompare(b.label));
  return {
    ...state,
    categories: next
  };
};

export const deleteCategory = (state: PluginStateV1, categoryId: string): PluginStateV1 => {
  const assignments = { ...state.nodeCategoryAssignments };
  for (const [nodeId, assignedCategory] of Object.entries(assignments)) {
    if (assignedCategory === categoryId) {
      delete assignments[nodeId];
    }
  }

  return {
    ...state,
    categories: state.categories.filter((category) => category.id !== categoryId),
    nodeCategoryAssignments: assignments
  };
};

export const assignCategoryToNodes = (
  state: PluginStateV1,
  categoryId: string,
  nodeIds: string[]
): PluginStateV1 => {
  const assignments = { ...state.nodeCategoryAssignments };

  for (const nodeId of nodeIds) {
    assignments[nodeId] = categoryId;
  }

  return {
    ...state,
    nodeCategoryAssignments: assignments
  };
};

const getConnectorNodeIds = (connector: ConnectorNode): string[] => {
  const ids: string[] = [];
  if (connector.connectorStart.endpointNodeId) {
    ids.push(connector.connectorStart.endpointNodeId);
  }

  if (connector.connectorEnd.endpointNodeId) {
    ids.push(connector.connectorEnd.endpointNodeId);
  }

  return ids;
};

export const applyLegendMapping = async (
  state: PluginStateV1,
  scope: ApplyScope
): Promise<ActionResult> => {
  const scopedNodes = getNodesInScope(scope);
  const shapeNodes = scopedNodes.filter(isShapeNode);

  let changed = 0;
  let skipped = 0;
  const styledNodeIds = new Set<string>();

  for (const node of shapeNodes) {
    const categoryId = state.nodeCategoryAssignments[node.id];
    if (!categoryId) {
      skipped += 1;
      continue;
    }

    const category = state.categories.find((item) => item.id === categoryId);
    const preset = state.shapePresets.find((item) => item.id === category?.shapePresetId);

    if (!category || !preset) {
      skipped += 1;
      continue;
    }

    try {
      changed += await applyShapePresetToNode(node, preset);
      styledNodeIds.add(node.id);
    } catch (_error) {
      skipped += 1;
    }
  }

  const connectorCandidates = getConnectorNodes(scopedNodes);
  const connectorsToStyle = uniqueById(
    connectorCandidates.filter((connector) => {
      const endpointIds = getConnectorNodeIds(connector);
      return endpointIds.some((id) => styledNodeIds.has(id));
    })
  );

  for (const connector of connectorsToStyle) {
    const endpointIds = getConnectorNodeIds(connector);
    const relevantCategories = endpointIds
      .map((id) => state.nodeCategoryAssignments[id])
      .filter((id): id is string => Boolean(id))
      .map((id) => state.categories.find((category) => category.id === id))
      .filter((category): category is LegendCategory => Boolean(category));

    relevantCategories.sort((a, b) => a.order - b.order || a.label.localeCompare(b.label));

    const connectorPresetId = relevantCategories.find((category) => category.connectorPresetId)?.connectorPresetId;
    if (!connectorPresetId) {
      continue;
    }

    const connectorPreset = state.connectorPresets.find((preset) => preset.id === connectorPresetId);
    if (!connectorPreset) {
      continue;
    }

    try {
      changed += applyConnectorPresetToConnector(connector, connectorPreset);
    } catch (_error) {
      skipped += 1;
    }
  }

  return {
    action: "APPLY_LEGEND_MAPPING",
    severity: changed > 0 ? "info" : "warning",
    message:
      changed > 0
        ? `Legend mapping applied. Updated ${changed} element(s).`
        : "No mapped shapes were found in the selected scope.",
    changed,
    skipped
  };
};


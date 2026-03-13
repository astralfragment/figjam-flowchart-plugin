import { getConnectorNodes, getNodesInScope, isShapeNode, uniqueById } from "@core/common/selection";
import { applyConnectorPresetToConnector } from "@core/connectors/applyConnectorStyle";
import { applyShapePresetToNode } from "@core/styles/applyShapeStyle";
import type { ActionResult, ApplyScope, LegendCategory, PluginStateV1 } from "@shared/types";

const sortCategories = (categories: LegendCategory[]): LegendCategory[] =>
  [...categories].sort((a, b) => a.order - b.order || a.label.localeCompare(b.label));

const normalizeCategoryOrders = (categories: LegendCategory[]): LegendCategory[] =>
  sortCategories(categories).map((category, index) => ({
    ...category,
    order: index + 1
  }));

export const upsertCategory = (state: PluginStateV1, category: LegendCategory): PluginStateV1 => {
  const index = state.categories.findIndex((item) => item.id === category.id);
  if (index === -1) {
    return {
      ...state,
      categories: normalizeCategoryOrders([...state.categories, category])
    };
  }

  const next = [...state.categories];
  next[index] = category;
  return {
    ...state,
    categories: normalizeCategoryOrders(next)
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
    categories: normalizeCategoryOrders(state.categories.filter((category) => category.id !== categoryId)),
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

export const unassignCategoryFromNodes = (state: PluginStateV1, nodeIds: string[]): PluginStateV1 => {
  if (nodeIds.length === 0) {
    return state;
  }

  const assignments = { ...state.nodeCategoryAssignments };
  for (const nodeId of nodeIds) {
    delete assignments[nodeId];
  }

  return {
    ...state,
    nodeCategoryAssignments: assignments
  };
};

export const moveCategory = (
  state: PluginStateV1,
  categoryId: string,
  direction: "up" | "down"
): PluginStateV1 => {
  const ordered = normalizeCategoryOrders(state.categories);
  const index = ordered.findIndex((category) => category.id === categoryId);
  if (index === -1) {
    return state;
  }

  const targetIndex = direction === "up" ? index - 1 : index + 1;
  if (targetIndex < 0 || targetIndex >= ordered.length) {
    return state;
  }

  const next = [...ordered];
  const [moving] = next.splice(index, 1);
  next.splice(targetIndex, 0, moving);

  return {
    ...state,
    categories: next.map((category, orderIndex) => ({
      ...category,
      order: orderIndex + 1
    }))
  };
};

const getConnectorNodeIds = (connector: ConnectorNode): string[] => {
  const ids: string[] = [];
  if ("endpointNodeId" in connector.connectorStart && connector.connectorStart.endpointNodeId) {
    ids.push(connector.connectorStart.endpointNodeId);
  }

  if ("endpointNodeId" in connector.connectorEnd && connector.connectorEnd.endpointNodeId) {
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


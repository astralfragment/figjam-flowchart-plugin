import { arrowCapToConnectorCap, hexToSolidPaint, lineStyleToDashPattern } from "@core/common/paint";
import { getConnectorNodes, getNodesInScope } from "@core/common/selection";
import type { ActionResult, ApplyScope, ConnectorStylePreset } from "@shared/types";

export const applyConnectorPresetToConnector = (
  connector: ConnectorNode,
  preset: ConnectorStylePreset
): number => {
  connector.strokes = [hexToSolidPaint(preset.stroke)];
  connector.strokeWeight = preset.strokeWidth;
  connector.opacity = preset.opacity;
  connector.dashPattern = lineStyleToDashPattern(preset.lineStyle);
  connector.connectorLineType = preset.pathType;
  connector.connectorStartStrokeCap = arrowCapToConnectorCap(preset.arrowStart);
  connector.connectorEndStrokeCap = arrowCapToConnectorCap(preset.arrowEnd);
  return 1;
};

export const applyConnectorPreset = (
  preset: ConnectorStylePreset,
  scope: ApplyScope
): ActionResult => {
  const nodes = getNodesInScope(scope);
  const connectors = getConnectorNodes(nodes);

  let changed = 0;
  let skipped = nodes.length - connectors.length;

  for (const connector of connectors) {
    try {
      changed += applyConnectorPresetToConnector(connector, preset);
    } catch (_error) {
      skipped += 1;
    }
  }

  return {
    action: "APPLY_CONNECTOR_PRESET",
    severity: changed > 0 ? "info" : "warning",
    message:
      changed > 0
        ? `Normalized ${changed} connector(s) using \"${preset.name}\".`
        : "No connectors found in scope.",
    changed,
    skipped
  };
};


import { getNodesInScope, isShapeNode } from "@core/common/selection";
import { computeOrganizeLayout, type OrganizeInputNode } from "@core/organize/layout";
import type { ActionResult, ApplyScope, OrganizeConfig, PluginStateV1 } from "@shared/types";

const rounded = (value: number): number => Math.round(value * 100) / 100;

export const runOrganize = (
  state: PluginStateV1,
  config: OrganizeConfig,
  scope: ApplyScope
): ActionResult => {
  const scopedNodes = getNodesInScope(scope);
  const shapes = scopedNodes.filter(isShapeNode);

  const inputs: OrganizeInputNode[] = shapes.map((node) => ({
    id: node.id,
    x: node.x,
    y: node.y,
    width: node.width,
    height: node.height
  }));

  const layout = computeOrganizeLayout(inputs, config, state);

  let changed = 0;
  let skipped = 0;

  for (const placement of layout.placements) {
    const target = shapes.find((node) => node.id === placement.nodeId);
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

  return {
    action: "RUN_ORGANIZE",
    severity: changed > 0 ? "info" : "warning",
    message:
      changed > 0
        ? `Organized ${changed} node(s) using ${config.preset}.`
        : "No movable shapes found in scope.",
    changed,
    skipped
  };
};

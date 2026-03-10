import { describe, expect, it } from "vitest";
import { computeOrganizeLayout } from "@core/organize/layout";
import type { PluginStateV1 } from "@shared/types";

const baseState: PluginStateV1 = {
  schemaVersion: 1,
  themeMode: "light",
  shapePresets: [],
  connectorPresets: [],
  categories: [
    { id: "cat-a", label: "A", order: 1, shapePresetId: "shape-a" },
    { id: "cat-b", label: "B", order: 2, shapePresetId: "shape-b" }
  ],
  nodeCategoryAssignments: {
    n1: "cat-a",
    n2: "cat-a",
    n3: "cat-b"
  }
};

const nodes = [
  { id: "n1", x: 100, y: 200, width: 120, height: 80 },
  { id: "n2", x: 90, y: 260, width: 120, height: 80 },
  { id: "n3", x: 300, y: 100, width: 120, height: 80 }
];

describe("computeOrganizeLayout", () => {
  it("is deterministic for process layout", () => {
    const a = computeOrganizeLayout(
      nodes,
      { preset: "process_lr", nodeGap: 80, laneGap: 200, alignStrict: true },
      baseState
    );
    const b = computeOrganizeLayout(
      nodes,
      { preset: "process_lr", nodeGap: 80, laneGap: 200, alignStrict: true },
      baseState
    );

    expect(a).toEqual(b);
    expect(a.placements).toHaveLength(3);
  });

  it("groups swimlanes by category order", () => {
    const result = computeOrganizeLayout(
      nodes,
      { preset: "swimlane_category", nodeGap: 80, laneGap: 200, alignStrict: true },
      baseState
    );

    const p1 = result.placements.find((item) => item.nodeId === "n1");
    const p3 = result.placements.find((item) => item.nodeId === "n3");

    expect(p1?.x).toBeLessThan(p3?.x ?? 0);
  });
});

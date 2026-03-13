import { describe, expect, it } from "vitest";
import { moveCategory, unassignCategoryFromNodes, upsertCategory } from "@core/legend/mapping";
import type { PluginStateV1 } from "@shared/types";

const baseState: PluginStateV1 = {
  schemaVersion: 1,
  themeMode: "light",
  shapePresets: [],
  connectorPresets: [],
  categories: [
    { id: "cat-1", label: "One", order: 1, shapePresetId: "shape-1", semanticRole: "process" },
    { id: "cat-2", label: "Two", order: 2, shapePresetId: "shape-2", semanticRole: "process" },
    { id: "cat-3", label: "Three", order: 3, shapePresetId: "shape-3", semanticRole: "process" }
  ],
  nodeCategoryAssignments: {
    nodeA: "cat-1",
    nodeB: "cat-2"
  }
};

describe("legend mapping helpers", () => {
  it("renumbers order values without gaps after category reorder", () => {
    const moved = moveCategory(baseState, "cat-3", "up");
    expect(moved.categories.map((category) => `${category.id}:${category.order}`)).toEqual([
      "cat-1:1",
      "cat-3:2",
      "cat-2:3"
    ]);
  });

  it("renumbers order values on upsert insert", () => {
    const updated = upsertCategory(baseState, {
      id: "cat-4",
      label: "Inserted",
      order: 2,
      shapePresetId: "shape-4",
      semanticRole: "decision"
    });

    expect(updated.categories.map((category) => category.order)).toEqual([1, 2, 3, 4]);
  });

  it("clears assignments for selected nodes", () => {
    const updated = unassignCategoryFromNodes(baseState, ["nodeA"]);
    expect(updated.nodeCategoryAssignments).toEqual({ nodeB: "cat-2" });
  });
});

import { describe, expect, it } from "vitest";
import { sanitizeBundle, sanitizeState } from "@core/persistence/schema";

describe("sanitizeState", () => {
  it("falls back to defaults for invalid shape presets", () => {
    const state = sanitizeState({
      schemaVersion: 1,
      shapePresets: [{ id: "", name: "Broken" }],
      connectorPresets: [],
      categories: [],
      nodeCategoryAssignments: {}
    });

    expect(state.shapePresets.length).toBe(1);
    expect(state.shapePresets[0].name).toBe("Process Node");
  });

  it("drops assignments for unknown categories", () => {
    const state = sanitizeState({
      schemaVersion: 1,
      shapePresets: [
        {
          id: "shape-1",
          name: "A",
          targetNodeTypes: ["SHAPE_WITH_TEXT"],
          fill: "#112233",
          stroke: "#112233",
          strokeWidth: 2,
          cornerRadius: 12,
          textColor: "#FFFFFF",
          textSize: 16,
          textWeight: 500,
          opacity: 1
        }
      ],
      connectorPresets: [
        {
          id: "conn-1",
          name: "B",
          stroke: "#112233",
          strokeWidth: 2,
          lineStyle: "solid",
          arrowStart: "none",
          arrowEnd: "triangle",
          opacity: 1
        }
      ],
      categories: [
        {
          id: "cat-1",
          label: "Category",
          order: 1,
          shapePresetId: "shape-1",
          connectorPresetId: "conn-1"
        }
      ],
      nodeCategoryAssignments: {
        nodeA: "cat-1",
        nodeB: "missing"
      }
    });

    expect(state.nodeCategoryAssignments).toEqual({ nodeA: "cat-1" });
  });

  it("normalizes alpha hex colors to opaque hex", () => {
    const state = sanitizeState({
      schemaVersion: 1,
      shapePresets: [
        {
          id: "shape-1",
          name: "Alpha Colors",
          targetNodeTypes: ["SHAPE_WITH_TEXT"],
          fill: "#11223399",
          stroke: "#44556688",
          strokeWidth: 2,
          cornerRadius: 12,
          textColor: "#77889977",
          textSize: 16,
          textWeight: 500,
          opacity: 1
        }
      ],
      connectorPresets: [],
      categories: [],
      nodeCategoryAssignments: {}
    });

    expect(state.shapePresets[0].fill).toBe("#112233");
    expect(state.shapePresets[0].stroke).toBe("#445566");
    expect(state.shapePresets[0].textColor).toBe("#778899");
  });
});

describe("sanitizeBundle", () => {
  it("rejects unsupported schema versions", () => {
    const bundle = sanitizeBundle({ schemaVersion: 2 });
    expect(bundle).toBeNull();
  });

  it("accepts schema version 1 bundles", () => {
    const bundle = sanitizeBundle({
      schemaVersion: 1,
      namespace: "legendflow.manager",
      exportedAt: "2026-03-02T00:00:00.000Z",
      shapePresets: [],
      connectorPresets: [],
      categories: []
    });

    expect(bundle?.schemaVersion).toBe(1);
    expect(bundle?.namespace).toBe("legendflow.manager");
  });
});

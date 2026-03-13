import { describe, expect, it } from "vitest";
import { migrateV1toV2, sanitizeBundle, sanitizeState, sanitizeStateV2 } from "@core/persistence/schema";
import { defaultState } from "@shared/defaults";
import type { PluginStateV1 } from "@shared/types";

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
          pathType: "CURVED",
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
          connectorPresetId: "conn-1",
          semanticRole: "decision"
        }
      ],
      nodeCategoryAssignments: {
        nodeA: "cat-1",
        nodeB: "missing"
      }
    });

    expect(state.nodeCategoryAssignments).toEqual({ nodeA: "cat-1" });
    expect(state.connectorPresets[0].pathType).toBe("CURVED");
    expect(state.categories[0].semanticRole).toBe("decision");
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

  it("fills semanticRole and pathType defaults for older schema data", () => {
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
      nodeCategoryAssignments: {}
    });

    expect(state.connectorPresets[0].pathType).toBe("ELBOWED");
    expect(state.categories[0].semanticRole).toBe("process");
  });
});

describe("V1 to V2 migration", () => {
  it("converts V1 state to V2 with schemaVersion 2", () => {
    const v1 = defaultState();
    const v2 = migrateV1toV2(v1);
    expect(v2.schemaVersion).toBe(2);
    expect(v2.shapeEntries.length).toBeGreaterThan(0);
  });

  it("maps semanticRole to layoutRole", () => {
    const v1: PluginStateV1 = {
      ...defaultState(),
      categories: [{
        id: "cat-1", label: "Decision", order: 1,
        shapePresetId: "preset-shape-default",
        connectorPresetId: "preset-connector-default",
        semanticRole: "decision"
      }]
    };
    const v2 = migrateV1toV2(v1);
    const decisionEntry = v2.shapeEntries.find(e => e.name === "Decision");
    expect(decisionEntry?.layoutRole).toBe("decision");
  });

  it("maps terminator role to entry", () => {
    const v1: PluginStateV1 = {
      ...defaultState(),
      categories: [{
        id: "cat-t", label: "Terminator", order: 1,
        shapePresetId: "preset-shape-default",
        semanticRole: "terminator"
      }]
    };
    const v2 = migrateV1toV2(v1);
    const entry = v2.shapeEntries.find(e => e.name === "Terminator");
    expect(entry?.layoutRole).toBe("entry");
  });

  it("maps data role to io", () => {
    const v1: PluginStateV1 = {
      ...defaultState(),
      categories: [{
        id: "cat-d", label: "Data", order: 1,
        shapePresetId: "preset-shape-default",
        semanticRole: "data"
      }]
    };
    const v2 = migrateV1toV2(v1);
    const entry = v2.shapeEntries.find(e => e.name === "Data");
    expect(entry?.layoutRole).toBe("io");
  });

  it("preserves themeMode", () => {
    const v1 = { ...defaultState(), themeMode: "dark" as const };
    const v2 = migrateV1toV2(v1);
    expect(v2.themeMode).toBe("dark");
  });

  it("migrates node assignments to shape assignments", () => {
    const v1: PluginStateV1 = {
      ...defaultState(),
      nodeCategoryAssignments: { "node-1": "category-process" }
    };
    const v2 = migrateV1toV2(v1);
    expect(v2.nodeAssignments.shape["node-1"]).toBeDefined();
  });
});

describe("sanitizeStateV2", () => {
  it("returns valid V2 state from raw object", () => {
    const v2 = sanitizeStateV2({
      schemaVersion: 2,
      themeMode: "dark",
      systemEntries: [],
      shapeEntries: [],
      nodeAssignments: { system: {}, shape: {} }
    });
    expect(v2.schemaVersion).toBe(2);
    expect(v2.themeMode).toBe("dark");
  });

  it("falls back to V2 defaults for missing fields", () => {
    const v2 = sanitizeStateV2({});
    expect(v2.schemaVersion).toBe(2);
    expect(v2.shapeEntries.length).toBeGreaterThan(0);
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

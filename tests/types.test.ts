import { describe, it, expect } from "vitest";
import type { LayoutRole, SystemLegendEntry, ShapeLegendEntry, PluginStateV2 } from "@shared/types";

describe("V2 type shapes", () => {
  it("LayoutRole includes all required values", () => {
    const roles: LayoutRole[] = [
      "entry", "exit", "process", "decision",
      "merge", "fork", "loop", "io",
      "manual", "subprocess", "annotation",
      "delay", "default"
    ];
    expect(roles).toHaveLength(13);
  });

  it("SystemLegendEntry has required fields", () => {
    const entry: SystemLegendEntry = {
      id: "sys-1", name: "Portal", order: 1,
      fill: "#6BA4D9", stroke: "#4A8BC2", strokeWidth: 2,
      textColor: "#FFFFFF", textSize: 16, textWeight: 600, opacity: 1,
      connectorStroke: "#6BA4D9", connectorWidth: 2,
      connectorLineStyle: "solid", connectorPathType: "ELBOWED",
      connectorArrowStart: "none", connectorArrowEnd: "triangle",
      connectorOpacity: 1
    };
    expect(entry.id).toBe("sys-1");
  });

  it("ShapeLegendEntry has layoutRole", () => {
    const entry: ShapeLegendEntry = {
      id: "shp-1", name: "Decision", order: 1,
      shapeType: "DIAMOND", layoutRole: "decision",
      fill: "#F0F4FA", stroke: "#6B88AA", strokeWidth: 2,
      textColor: "#10223A", textSize: 16, textWeight: 500, opacity: 1,
      connectorStroke: "#5C6B8A", connectorWidth: 2,
      connectorLineStyle: "solid", connectorPathType: "ELBOWED",
      connectorArrowStart: "none", connectorArrowEnd: "triangle",
      connectorOpacity: 1
    };
    expect(entry.layoutRole).toBe("decision");
  });
});

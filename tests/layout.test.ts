import { describe, expect, it } from "vitest";
import {
  assignDecisionBranchSides,
  chooseRoutingMode,
  extractOrganizeGraph
} from "@core/organize/graph";
import {
  buildLayeredComponentLayout,
  computeOrganizeLayout,
  countEstimatedCrossings
} from "@core/organize/layout";
import type { OrganizeGraphNode } from "@core/organize/graph";
import type { PluginStateV1 } from "@shared/types";

const baseState: PluginStateV1 = {
  schemaVersion: 1,
  themeMode: "light",
  shapePresets: [],
  connectorPresets: [
    {
      id: "conn-default",
      name: "Default",
      stroke: "#112233",
      strokeWidth: 2,
      lineStyle: "solid",
      pathType: "ELBOWED",
      arrowStart: "none",
      arrowEnd: "triangle",
      opacity: 1
    }
  ],
  categories: [
    { id: "cat-a", label: "A", order: 1, shapePresetId: "shape-a", connectorPresetId: "conn-default", semanticRole: "process" },
    { id: "cat-b", label: "B", order: 2, shapePresetId: "shape-b", connectorPresetId: "conn-default", semanticRole: "process" },
    { id: "cat-decision", label: "Decision", order: 3, shapePresetId: "shape-c", connectorPresetId: "conn-default", semanticRole: "decision" }
  ],
  nodeCategoryAssignments: {
    n1: "cat-a",
    n2: "cat-a",
    n3: "cat-b",
    "decision-role": "cat-decision"
  }
};

const baseConfig = {
  preset: "process_lr" as const,
  routingMode: "auto" as const,
  spacingMode: "balanced" as const,
  connectorHandling: "spread" as const,
  nodeGap: 80,
  laneGap: 200,
  alignStrict: true
};

const placementMap = (
  graphNodes: readonly OrganizeGraphNode[],
  placements: readonly { nodeId: string; x: number; y: number }[]
): Map<string, OrganizeGraphNode> =>
  new Map(
    graphNodes.map((node) => [
      node.id,
      {
        ...node,
        x: placements.find((placement) => placement.nodeId === node.id)?.x ?? node.x,
        y: placements.find((placement) => placement.nodeId === node.id)?.y ?? node.y
      }
    ])
  );

describe("extractOrganizeGraph", () => {
  it("returns correct components, degrees, and attached-edge metadata", () => {
    const graph = extractOrganizeGraph(
      [
        { id: "a", x: 0, y: 0, width: 120, height: 80 },
        { id: "b", x: 200, y: 0, width: 120, height: 80 },
        { id: "c", x: 600, y: 0, width: 120, height: 80 }
      ],
      [
        { id: "e1", sourceNodeId: "a", targetNodeId: "b", label: "flow" },
        { id: "e2", sourceNodeId: "c", label: "detached" }
      ]
    );

    expect(graph.components).toHaveLength(2);
    expect(graph.attachedConnectorCount).toBe(1);
    expect(graph.detachedConnectorCount).toBe(1);
    expect(graph.nodes.find((node) => node.id === "a")?.outdegree).toBe(1);
    expect(graph.nodes.find((node) => node.id === "b")?.indegree).toBe(1);
    expect(graph.edges.find((edge) => edge.id === "e1")?.isAttached).toBe(true);
    expect(graph.edges.find((edge) => edge.id === "e2")?.isAttached).toBe(false);
  });
});

describe("buildLayeredComponentLayout", () => {
  it("breaks one backward edge and preserves stable rankings", () => {
    const graph = extractOrganizeGraph(
      [
        { id: "a", x: 0, y: 0, width: 120, height: 80 },
        { id: "b", x: 200, y: 0, width: 120, height: 80 },
        { id: "c", x: 400, y: 0, width: 120, height: 80 }
      ],
      [
        { id: "ab", sourceNodeId: "a", targetNodeId: "b" },
        { id: "bc", sourceNodeId: "b", targetNodeId: "c" },
        { id: "ca", sourceNodeId: "c", targetNodeId: "a" }
      ]
    );

    const layout = buildLayeredComponentLayout(graph.nodes, graph.edges.filter((edge) => edge.isAttached), "process_lr");

    expect(layout.backwardEdgeIds).toEqual(["ca"]);
    expect(layout.layerByNodeId.get("a")).toBe(0);
    expect(layout.layerByNodeId.get("b")).toBe(1);
    expect(layout.layerByNodeId.get("c")).toBe(2);
  });
});

describe("computeOrganizeLayout", () => {
  it("is deterministic for process layout", () => {
    const nodes = [
      { id: "n1", x: 100, y: 200, width: 120, height: 80 },
      { id: "n2", x: 90, y: 260, width: 120, height: 80 },
      { id: "n3", x: 300, y: 100, width: 120, height: 80 }
    ];

    const a = computeOrganizeLayout(nodes, [], baseConfig, baseState);
    const b = computeOrganizeLayout(nodes, [], baseConfig, baseState);

    expect(a).toEqual(b);
    expect(a.placements).toHaveLength(3);
  });

  it("reduces crossings on a bow-tie graph compared with the input geometry", () => {
    const nodes = [
      { id: "a", x: 0, y: 0, width: 120, height: 80 },
      { id: "b", x: 0, y: 180, width: 120, height: 80 },
      { id: "c", x: 240, y: 180, width: 120, height: 80 },
      { id: "d", x: 240, y: 0, width: 120, height: 80 }
    ];
    const connectors = [
      { id: "ac", sourceNodeId: "a", targetNodeId: "c" },
      { id: "bd", sourceNodeId: "b", targetNodeId: "d" }
    ];

    const graph = extractOrganizeGraph(nodes, connectors);
    const baseline = countEstimatedCrossings(graph, new Map(graph.nodes.map((node) => [node.id, node])), "process_lr");
    const layout = computeOrganizeLayout(nodes, connectors, baseConfig, baseState);
    const reduced = countEstimatedCrossings(graph, placementMap(graph.nodes, layout.placements), "process_lr");

    expect(reduced).toBeLessThan(baseline);
  });

  it("detects decisions from both diamond nodes and semantic roles", () => {
    const graph = extractOrganizeGraph(
      [
        { id: "diamond", x: 0, y: 0, width: 120, height: 80, shapeType: "DIAMOND" },
        { id: "decision-role", x: 200, y: 0, width: 120, height: 80, semanticRole: "decision" }
      ],
      []
    );

    expect(graph.nodes.find((node) => node.id === "diamond")?.isDecision).toBe(true);
    expect(graph.nodes.find((node) => node.id === "decision-role")?.isDecision).toBe(true);
  });

  it("groups swimlanes by category order", () => {
    const result = computeOrganizeLayout(
      [
        { id: "n1", x: 100, y: 200, width: 120, height: 80, categoryId: "cat-a" },
        { id: "n2", x: 90, y: 260, width: 120, height: 80, categoryId: "cat-a" },
        { id: "n3", x: 300, y: 100, width: 120, height: 80, categoryId: "cat-b" }
      ],
      [],
      { ...baseConfig, preset: "swimlane_category" },
      baseState
    );

    const p1 = result.placements.find((item) => item.nodeId === "n1");
    const p3 = result.placements.find((item) => item.nodeId === "n3");

    expect(p1?.x).toBeLessThan(p3?.x ?? 0);
  });

  it("uses a centered tree layout for decision-tree preset on tree-like graphs", () => {
    const result = computeOrganizeLayout(
      [
        { id: "root", x: 100, y: 0, width: 120, height: 80, shapeType: "DIAMOND" },
        { id: "left", x: 0, y: 220, width: 120, height: 80 },
        { id: "right", x: 240, y: 220, width: 120, height: 80 }
      ],
      [
        { id: "root-left", sourceNodeId: "root", targetNodeId: "left", label: "no" },
        { id: "root-right", sourceNodeId: "root", targetNodeId: "right", label: "yes" }
      ],
      { ...baseConfig, preset: "decision_tree_tb", connectorHandling: "tree" },
      baseState
    );

    const root = result.placements.find((item) => item.nodeId === "root");
    const left = result.placements.find((item) => item.nodeId === "left");
    const right = result.placements.find((item) => item.nodeId === "right");

    expect(root?.y).toBeLessThan(left?.y ?? 0);
    expect(root?.x).toBeGreaterThan((left?.x ?? 0) - 1);
    expect(root?.x).toBeLessThan((right?.x ?? 0) + 1);
  });
});

describe("decision routing helpers", () => {
  it("maps yes/right and no/left labels correctly", () => {
    const graph = extractOrganizeGraph(
      [
        { id: "decision", x: 0, y: 0, width: 120, height: 80, shapeType: "DIAMOND" },
        { id: "yes", x: 240, y: 160, width: 120, height: 80 },
        { id: "no", x: 240, y: 0, width: 120, height: 80 }
      ],
      [
        { id: "yes-edge", sourceNodeId: "decision", targetNodeId: "yes", label: "yes" },
        { id: "no-edge", sourceNodeId: "decision", targetNodeId: "no", label: "reject" }
      ]
    );
    const decision = graph.nodes.find((node) => node.id === "decision")!;
    const assignments = assignDecisionBranchSides(decision, graph.edges, new Map(graph.nodes.map((node) => [node.id, node])), "process_lr");

    expect(assignments.find((item) => item.connectorId === "yes-edge")?.side).toBe("right");
    expect(assignments.find((item) => item.connectorId === "no-edge")?.side).toBe("left");
  });
});

describe("chooseRoutingMode", () => {
  it("chooses safe, moderate, and aggressive under the intended preconditions", () => {
    const safeGraph = extractOrganizeGraph(
      [{ id: "a", x: 0, y: 0, width: 120, height: 80 }],
      [{ id: "dangling", sourceNodeId: "a" }]
    );
    expect(chooseRoutingMode("auto", safeGraph)).toBe("safe");

    const moderateGraph = extractOrganizeGraph(
      [
        { id: "a", x: 0, y: 0, width: 120, height: 80 },
        { id: "b", x: 240, y: 0, width: 120, height: 80 }
      ],
      [{ id: "ab", sourceNodeId: "a", targetNodeId: "b" }]
    );
    expect(chooseRoutingMode("auto", moderateGraph)).toBe("moderate");
    expect(chooseRoutingMode("auto", moderateGraph, 2, ["ab"])).toBe("aggressive");
  });
});

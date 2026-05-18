# LegendFlow Full Overhaul — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the 3-concept model (style presets + connector presets + categories) with a unified legend-driven model, fix connector spaghetti via enhanced Sugiyama pipeline, and redesign the UI from 4 tabs to 2 guided tabs.

**Architecture:** Unified legend with two dimensions (systems by color, shapes by role). Each legend entry owns its full style definition. Layout roles drive semantic-aware organize algorithm with dummy nodes, 12-pass crossing reduction, and angle-based port assignment.

**Tech Stack:** TypeScript, React 18, Vite, Esbuild, Vitest, FigJam Plugin API

---

## Task 1: New Type Definitions

**Files:**
- Modify: `src/shared/types.ts`

**Step 1: Write failing test for new types**

```bash
npx vitest run tests/schema.test.ts -t "LayoutRole"
```

Create `tests/types.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import type { LayoutRole, SystemLegendEntry, ShapeLegendEntry, PluginStateV2 } from "@shared/types";

describe("V2 type shapes", () => {
  it("LayoutRole includes all required values", () => {
    const roles: LayoutRole[] = [
      "entry", "exit", "process", "decision", "merge",
      "fork", "loop", "io", "manual", "subprocess",
      "annotation", "delay", "default"
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
```

**Step 2: Run test to verify it fails**

```bash
npx vitest run tests/types.test.ts
```
Expected: FAIL — types don't exist yet

**Step 3: Implement new types in `src/shared/types.ts`**

Add after the existing `LegendSemanticRole` type:

```typescript
export type LayoutRole =
  | "entry" | "exit" | "process" | "decision"
  | "merge" | "fork" | "loop" | "io"
  | "manual" | "subprocess" | "annotation"
  | "delay" | "default";

export type LayoutPresetV2 = "flow_lr" | "flow_tb" | "tree" | "swimlane" | "compact";

export type ConnectorStyleOption = "clean" | "smooth" | "direct";

export interface ConnectorStyleFields {
  connectorStroke: string;
  connectorWidth: number;
  connectorLineStyle: ConnectorLineStyle;
  connectorPathType: ConnectorPathType;
  connectorArrowStart: ArrowCap;
  connectorArrowEnd: ArrowCap;
  connectorOpacity: number;
}

export interface SystemLegendEntry extends ConnectorStyleFields {
  id: string;
  name: string;
  order: number;
  fill: string;
  stroke: string;
  strokeWidth: number;
  textColor: string;
  textSize: number;
  textWeight: number;
  opacity: number;
}

export interface ShapeLegendEntry extends ConnectorStyleFields {
  id: string;
  name: string;
  order: number;
  shapeType: FigJamShapeType;
  layoutRole: LayoutRole;
  fill: string;
  stroke: string;
  strokeWidth: number;
  textColor: string;
  textSize: number;
  textWeight: number;
  opacity: number;
}

export interface NodeAssignments {
  system: Record<string, string>;
  shape: Record<string, string>;
}

export interface OrganizeConfigV2 {
  preset: LayoutPresetV2;
  spacingValue: number; // 0-100 slider, 0=compact, 50=balanced, 100=spacious
  connectorStyle: ConnectorStyleOption;
  nodeGap: number;
  laneGap: number;
  alignStrict: boolean;
  autoFixCrossings: boolean;
}

export interface PluginStateV2 {
  schemaVersion: 2;
  themeMode: ThemeMode;
  systemEntries: SystemLegendEntry[];
  shapeEntries: ShapeLegendEntry[];
  nodeAssignments: NodeAssignments;
}

export interface PresetBundleV2 {
  schemaVersion: 2;
  namespace: string;
  exportedAt: string;
  systemEntries: SystemLegendEntry[];
  shapeEntries: ShapeLegendEntry[];
}

export interface DiagramScanResult {
  shapeCount: number;
  connectorCount: number;
  shapeTypeCounts: Record<string, number>;
  colorGroupCounts: Record<string, number>;
  mappedCount: number;
  unmappedCount: number;
  crossingCount: number;
}

export interface OrganizeDiagnosticsV2 {
  componentCount: number;
  decisionsDetected: number;
  mergesDetected: number;
  forksDetected: number;
  crossingsBefore: number;
  crossingsAfter: number;
  crossingReductionPercent: number;
  connectorsProcessed: number;
}

export interface SelectionSummaryV2 {
  total: number;
  shapes: number;
  connectors: number;
  systemAssignedCount: number;
  shapeAssignedCount: number;
  unmappedCount: number;
  systemBreakdown: { entryId: string; name: string; count: number }[];
  shapeBreakdown: { entryId: string; name: string; role: LayoutRole; count: number }[];
}
```

Keep all V1 types intact for migration support.

**Step 4: Run test to verify it passes**

```bash
npx vitest run tests/types.test.ts
```
Expected: PASS

**Step 5: Commit**

```bash
git add src/shared/types.ts tests/types.test.ts
git commit -m "feat: add V2 type definitions for unified legend model"
```

---

## Task 2: Default V2 State & Constants

**Files:**
- Modify: `src/shared/defaults.ts`

**Step 1: Write test**

Add to `tests/types.test.ts`:

```typescript
import { defaultStateV2, DEFAULT_SHAPE_ENTRIES, DEFAULT_SYSTEM_ENTRIES, LAYOUT_ROLE_DESCRIPTIONS } from "@shared/defaults";

describe("V2 defaults", () => {
  it("provides default shape entries for standard flowchart types", () => {
    expect(DEFAULT_SHAPE_ENTRIES.length).toBeGreaterThanOrEqual(6);
    const roles = DEFAULT_SHAPE_ENTRIES.map(e => e.layoutRole);
    expect(roles).toContain("process");
    expect(roles).toContain("decision");
    expect(roles).toContain("entry");
  });

  it("provides layout role descriptions for guidance UI", () => {
    expect(LAYOUT_ROLE_DESCRIPTIONS.decision).toContain("branch");
  });

  it("defaultStateV2 returns schemaVersion 2", () => {
    const state = defaultStateV2();
    expect(state.schemaVersion).toBe(2);
    expect(state.shapeEntries.length).toBeGreaterThan(0);
  });
});
```

**Step 2: Run test — expect FAIL**

```bash
npx vitest run tests/types.test.ts
```

**Step 3: Implement defaults**

Add to `src/shared/defaults.ts`:

```typescript
import type { LayoutRole, PluginStateV2, ShapeLegendEntry, SystemLegendEntry } from "./types";

export const LAYOUT_ROLE_DESCRIPTIONS: Record<LayoutRole, string> = {
  entry: "Flow start — pinned to first position",
  exit: "Flow end — pinned to last position",
  process: "Sequential step — standard inline flow",
  decision: "Branch point — yes/no branches auto-routed to sides",
  merge: "Convergence — multiple paths join into one",
  fork: "Parallel split — equal-weight outgoing paths",
  loop: "Back-edge aware — return connectors routed outside flow",
  io: "Data flow — offset from main column",
  manual: "Manual step — same as process",
  subprocess: "Collapsed sub-process — weighted heavier in layout",
  annotation: "Note — floated near connected node, outside flow",
  delay: "Wait — extra spacing before this node",
  default: "Standard — treated as process"
};

export const DEFAULT_SHAPE_ENTRIES: ShapeLegendEntry[] = [
  {
    id: "shape-entry-start-end", name: "START / END", order: 1,
    shapeType: "ELLIPSE", layoutRole: "entry",
    fill: "#F0F4FA", stroke: "#6B88AA", strokeWidth: 2,
    textColor: "#10223A", textSize: 16, textWeight: 600, opacity: 1,
    connectorStroke: "#5C6B8A", connectorWidth: 2,
    connectorLineStyle: "solid", connectorPathType: "ELBOWED",
    connectorArrowStart: "none", connectorArrowEnd: "triangle", connectorOpacity: 1
  },
  {
    id: "shape-entry-process", name: "Process", order: 2,
    shapeType: "ROUNDED_RECTANGLE", layoutRole: "process",
    fill: "#F0F4FA", stroke: "#6B88AA", strokeWidth: 2,
    textColor: "#10223A", textSize: 16, textWeight: 500, opacity: 1,
    connectorStroke: "#5C6B8A", connectorWidth: 2,
    connectorLineStyle: "solid", connectorPathType: "ELBOWED",
    connectorArrowStart: "none", connectorArrowEnd: "triangle", connectorOpacity: 1
  },
  {
    id: "shape-entry-decision", name: "Choice", order: 3,
    shapeType: "DIAMOND", layoutRole: "decision",
    fill: "#F0F4FA", stroke: "#6B88AA", strokeWidth: 2,
    textColor: "#10223A", textSize: 16, textWeight: 500, opacity: 1,
    connectorStroke: "#5C6B8A", connectorWidth: 2,
    connectorLineStyle: "solid", connectorPathType: "ELBOWED",
    connectorArrowStart: "none", connectorArrowEnd: "triangle", connectorOpacity: 1
  },
  {
    id: "shape-entry-io", name: "Input / Output", order: 4,
    shapeType: "PARALLELOGRAM_RIGHT", layoutRole: "io",
    fill: "#F0F4FA", stroke: "#6B88AA", strokeWidth: 2,
    textColor: "#10223A", textSize: 16, textWeight: 500, opacity: 1,
    connectorStroke: "#5C6B8A", connectorWidth: 2,
    connectorLineStyle: "solid", connectorPathType: "ELBOWED",
    connectorArrowStart: "none", connectorArrowEnd: "triangle", connectorOpacity: 1
  },
  {
    id: "shape-entry-manual-process", name: "Manual Process", order: 5,
    shapeType: "TRAPEZOID", layoutRole: "manual",
    fill: "#F0F4FA", stroke: "#6B88AA", strokeWidth: 2,
    textColor: "#10223A", textSize: 16, textWeight: 500, opacity: 1,
    connectorStroke: "#5C6B8A", connectorWidth: 2,
    connectorLineStyle: "solid", connectorPathType: "ELBOWED",
    connectorArrowStart: "none", connectorArrowEnd: "triangle", connectorOpacity: 1
  },
  {
    id: "shape-entry-manual-input", name: "Manual Input", order: 6,
    shapeType: "MANUAL_INPUT", layoutRole: "manual",
    fill: "#F0F4FA", stroke: "#6B88AA", strokeWidth: 2,
    textColor: "#10223A", textSize: 16, textWeight: 500, opacity: 1,
    connectorStroke: "#5C6B8A", connectorWidth: 2,
    connectorLineStyle: "solid", connectorPathType: "ELBOWED",
    connectorArrowStart: "none", connectorArrowEnd: "triangle", connectorOpacity: 1
  },
  {
    id: "shape-entry-merge", name: "Merge", order: 7,
    shapeType: "ELLIPSE", layoutRole: "merge",
    fill: "#F0F4FA", stroke: "#6B88AA", strokeWidth: 2,
    textColor: "#10223A", textSize: 16, textWeight: 500, opacity: 1,
    connectorStroke: "#5C6B8A", connectorWidth: 2,
    connectorLineStyle: "solid", connectorPathType: "ELBOWED",
    connectorArrowStart: "none", connectorArrowEnd: "triangle", connectorOpacity: 1
  },
  {
    id: "shape-entry-fork", name: "Fork", order: 8,
    shapeType: "SQUARE", layoutRole: "fork",
    fill: "#F0F4FA", stroke: "#6B88AA", strokeWidth: 2,
    textColor: "#10223A", textSize: 16, textWeight: 500, opacity: 1,
    connectorStroke: "#5C6B8A", connectorWidth: 2,
    connectorLineStyle: "solid", connectorPathType: "ELBOWED",
    connectorArrowStart: "none", connectorArrowEnd: "triangle", connectorOpacity: 1
  }
];

export const DEFAULT_SYSTEM_ENTRIES: SystemLegendEntry[] = [];

export const defaultStateV2 = (): PluginStateV2 => ({
  schemaVersion: 2,
  themeMode: "light",
  systemEntries: [...DEFAULT_SYSTEM_ENTRIES],
  shapeEntries: DEFAULT_SHAPE_ENTRIES.map(e => ({ ...e })),
  nodeAssignments: { system: {}, shape: {} }
});
```

**Step 4: Run tests — expect PASS**

```bash
npx vitest run tests/types.test.ts
```

**Step 5: Commit**

```bash
git add src/shared/defaults.ts tests/types.test.ts
git commit -m "feat: add V2 default state with shape entries and layout role descriptions"
```

---

## Task 3: V1 → V2 State Migration

**Files:**
- Modify: `src/core/persistence/schema.ts`
- Test: `tests/schema.test.ts`

**Step 1: Write migration tests**

Add to `tests/schema.test.ts`:

```typescript
import { migrateV1toV2 } from "@core/persistence/schema";
import type { PluginStateV1 } from "@shared/types";
import { defaultState } from "@shared/defaults";

describe("V1 to V2 migration", () => {
  it("converts shape presets + categories into shape entries", () => {
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

  it("splits nodeCategoryAssignments into system and shape", () => {
    const v1: PluginStateV1 = {
      ...defaultState(),
      nodeCategoryAssignments: { "node-1": "category-process" }
    };
    const v2 = migrateV1toV2(v1);
    // V1 categories become shape entries by default
    expect(Object.keys(v2.nodeAssignments.shape).length +
           Object.keys(v2.nodeAssignments.system).length).toBeGreaterThanOrEqual(0);
  });

  it("preserves themeMode", () => {
    const v1 = { ...defaultState(), themeMode: "dark" as const };
    const v2 = migrateV1toV2(v1);
    expect(v2.themeMode).toBe("dark");
  });
});
```

**Step 2: Run test — expect FAIL**

```bash
npx vitest run tests/schema.test.ts
```

**Step 3: Implement migration in `src/core/persistence/schema.ts`**

Add `migrateV1toV2` function that:
- For each V1 category with a `semanticRole`, create a `ShapeLegendEntry` merging the referenced shape preset + connector preset + role
- Map `semanticRole` to `layoutRole` (terminator → entry, data → io, etc.)
- Categories without semanticRole that have distinct fill colors become `SystemLegendEntry`
- Split `nodeCategoryAssignments` based on whether the category became a system or shape entry
- Preserve themeMode

Also add `sanitizeStateV2` function for V2 state validation.

**Step 4: Run tests — expect PASS**

```bash
npx vitest run tests/schema.test.ts
```

**Step 5: Commit**

```bash
git add src/core/persistence/schema.ts tests/schema.test.ts
git commit -m "feat: add V1 to V2 state migration and V2 sanitization"
```

---

## Task 4: Enhanced Crossing Reduction (Core Algorithm)

**Files:**
- Modify: `src/core/organize/layout.ts:276-332` (crossing reduction section)
- Test: `tests/layout.test.ts`

**Step 1: Write tests for improved crossing reduction**

Add to `tests/layout.test.ts`:

```typescript
describe("enhanced crossing reduction", () => {
  it("reduces crossings with 12 passes vs 2", () => {
    // Create a graph with known crossings
    const nodes = createTestNodes(8);  // helper that creates nodes
    const edges = createCrossingEdges(nodes); // edges that cross
    const layout2pass = buildLayeredComponentLayout(nodes, edges, "flow_tb", { sweepPasses: 2 });
    const layout12pass = buildLayeredComponentLayout(nodes, edges, "flow_tb", { sweepPasses: 12 });
    const crossings2 = countLayerCrossings(layout2pass);
    const crossings12 = countLayerCrossings(layout12pass);
    expect(crossings12).toBeLessThanOrEqual(crossings2);
  });

  it("adjacent exchange improves ordering after barycenter", () => {
    // Test that adjacent swap reduces crossings further
  });

  it("median heuristic provides alternative ordering", () => {
    // Test that median is tried alongside barycenter
  });
});
```

**Step 2: Run — expect FAIL**

**Step 3: Implement in `src/core/organize/layout.ts`**

Replace the 2-pass barycenter loop (lines 297-332) with:

1. **Increase to 12 passes** with best-permutation tracking
2. **Add `computeMedian` function** alongside `computeBarycenter`
3. **Add `adjacentExchange` function**: for each adjacent pair in a layer, test swap, keep if fewer crossings
4. **Add `countLayerCrossings` function**: inversion-count based O(E log V) crossing counter
5. Run both barycenter and median, keep whichever produces fewer crossings
6. After each sweep pass, run adjacent exchange

**Step 4: Run tests — expect PASS**

**Step 5: Commit**

```bash
git add src/core/organize/layout.ts tests/layout.test.ts
git commit -m "feat: 12-pass crossing reduction with median + adjacent exchange"
```

---

## Task 5: Dummy Node Insertion

**Files:**
- Modify: `src/core/organize/layout.ts`
- Test: `tests/layout.test.ts`

**Step 1: Write tests**

```typescript
describe("dummy node insertion", () => {
  it("inserts dummy nodes for edges spanning 2+ layers", () => {
    // Edge from layer 0 to layer 3 should get 2 dummy nodes at layers 1 and 2
    const nodes = [nodeAtLayer(0), nodeAtLayer(3)];
    const edges = [{ id: "e1", sourceNodeId: nodes[0].id, targetNodeId: nodes[1].id }];
    const result = insertDummyNodes(layered);
    expect(result.dummyNodes.length).toBe(2);
  });

  it("dummy nodes participate in crossing minimization", () => {
    // With dummy nodes, crossing count should be lower
  });

  it("dummy nodes are removed after layout", () => {
    // Final placements should not contain dummy node IDs
  });
});
```

**Step 2: Run — expect FAIL**

**Step 3: Implement dummy node insertion**

Add to `src/core/organize/layout.ts`:

```typescript
interface DummyNode {
  id: string;
  originalEdgeId: string;
  layer: number;
  width: number;
  height: number;
}

const insertDummyNodes = (
  layered: LayeredComponentLayout,
  nodeById: Map<string, OrganizeGraphNode>
): { layers: string[][]; dummyNodes: DummyNode[]; expandedEdges: OrganizeGraphEdge[] } => {
  const dummyNodes: DummyNode[] = [];
  const expandedEdges: OrganizeGraphEdge[] = [];
  const newLayers = layered.layers.map(layer => [...layer]);

  for (const edge of layered.dagEdges) {
    if (!edge.sourceNodeId || !edge.targetNodeId) continue;
    const sourceLayer = layered.layerByNodeId.get(edge.sourceNodeId) ?? 0;
    const targetLayer = layered.layerByNodeId.get(edge.targetNodeId) ?? 0;
    const span = targetLayer - sourceLayer;

    if (span <= 1) {
      expandedEdges.push(edge);
      continue;
    }

    // Insert dummy nodes at each intermediate layer
    let prevNodeId = edge.sourceNodeId;
    for (let layer = sourceLayer + 1; layer < targetLayer; layer++) {
      const dummyId = `dummy-${edge.id}-L${layer}`;
      dummyNodes.push({
        id: dummyId,
        originalEdgeId: edge.id,
        layer,
        width: 1, // minimal width
        height: 1
      });
      newLayers[layer].push(dummyId);
      expandedEdges.push({
        id: `${edge.id}-seg-${layer}`,
        sourceNodeId: prevNodeId,
        targetNodeId: dummyId,
        isAttached: true,
        isAmbiguous: false
      });
      prevNodeId = dummyId;
    }
    // Final segment to real target
    expandedEdges.push({
      id: `${edge.id}-seg-final`,
      sourceNodeId: prevNodeId,
      targetNodeId: edge.targetNodeId,
      isAttached: true,
      isAmbiguous: false
    });
  }

  return { layers: newLayers, dummyNodes, expandedEdges };
};
```

Integrate into `buildLayeredComponentLayout` — insert dummies before crossing reduction, remove after.

**Step 4: Run tests — expect PASS**

**Step 5: Commit**

```bash
git add src/core/organize/layout.ts tests/layout.test.ts
git commit -m "feat: dummy node insertion for long-span edges in crossing reduction"
```

---

## Task 6: Role-Aware Graph Extraction

**Files:**
- Modify: `src/core/organize/graph.ts`
- Test: `tests/layout.test.ts`

**Step 1: Write tests**

```typescript
describe("role-aware graph extraction", () => {
  it("assigns layoutRole from shapeEntries mapping", () => {
    const node = { id: "n1", shapeType: "DIAMOND" };
    const shapeEntries = [{ shapeType: "DIAMOND", layoutRole: "decision" }];
    const graph = extractOrganizeGraphV2(nodes, connectors, shapeEntries, assignments);
    expect(graph.nodes[0].layoutRole).toBe("decision");
  });

  it("identifies entry nodes (layoutRole entry)", () => {
    // Nodes with entry role should be flagged
  });

  it("identifies merge nodes (indegree > 1, layoutRole merge)", () => {
    // Nodes with merge role
  });

  it("identifies fork nodes (layoutRole fork)", () => {
    // Nodes with fork role
  });
});
```

**Step 2: Run — expect FAIL**

**Step 3: Implement**

Update `OrganizeGraphNode` to use `layoutRole: LayoutRole` instead of `isDecision: boolean`. Update `extractOrganizeGraph` to accept `ShapeLegendEntry[]` and `NodeAssignments` and resolve layout roles from legend mapping.

Key changes:
- Replace `isDecision` with `layoutRole`
- Add `isEntry`, `isExit`, `isMerge`, `isFork` computed from layoutRole
- Resolve role from: (1) node's assigned shape entry, (2) shape type default mapping, (3) fallback to "default"

**Step 4: Run tests — expect PASS**

**Step 5: Commit**

```bash
git add src/core/organize/graph.ts tests/layout.test.ts
git commit -m "feat: role-aware graph extraction using legend shape entries"
```

---

## Task 7: Role-Aware Layout (Entry/Exit Pinning, Decision Spacing, Fork Parallel)

**Files:**
- Modify: `src/core/organize/layout.ts`
- Test: `tests/layout.test.ts`

**Step 1: Write tests**

```typescript
describe("role-aware placement", () => {
  it("pins entry nodes to layer 0", () => {
    // Entry-role node should be at first layer
  });

  it("pins exit nodes to last layer", () => {
    // Exit-role node should be at last layer
  });

  it("gives decision nodes 2x horizontal space", () => {
    // Decision nodes should have wider spacing
  });

  it("excludes annotation nodes from main flow", () => {
    // Annotation nodes should not appear in layers
  });
});
```

**Step 2: Run — expect FAIL**

**Step 3: Implement**

Modify layer assignment to:
1. Force entry-role nodes to layer 0
2. Force exit-role nodes to max layer
3. Exclude annotation-role nodes from layering
4. In `placeStandardComponent`: allocate 2x `nodeGap` for decision nodes
5. After main layout: position annotation nodes adjacent to their connected node

**Step 4: Run tests — expect PASS**

**Step 5: Commit**

```bash
git add src/core/organize/layout.ts tests/layout.test.ts
git commit -m "feat: role-aware layout with entry/exit pinning and decision spacing"
```

---

## Task 8: Angle-Based Port Assignment

**Files:**
- Modify: `src/core/organize/layout.ts:644-692` (allocateSidePorts)
- Test: `tests/layout.test.ts`

**Step 1: Write tests**

```typescript
describe("angle-based port assignment", () => {
  it("sorts outgoing ports by angle to target center", () => {
    // Ports should be ordered by angle, not just secondary axis
  });

  it("enforces minimum port gap of 10px", () => {
    // Ports should not be closer than 10px
  });

  it("assigns merge node incoming ports symmetrically", () => {
    // Mirror of decision outgoing logic
  });
});
```

**Step 2: Run — expect FAIL**

**Step 3: Implement**

Replace the secondary-axis sort in `allocateSidePorts` with angle-based sorting:

```typescript
const angleToTarget = (source: OrganizeGraphNode, target: OrganizeGraphNode): number => {
  const sc = getNodeCenter(source);
  const tc = getNodeCenter(target);
  return Math.atan2(tc.y - sc.y, tc.x - sc.x);
};
```

Sort edges by `angleToTarget` instead of `getSecondaryValue`. Add minimum port gap enforcement (skip slots that would be < 10px apart).

Add merge-node logic: mirror of decision branch sides, but for incoming edges.

**Step 4: Run tests — expect PASS**

**Step 5: Commit**

```bash
git add src/core/organize/layout.ts tests/layout.test.ts
git commit -m "feat: angle-based port assignment with minimum gap enforcement"
```

---

## Task 9: Back-Edge Routing

**Files:**
- Modify: `src/core/organize/layout.ts`
- Test: `tests/layout.test.ts`

**Step 1: Write tests**

```typescript
describe("back-edge routing", () => {
  it("routes loop back-edges around the outside of the flow", () => {
    // Back-edge should use LEFT or RIGHT magnet, not through center
  });
});
```

**Step 2: Run — expect FAIL**

**Step 3: Implement**

In `buildConnectorPlans`, for edges identified as backward (in `layered.backwardEdgeIds`):
- Route them around the left or right margin of the layout
- Source exits from LEFT side, target enters from LEFT side (for vertical layouts)
- Source exits from TOP side, target enters from TOP side (for horizontal layouts)

**Step 4: Run tests — expect PASS**

**Step 5: Commit**

```bash
git add src/core/organize/layout.ts tests/layout.test.ts
git commit -m "feat: back-edge routing around flow margins for loop connectors"
```

---

## Task 10: New Message Protocol

**Files:**
- Modify: `src/shared/contracts.ts`

**Step 1: Write the new contracts**

Replace the entire `UIToMain` and `MainToUI` types:

```typescript
import type {
  ApplyScope, OrganizeConfigV2, PluginStateV2,
  PresetBundleV2, SelectionSummaryV2, SystemLegendEntry,
  ShapeLegendEntry, ActionResult, ValidationError,
  DiagramScanResult
} from "./types";

export type UIToMain =
  | { type: "INIT_REQUEST" }
  | { type: "GET_SELECTION" }
  | { type: "RESIZE_UI"; width: number; height: number }
  | { type: "SET_THEME_MODE"; themeMode: "light" | "dark" }
  // Legend
  | { type: "SYSTEM_ENTRY_UPSERT"; entry: SystemLegendEntry }
  | { type: "SYSTEM_ENTRY_DELETE"; entryId: string }
  | { type: "SHAPE_ENTRY_UPSERT"; entry: ShapeLegendEntry }
  | { type: "SHAPE_ENTRY_DELETE"; entryId: string }
  | { type: "ASSIGN_SYSTEM"; entryId: string; nodeIds: string[] }
  | { type: "ASSIGN_SHAPE"; entryId: string; nodeIds: string[] }
  | { type: "UNASSIGN_SYSTEM"; nodeIds: string[] }
  | { type: "UNASSIGN_SHAPE"; nodeIds: string[] }
  | { type: "APPLY_LEGEND"; scope: ApplyScope }
  // Organize
  | { type: "SCAN_DIAGRAM"; scope: ApplyScope }
  | { type: "RUN_ORGANIZE"; config: OrganizeConfigV2; scope: ApplyScope }
  // Import/Export
  | { type: "EXPORT_PRESETS" }
  | { type: "IMPORT_PRESETS"; payload: PresetBundleV2 };

export type MainToUI =
  | { type: "INIT_STATE"; state: PluginStateV2 }
  | { type: "SELECTION_STATE"; selection: SelectionSummaryV2 }
  | { type: "ACTION_RESULT"; result: ActionResult }
  | { type: "VALIDATION_ERROR"; error: ValidationError }
  | { type: "SCAN_RESULT"; result: DiagramScanResult };
```

**Step 2: Commit**

```bash
git add src/shared/contracts.ts
git commit -m "feat: V2 message protocol with unified legend and scan messages"
```

---

## Task 11: Main Plugin Runtime (`fragmentFlowPlugin.ts`)

**Files:**
- Modify: `src/main/fragmentFlowPlugin.ts`

**Step 1: Update message handler**

This is a large refactor of the main plugin runtime. Key changes:
- Replace all V1 message handlers with V2 equivalents
- On `INIT_REQUEST`: load state, detect V1 and migrate to V2
- Add `SYSTEM_ENTRY_UPSERT/DELETE`, `SHAPE_ENTRY_UPSERT/DELETE` handlers
- Add `ASSIGN_SYSTEM/SHAPE`, `UNASSIGN_SYSTEM/SHAPE` handlers
- Add `APPLY_LEGEND` handler (unified — applies both system colors and shape styles)
- Add `SCAN_DIAGRAM` handler (auto-detect shapes, colors, crossings)
- Update `RUN_ORGANIZE` to use `OrganizeConfigV2` and pass shape entries + assignments
- Update `GET_SELECTION` to return `SelectionSummaryV2`
- Update import/export for V2 bundles

**Step 2: Implement and test manually in FigJam**

**Step 3: Commit**

```bash
git add src/main/fragmentFlowPlugin.ts
git commit -m "feat: V2 plugin runtime with unified legend and enhanced organize"
```

---

## Task 12: UI — Legend Panel Rewrite

**Files:**
- Create: `src/ui/panels/LegendPanelV2.tsx`
- Modify: `src/ui/styles/app.css`

**Step 1: Implement the new Legend panel**

Two-section layout:
1. **Systems (by color)** — list of `SystemLegendEntry` with inline expand editing
2. **Shapes (by role)** — list of `ShapeLegendEntry` with layout role tag and inline description

Each entry:
- Collapsed: color swatch/shape icon, name, role tag, node count
- Expanded: full form (name, fill, stroke, text, connector style, role dropdown with description)

Interactions:
- Click entry → expand inline editor
- Click [+] → add new entry
- Apply button on each entry
- "Apply All to Board" at bottom
- Inline help text for roles from `LAYOUT_ROLE_DESCRIPTIONS`

**Step 2: Style the new components in `app.css`**

**Step 3: Commit**

```bash
git add src/ui/panels/LegendPanelV2.tsx src/ui/styles/app.css
git commit -m "feat: new Legend panel with systems + shapes sections and role guidance"
```

---

## Task 13: UI — Organize Panel Rewrite

**Files:**
- Create: `src/ui/panels/OrganizePanelV2.tsx`
- Modify: `src/ui/styles/app.css`

**Step 1: Implement the new Organize panel**

Sections:
1. **Scan summary** — shape/connector count, mapped vs unmapped, crossing count
2. **Layout preset cards** — 5 visual thumbnails (Flow →, Flow ↓, Tree, Swimlane, Compact) with SVG mini-diagram previews and plain-language subtitles
3. **Spacing slider** — continuous 0-100 with labels (Compact / Balanced / Spacious)
4. **Connector style** — radio buttons (Clean / Smooth / Direct)
5. **ORGANIZE NOW** — big primary button
6. **Advanced** — collapsed section with nodeGap, laneGap, alignStrict, autoFixCrossings
7. **Diagnostics** — shown after run (components, decisions, crossings before→after with percentage)

Layout preset card SVG thumbnails (inline SVGs showing the layout pattern):
- Flow →: horizontal boxes with arrows
- Flow ↓: vertical boxes with arrows
- Tree: branching tree shape
- Swimlane: vertical columns with dots
- Compact: tight grid

**Step 2: Style the new components**

**Step 3: Commit**

```bash
git add src/ui/panels/OrganizePanelV2.tsx src/ui/styles/app.css
git commit -m "feat: new Organize panel with visual thumbnails and scan summary"
```

---

## Task 14: UI — App.tsx Rewrite (2-tab layout)

**Files:**
- Modify: `src/ui/App.tsx`

**Step 1: Rewrite App.tsx**

Key changes:
- Replace 4 tabs with 2: `legend` and `organize`
- Remove all V1 state (styleDraft, connectorDraft, categoryDraft)
- Add V2 state (systemDraft, shapeDraft, organizeConfig)
- Wire up V2 message protocol
- Add scan-on-mount (send `SCAN_DIAGRAM` when tab switches to organize)
- Import `LegendPanelV2` and `OrganizePanelV2`
- Keep header (Export/Import/Theme/Size), scope toggle, footer toast
- Update empty state with welcome message

**Step 2: Remove old panel files**

Delete `src/ui/panels/LegendPanel.tsx` and `src/ui/panels/OrganizePanel.tsx` (replaced by V2 versions).

**Step 3: Commit**

```bash
git add src/ui/App.tsx
git rm src/ui/panels/LegendPanel.tsx src/ui/panels/OrganizePanel.tsx
git commit -m "feat: 2-tab UI with guided workflow (Legend + Organize)"
```

---

## Task 15: CSS Overhaul

**Files:**
- Modify: `src/ui/styles/app.css`

**Step 1: Update CSS**

Key changes:
- New `.legend-entry-card` styles for the inline-expanding entries
- `.layout-preset-grid` with thumbnail card styles
- `.spacing-slider` for the continuous slider
- `.scan-summary` styles for the diagram analysis banner
- `.organize-button` — large, prominent primary button
- `.role-tag` — small inline badge showing layout role
- `.role-description` — muted helper text under role dropdown
- Clean up unused V1-specific styles (`.preset-row`, `.swatches`, old `.legend-row-card`)
- Better visual hierarchy: larger headings, more whitespace, clearer sections

**Step 2: Commit**

```bash
git add src/ui/styles/app.css
git commit -m "feat: redesigned CSS with layout thumbnails, scan summary, and role tags"
```

---

## Task 16: Update Tests

**Files:**
- Modify: `tests/layout.test.ts`
- Modify: `tests/schema.test.ts`
- Modify: `tests/legend.test.ts`

**Step 1: Update existing tests for V2 types**

- `layout.test.ts`: Update to use `LayoutRole` instead of `isDecision`, use `LayoutPresetV2` values
- `schema.test.ts`: Add V2 sanitization tests, migration edge cases
- `legend.test.ts`: Update for system entries and shape entries

**Step 2: Run full test suite**

```bash
npx vitest run
```
Expected: ALL PASS

**Step 3: Commit**

```bash
git add tests/
git commit -m "test: update test suite for V2 unified legend model"
```

---

## Task 17: Cleanup & Final Integration

**Files:**
- Remove unused V1-only code from `src/core/styles/` (if no longer referenced)
- Remove unused V1-only code from `src/core/connectors/presets.ts` (if connector presets are now embedded in legend entries)
- Update `src/core/legend/mapping.ts` for V2 model
- Verify build passes

**Step 1: Clean up dead code**

Remove or update:
- `src/core/styles/presets.ts` — upsert/delete functions (styles now in legend entries)
- `src/core/connectors/presets.ts` — upsert/delete functions (connector styles now in legend entries)
- Keep `applyShapeStyle.ts` and `applyConnectorStyle.ts` (still needed for applying styles from legend entries)
- Update `applyShapeStyle` to accept `SystemLegendEntry | ShapeLegendEntry` instead of `ShapeStylePreset`
- Update `applyConnectorStyle` to accept `ConnectorStyleFields` instead of `ConnectorStylePreset`

**Step 2: Verify full build**

```bash
npm run build
npm run lint
npm run test
```

**Step 3: Commit**

```bash
git add -A
git commit -m "chore: remove V1-only code and verify clean build"
```

---

## Execution Order Summary

| Task | Description | Depends On |
|------|-------------|-----------|
| 1 | V2 type definitions | — |
| 2 | V2 defaults & constants | 1 |
| 3 | V1→V2 migration | 1, 2 |
| 4 | Enhanced crossing reduction | — |
| 5 | Dummy node insertion | 4 |
| 6 | Role-aware graph extraction | 1 |
| 7 | Role-aware layout | 5, 6 |
| 8 | Angle-based port assignment | 7 |
| 9 | Back-edge routing | 7 |
| 10 | New message protocol | 1 |
| 11 | Main plugin runtime | 3, 7, 8, 9, 10 |
| 12 | UI Legend panel | 1, 2, 10 |
| 13 | UI Organize panel | 1, 10 |
| 14 | UI App.tsx rewrite | 12, 13 |
| 15 | CSS overhaul | 14 |
| 16 | Update tests | all |
| 17 | Cleanup & integration | all |

**Parallelizable groups:**
- Tasks 1-3 (data model) can be done first
- Tasks 4-5 (algorithm core) are independent of 1-3
- Tasks 6-9 depend on both groups
- Tasks 10-15 (UI/protocol) depend on the data model
- Tasks 16-17 are final integration

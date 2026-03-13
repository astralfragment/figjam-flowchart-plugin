# LegendFlow Manager — Full Overhaul Design

**Date:** 2026-03-13
**Status:** Approved
**Scope:** Algorithm fix + UI overhaul
**Primary use case:** Taming messy existing FigJam diagrams (30-80 shapes)
**Core problem:** Connector spaghetti from insufficient crossing reduction + no semantic awareness

---

## 1. Architecture: Unified Legend-Driven Model

### Current (3 separate concepts)
- Shape style presets (standalone CRUD)
- Connector style presets (standalone CRUD)
- Legend categories (references presets by ID)

### New (single source of truth)
**Legend entries ARE the styles.** Each legend entry contains:
- Identity: name, shape type
- Layout role: semantic behavior for organize algorithm
- Shape style: fill, stroke, text color/size/weight, opacity
- Connector style: color, width, dash style, path type, arrows

No separate style presets or connector presets. The legend is the complete definition.

### Two legend dimensions
1. **Systems** (by color): e.g., Student Portal, AMI, NetSuite — represent which system/department a node belongs to
2. **Shapes** (by role): e.g., Process, Decision, Start/End — represent the flowchart function

A node can be "Student Portal + Decision" (blue diamond) — the system provides the color, the shape provides the role.

---

## 2. Layout Roles

Each shape legend entry has a **layout role** that drives organize behavior:

| Role | Routing Behavior | Default Shape |
|------|-----------------|---------------|
| `entry` | Pinned to flow start (first layer). Max 1 outgoing. | Ellipse |
| `exit` | Pinned to flow end (last layer). Max 1 incoming. | Ellipse |
| `process` | Sequential — 1 in, 1 out. Standard inline placement. | Rectangle |
| `decision` | Branch point — 1 in, 2+ out. Yes/No side routing. Extra spacing. | Diamond |
| `merge` | Convergence — 2+ in, 1 out. Symmetric incoming port allocation. | Circle |
| `fork` | Parallel split — 1 in, 2+ out. Equal-weight outgoing. Parallel lanes downstream. | Horizontal bar |
| `loop` | Back-edge aware. Return connectors routed outside main flow. | Varies |
| `io` | Data flow — slight offset from main column. | Parallelogram |
| `manual` | Same as process, visually distinct. | Trapezoid |
| `subprocess` | Heavier weighted node in layout. | Double-bordered rect |
| `annotation` | Excluded from flow. Floated near connected node after layout. | Bracket/sticky |
| `delay` | Same as process with visual spacing gap before it. | Half-circle |
| `default` | Fallback — treated as process. | Any |

Roles are extensible: users assign any role to any legend shape entry. Plugin provides sensible defaults (diamond → decision, ellipse → entry/exit) but user mappings override.

---

## 3. Smart Organize Algorithm Overhaul

### Current Problems
1. Only 2 barycenter sweep passes (Graphviz uses 24)
2. No dummy nodes for long-span edges (standard Sugiyama technique — without this, edges skipping layers aren't considered during crossing minimization)
3. Port ordering is position-based, not angle-based
4. No semantic awareness of node roles
5. No adjacent-exchange local improvement

### Enhanced Sugiyama Pipeline

#### Phase 1: Graph Extraction + Role Assignment
- Extract connected components via BFS
- Assign layout roles from legend mapping (shape type → role)
- Detect back-edges (cycles) and mark loop roles
- Identify entry/exit nodes

#### Phase 2: Layer Assignment
- Longest-path layering
- Pin entry nodes to layer 0, exit nodes to last layer
- Annotations excluded from layering

#### Phase 3: Dummy Node Insertion (NEW — biggest improvement)
- For any edge spanning 2+ layers, insert invisible dummy nodes at each intermediate layer
- Dummy nodes participate in crossing minimization
- After layout, dummy node positions inform endpoint positioning
- This is the single most impactful change for reducing spaghetti

#### Phase 4: Multi-Strategy Crossing Reduction (ENHANCED)
- Run **12 down-up sweep passes** (up from 2), keeping best permutation
- After each sweep, run **adjacent-exchange improvement** (swap neighboring nodes if it reduces crossings)
- Run **both barycenter and median** heuristics, keep whichever produces fewer crossings
- Use **inversion-count crossing counter** (O(E log V)) for fast evaluation
- Role-aware ordering: decision nodes get priority positioning for symmetric branches

#### Phase 5: Coordinate Assignment (ENHANCED)
- Role-based spacing: decision nodes get 2x horizontal space
- Fork nodes trigger parallel column layout downstream
- Delay nodes get extra spacing before them
- IO nodes offset slightly from main flow column

#### Phase 6: Port Assignment (ENHANCED)
- Sort outgoing ports by **angle to target node center** (not just secondary-axis position)
- Decision nodes: label-matched routing (yes/true → right/bottom, no/false → left/top), angle-based fallback
- Merge nodes: symmetric incoming port allocation (mirror of decision logic)
- Enforce minimum port gap (10px)
- Nodes with 4+ connections on one side: spread ports proportionally

#### Phase 7: Annotation Float (NEW)
- Position annotation nodes adjacent to their connected node
- Outside main flow, no crossing minimization participation

#### Phase 8: Back-Edge Routing (NEW)
- Loop back-edges routed around the outside of the main flow (left or right margin)
- Prevents the worst spaghetti from return connectors cutting through the diagram

### Layout Presets

| Preset | Description | Best For |
|--------|-------------|----------|
| Flow → | Left-to-right horizontal flow | Process maps, workflows, pipelines |
| Flow ↓ | Top-to-bottom vertical flow | Sequential processes, timelines |
| Tree | Branching tree with balanced subtrees | Decision trees, org charts, hierarchies |
| Swimlane | Category-based vertical lanes (by system/color) | Department flows, role-based processes |
| Compact | Minimize whitespace, dense packing | Space-constrained boards |

### Simplified Options
- **Spacing**: Slider from compact → balanced → spacious
- **Connector style**: Clean (elbowed) / Smooth (curved) / Direct (straight)
- **Advanced** (collapsed): node gap, lane gap, strict alignment, manual crossing fix mode

---

## 4. UI Design

### Overall Structure
Two tabs: **Legend** and **Organize**

Header: Plugin name, Export/Import, Settings gear

### Legend Panel

**Two sections:**

1. **Systems (by color)** — color categories representing systems/departments
   - Each entry: color swatch, name, count of applied nodes
   - Click to expand: name, fill color, stroke color, text style, connector style
   - [+] to add new system

2. **Shapes (by role)** — shape definitions with layout roles
   - Each entry: shape icon, name, layout role tag
   - Click to expand: name, shape type dropdown, role dropdown (with inline description), fill, stroke, text style, connector style
   - Role descriptions shown inline: "Decision → Branch point: yes/no branches auto-routed"
   - [+] to add new shape

**Interactions:**
- Select nodes + click legend entry → applies style and role
- Drag to reorder categories
- "Apply All to Board" button at bottom
- Inline hint: "Select nodes + click a legend entry to apply"

### Organize Panel

**Scan summary at top:**
- Shape/connector count
- Mapped vs unmapped count (with warning if unmapped)
- Crossing count (if any)

**Layout preset cards:**
- Visual thumbnail showing mini-diagram pattern
- Name + plain-language subtitle ("process maps", "branch logic", etc.)
- Selected card highlighted

**Options:**
- Spacing slider: compact → balanced → spacious
- Connector style: radio buttons (Clean/Smooth/Direct)

**Big organize button:**
- "ORGANIZE NOW" — primary action, prominent

**Advanced section (collapsed):**
- Node gap, lane gap numerical inputs
- Strict alignment toggle
- Crossing fix mode toggle

**Diagnostics (shown after run):**
- Components found, decisions found
- Crossings before → after (percentage reduction)

### Empty State / First Run
- Welcome message explaining the 3 things the plugin does
- Prompt to select shapes or click "Board"

### Settings (gear icon)
- Theme toggle (light/dark)
- Window size (compact/standard/wide)
- Reset to defaults

---

## 5. Data Model Changes

### Current State Schema (V1)
```typescript
{
  schemaVersion: 1,
  themeMode: "light" | "dark",
  shapePresets: ShapeStylePreset[],
  connectorPresets: ConnectorStylePreset[],
  categories: LegendCategory[],
  nodeCategoryAssignments: Record<nodeId, categoryId>
}
```

### New State Schema (V2)
```typescript
{
  schemaVersion: 2,
  themeMode: "light" | "dark",
  systemEntries: SystemLegendEntry[],   // color/system categories
  shapeEntries: ShapeLegendEntry[],     // shape + role definitions
  nodeAssignments: {
    system: Record<nodeId, systemEntryId>,  // which system
    shape: Record<nodeId, shapeEntryId>     // which shape role
  }
}
```

### SystemLegendEntry
```typescript
{
  id: string,
  name: string,
  order: number,
  fill: string,           // hex color
  stroke: string,         // hex color
  strokeWidth: number,
  textColor: string,
  textSize: number,
  textWeight: number,
  opacity: number,
  connectorStroke: string,
  connectorWidth: number,
  connectorLineStyle: "solid" | "dashed" | "dotted",
  connectorPathType: "ELBOWED" | "STRAIGHT" | "CURVED",
  connectorArrowStart: string,
  connectorArrowEnd: string,
  connectorOpacity: number,
}
```

### ShapeLegendEntry
```typescript
{
  id: string,
  name: string,
  order: number,
  shapeType: FigJamShapeType,
  layoutRole: LayoutRole,     // "process" | "decision" | "entry" | "exit" | etc.
  // Shape style (light/outline style for the shape itself)
  fill: string,
  stroke: string,
  strokeWidth: number,
  textColor: string,
  textSize: number,
  textWeight: number,
  opacity: number,
  // Connector style defaults for this shape type
  connectorStroke: string,
  connectorWidth: number,
  connectorLineStyle: "solid" | "dashed" | "dotted",
  connectorPathType: "ELBOWED" | "STRAIGHT" | "CURVED",
  connectorArrowStart: string,
  connectorArrowEnd: string,
  connectorOpacity: number,
}
```

### Migration V1 → V2
- Convert `shapePresets` + `connectorPresets` + `categories` into unified `systemEntries` + `shapeEntries`
- Categories with `semanticRole` map to `shapeEntries` with corresponding `layoutRole`
- Categories without semantic role become `systemEntries`
- `nodeCategoryAssignments` split into `nodeAssignments.system` and `nodeAssignments.shape`

---

## 6. Message Protocol Changes

### Removed Messages
- `STYLE_PRESET_UPSERT`, `STYLE_PRESET_DELETE`, `CREATE_STYLE_FROM_SELECTED`, `APPLY_STYLE_PRESET`
- `CONNECTOR_PRESET_UPSERT`, `CONNECTOR_PRESET_DELETE`, `APPLY_CONNECTOR_PRESET`
- `CATEGORY_UPSERT`, `CATEGORY_DELETE`, `CATEGORY_MOVE`, `ASSIGN_CATEGORY`, `UNASSIGN_CATEGORY`, `APPLY_LEGEND_MAPPING`

### New Messages
- `SYSTEM_ENTRY_UPSERT`, `SYSTEM_ENTRY_DELETE`
- `SHAPE_ENTRY_UPSERT`, `SHAPE_ENTRY_DELETE`
- `ASSIGN_SYSTEM`, `ASSIGN_SHAPE`, `UNASSIGN_SYSTEM`, `UNASSIGN_SHAPE`
- `APPLY_LEGEND` (unified — applies both system colors and shape styles)
- `SCAN_DIAGRAM` (auto-detect shapes, colors, crossings)
- `RUN_ORGANIZE` (unchanged but config simplified)

---

## 7. Success Criteria

1. **Connector spaghetti eliminated**: For a 50-node diagram with 10+ crossings, organize reduces crossings by 80%+
2. **Semantic correctness**: Decision nodes have branches routed to sides, entry/exit pinned to edges, annotations floated outside flow
3. **First-use < 30 seconds**: New user can map their legend and organize in under 30 seconds
4. **Returning use < 5 seconds**: Legend saved, just hit Organize
5. **No jargon**: No technical terms visible in default UI (routingMode, barycenter, etc.)
6. **Extensible roles**: User can assign any layout role to any shape type

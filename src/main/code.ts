import { loadPluginStateV2, savePluginStateV2 } from "@core/persistence/storage";
import type { MainToUIV2, UIToMainV2 } from "@shared/contracts";
import type { ActionResult, AutoDetectResult, AutoDetectSuggestion, FigJamShapeType, LayoutRole, OrganizePreviewResult, PluginStateV2, SelectionSummaryV2, ShapeLegendEntry, SystemLegendEntry } from "@shared/types";

declare const __UI_HTML__: string;

const UI_SIZE = {
  width: 560,
  height: 820
};

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

figma.showUI(__UI_HTML__, {
  ...UI_SIZE,
  title: "FlowForge"
});

let state = loadPluginStateV2();

const postMessage = (message: MainToUIV2): void => {
  figma.ui.postMessage(message);
};

const getSelectionSummaryV2 = (): SelectionSummaryV2 => {
  const selected = figma.currentPage.selection;
  const shapeNodes = selected.filter((node): node is ShapeWithTextNode => node.type === "SHAPE_WITH_TEXT");
  const shapes = shapeNodes.length;
  const connectors = selected.filter((node) => node.type === "CONNECTOR").length;

  let systemAssignedCount = 0;
  let shapeAssignedCount = 0;
  const systemCounts = new Map<string, number>();
  const shapeCounts = new Map<string, number>();

  for (const node of shapeNodes) {
    const sysId = state.nodeAssignments.system[node.id];
    if (sysId) {
      systemAssignedCount++;
      systemCounts.set(sysId, (systemCounts.get(sysId) ?? 0) + 1);
    }
    const shpId = state.nodeAssignments.shape[node.id];
    if (shpId) {
      shapeAssignedCount++;
      shapeCounts.set(shpId, (shapeCounts.get(shpId) ?? 0) + 1);
    }
  }

  const unmappedCount = shapes - Math.max(systemAssignedCount, shapeAssignedCount);

  const systemBreakdown = state.systemEntries
    .filter((e) => (systemCounts.get(e.id) ?? 0) > 0)
    .map((e) => ({ entryId: e.id, name: e.name, count: systemCounts.get(e.id) ?? 0 }));

  const shapeBreakdown = state.shapeEntries
    .filter((e) => (shapeCounts.get(e.id) ?? 0) > 0)
    .map((e) => ({ entryId: e.id, name: e.name, role: e.layoutRole, count: shapeCounts.get(e.id) ?? 0 }));

  return {
    total: selected.length,
    shapes,
    connectors,
    systemAssignedCount,
    shapeAssignedCount,
    unmappedCount: Math.max(0, unmappedCount),
    systemBreakdown,
    shapeBreakdown
  };
};

const sendInitState = (): void => {
  postMessage({ type: "INIT_STATE_V2", state });
};

const sendSelectionState = (): void => {
  postMessage({ type: "SELECTION_STATE_V2", selection: getSelectionSummaryV2() });
};

const sendValidationError = (action: string, message: string): void => {
  postMessage({ type: "VALIDATION_ERROR", error: { action, message } });
};

const sendActionResult = (result: ActionResult): void => {
  postMessage({ type: "ACTION_RESULT", result });
  if (result.severity === "error") {
    figma.notify(result.message, { error: true });
    return;
  }
  if (result.severity === "warning") {
    figma.notify(result.message, { timeout: 2500 });
    return;
  }
  figma.notify(result.message, { timeout: 1500 });
};

// ─── V2 Legend Helpers ──────────────────────────────────────────────

const upsertSystemEntry = (entry: SystemLegendEntry): void => {
  const idx = state.systemEntries.findIndex((e) => e.id === entry.id);
  const next = [...state.systemEntries];
  if (idx === -1) {
    next.push(entry);
  } else {
    next[idx] = entry;
  }
  state = { ...state, systemEntries: next };
};

const upsertShapeEntry = (entry: ShapeLegendEntry): void => {
  const idx = state.shapeEntries.findIndex((e) => e.id === entry.id);
  const next = [...state.shapeEntries];
  if (idx === -1) {
    next.push(entry);
  } else {
    next[idx] = entry;
  }
  state = { ...state, shapeEntries: next };
};

const applyLegendV2 = async (scope: import("@shared/types").ApplyScope): Promise<ActionResult> => {
  const { getNodesInScope, isShapeNode, getConnectorNodes } = await import("@core/common/selection");
  const scopedNodes = getNodesInScope(scope);
  const shapeNodes = scopedNodes.filter(isShapeNode);
  let changed = 0;
  let skipped = 0;

  const systemById = new Map(state.systemEntries.map((e) => [e.id, e]));
  const shapeById = new Map(state.shapeEntries.map((e) => [e.id, e]));

  for (const node of shapeNodes) {
    const shapeEntryId = state.nodeAssignments.shape[node.id];
    const shapeEntry = shapeEntryId ? shapeById.get(shapeEntryId) : undefined;
    const systemEntryId = state.nodeAssignments.system[node.id];
    const systemEntry = systemEntryId ? systemById.get(systemEntryId) : undefined;

    const styleSource = systemEntry ?? shapeEntry;
    if (!styleSource) {
      skipped++;
      continue;
    }

    try {
      const fills = [{ type: "SOLID" as const, color: hexToRGB(styleSource.fill) }];
      const strokes = [{ type: "SOLID" as const, color: hexToRGB(styleSource.stroke) }];
      node.fills = fills;
      node.strokes = strokes;
      node.strokeWeight = styleSource.strokeWidth;
      node.opacity = styleSource.opacity;

      if (shapeEntry && "shapeType" in shapeEntry) {
        node.shapeType = shapeEntry.shapeType;
      }

      // Apply text styles
      if (node.text) {
        const textFills = [{ type: "SOLID" as const, color: hexToRGB(styleSource.textColor) }];
        node.text.fills = textFills;
        node.text.fontSize = styleSource.textSize;
      }

      changed++;
    } catch {
      skipped++;
    }
  }

  // Apply connector styles
  const connectors = getConnectorNodes(scopedNodes);
  const styledNodeIds = new Set(shapeNodes.filter((n) => state.nodeAssignments.shape[n.id] || state.nodeAssignments.system[n.id]).map((n) => n.id));

  for (const connector of connectors) {
    const startId = "endpointNodeId" in connector.connectorStart ? connector.connectorStart.endpointNodeId : undefined;
    const endId = "endpointNodeId" in connector.connectorEnd ? connector.connectorEnd.endpointNodeId : undefined;
    if (!startId && !endId) continue;
    if (!styledNodeIds.has(startId ?? "") && !styledNodeIds.has(endId ?? "")) continue;

    // Use source node's entry for connector style
    const sourceEntryId = startId ? (state.nodeAssignments.system[startId] ?? state.nodeAssignments.shape[startId]) : undefined;
    const entry = sourceEntryId
      ? (systemById.get(sourceEntryId) ?? shapeById.get(sourceEntryId))
      : undefined;

    if (!entry || !("connectorStroke" in entry)) continue;

    try {
      connector.strokes = [{ type: "SOLID" as const, color: hexToRGB(entry.connectorStroke) }];
      connector.strokeWeight = entry.connectorWidth;
      connector.opacity = entry.connectorOpacity;
      connector.connectorLineType = entry.connectorPathType;
      if (entry.connectorLineStyle === "dashed") {
        connector.dashPattern = [8, 4];
      } else if (entry.connectorLineStyle === "dotted") {
        connector.dashPattern = [2, 4];
      } else {
        connector.dashPattern = [];
      }
      connector.connectorStartStrokeCap = entry.connectorArrowStart === "triangle" ? "TRIANGLE_FILLED" : entry.connectorArrowStart === "line" ? "ARROW_LINES" : "NONE";
      connector.connectorEndStrokeCap = entry.connectorArrowEnd === "triangle" ? "TRIANGLE_FILLED" : entry.connectorArrowEnd === "line" ? "ARROW_LINES" : "NONE";
      changed++;
    } catch {
      skipped++;
    }
  }

  return {
    action: "APPLY_LEGEND",
    severity: changed > 0 ? "info" : "warning",
    message: changed > 0 ? `Legend applied. Updated ${changed} element(s).` : "No mapped shapes found in scope.",
    changed,
    skipped
  };
};

const hexToRGB = (hex: string): RGB => {
  const h = hex.replace("#", "");
  return {
    r: parseInt(h.substring(0, 2), 16) / 255,
    g: parseInt(h.substring(2, 4), 16) / 255,
    b: parseInt(h.substring(4, 6), 16) / 255
  };
};

// ─── Message Handler ────────────────────────────────────────────────

figma.on("selectionchange", () => {
  sendSelectionState();
});

figma.ui.onmessage = async (message: UIToMainV2): Promise<void> => {
  switch (message.type) {
    case "INIT_REQUEST": {
      sendInitState();
      sendSelectionState();
      return;
    }

    case "GET_SELECTION": {
      sendSelectionState();
      return;
    }

    case "RESIZE_UI": {
      const width = clamp(Math.round(message.width), 380, 960);
      const height = clamp(Math.round(message.height), 560, 1200);
      figma.ui.resize(width, height);
      return;
    }

    case "SET_THEME_MODE": {
      state = { ...state, themeMode: message.themeMode };
      savePluginStateV2(state);
      sendInitState();
      sendActionResult({
        action: "SET_THEME_MODE",
        severity: "info",
        message: `Theme switched to ${message.themeMode}.`,
        changed: 1,
        skipped: 0
      });
      return;
    }

    // ─── System Entries ─────────────────────────────────────────
    case "SYSTEM_ENTRY_UPSERT": {
      upsertSystemEntry(message.entry);
      savePluginStateV2(state);
      sendInitState();
      sendActionResult({
        action: "SYSTEM_ENTRY_UPSERT",
        severity: "info",
        message: `Saved system entry "${message.entry.name}".`,
        changed: 1,
        skipped: 0
      });
      return;
    }

    case "SYSTEM_ENTRY_DELETE": {
      state = {
        ...state,
        systemEntries: state.systemEntries.filter((e) => e.id !== message.entryId),
        nodeAssignments: {
          ...state.nodeAssignments,
          system: Object.fromEntries(
            Object.entries(state.nodeAssignments.system).filter(([, v]) => v !== message.entryId)
          )
        }
      };
      savePluginStateV2(state);
      sendInitState();
      sendSelectionState();
      sendActionResult({
        action: "SYSTEM_ENTRY_DELETE",
        severity: "info",
        message: "System entry removed.",
        changed: 1,
        skipped: 0
      });
      return;
    }

    case "SYSTEM_ENTRY_REORDER": {
      const ordered = message.entryIds
        .map((id) => state.systemEntries.find((e) => e.id === id))
        .filter((e): e is SystemLegendEntry => Boolean(e))
        .map((e, i) => ({ ...e, order: i + 1 }));
      state = { ...state, systemEntries: ordered };
      savePluginStateV2(state);
      sendInitState();
      return;
    }

    // ─── Shape Entries ──────────────────────────────────────────
    case "SHAPE_ENTRY_UPSERT": {
      upsertShapeEntry(message.entry);
      savePluginStateV2(state);
      sendInitState();
      sendActionResult({
        action: "SHAPE_ENTRY_UPSERT",
        severity: "info",
        message: `Saved shape entry "${message.entry.name}".`,
        changed: 1,
        skipped: 0
      });
      return;
    }

    case "SHAPE_ENTRY_DELETE": {
      state = {
        ...state,
        shapeEntries: state.shapeEntries.filter((e) => e.id !== message.entryId),
        nodeAssignments: {
          ...state.nodeAssignments,
          shape: Object.fromEntries(
            Object.entries(state.nodeAssignments.shape).filter(([, v]) => v !== message.entryId)
          )
        }
      };
      savePluginStateV2(state);
      sendInitState();
      sendSelectionState();
      sendActionResult({
        action: "SHAPE_ENTRY_DELETE",
        severity: "info",
        message: "Shape entry removed.",
        changed: 1,
        skipped: 0
      });
      return;
    }

    case "SHAPE_ENTRY_REORDER": {
      const ordered = message.entryIds
        .map((id) => state.shapeEntries.find((e) => e.id === id))
        .filter((e): e is ShapeLegendEntry => Boolean(e))
        .map((e, i) => ({ ...e, order: i + 1 }));
      state = { ...state, shapeEntries: ordered };
      savePluginStateV2(state);
      sendInitState();
      return;
    }

    // ─── Assignments ────────────────────────────────────────────
    case "ASSIGN_SYSTEM": {
      const nodeIds = message.nodeIds.length > 0
        ? message.nodeIds
        : figma.currentPage.selection.filter((n): n is ShapeWithTextNode => n.type === "SHAPE_WITH_TEXT").map((n) => n.id);
      if (nodeIds.length === 0) {
        sendValidationError("ASSIGN_SYSTEM", "Select shapes first.");
        return;
      }
      const system = { ...state.nodeAssignments.system };
      for (const id of nodeIds) system[id] = message.entryId;
      state = { ...state, nodeAssignments: { ...state.nodeAssignments, system } };
      savePluginStateV2(state);
      sendInitState();
      sendSelectionState();
      sendActionResult({
        action: "ASSIGN_SYSTEM",
        severity: "info",
        message: `Assigned system to ${nodeIds.length} shape(s).`,
        changed: nodeIds.length,
        skipped: 0
      });
      return;
    }

    case "ASSIGN_SHAPE": {
      const nodeIds = message.nodeIds.length > 0
        ? message.nodeIds
        : figma.currentPage.selection.filter((n): n is ShapeWithTextNode => n.type === "SHAPE_WITH_TEXT").map((n) => n.id);
      if (nodeIds.length === 0) {
        sendValidationError("ASSIGN_SHAPE", "Select shapes first.");
        return;
      }
      const shape = { ...state.nodeAssignments.shape };
      for (const id of nodeIds) shape[id] = message.entryId;
      state = { ...state, nodeAssignments: { ...state.nodeAssignments, shape } };
      savePluginStateV2(state);
      sendInitState();
      sendSelectionState();
      sendActionResult({
        action: "ASSIGN_SHAPE",
        severity: "info",
        message: `Assigned shape to ${nodeIds.length} shape(s).`,
        changed: nodeIds.length,
        skipped: 0
      });
      return;
    }

    case "UNASSIGN_SYSTEM": {
      const nodeIds = message.nodeIds.length > 0
        ? message.nodeIds
        : figma.currentPage.selection.filter((n): n is ShapeWithTextNode => n.type === "SHAPE_WITH_TEXT").map((n) => n.id);
      const system = { ...state.nodeAssignments.system };
      for (const id of nodeIds) delete system[id];
      state = { ...state, nodeAssignments: { ...state.nodeAssignments, system } };
      savePluginStateV2(state);
      sendInitState();
      sendSelectionState();
      return;
    }

    case "UNASSIGN_SHAPE": {
      const nodeIds = message.nodeIds.length > 0
        ? message.nodeIds
        : figma.currentPage.selection.filter((n): n is ShapeWithTextNode => n.type === "SHAPE_WITH_TEXT").map((n) => n.id);
      const shape = { ...state.nodeAssignments.shape };
      for (const id of nodeIds) delete shape[id];
      state = { ...state, nodeAssignments: { ...state.nodeAssignments, shape } };
      savePluginStateV2(state);
      sendInitState();
      sendSelectionState();
      return;
    }

    // ─── Apply & Organize ───────────────────────────────────────
    case "APPLY_LEGEND": {
      const result = await applyLegendV2(message.scope);
      sendActionResult(result);
      sendSelectionState();
      return;
    }

    case "RUN_ORGANIZE_V2": {
      const { getNodesInScope, isShapeNode, getConnectorNodes } = await import("@core/common/selection");
      const { computeOrganizeLayout } = await import("@core/organize/layout");

      const scopedNodes = getNodesInScope(message.scope);
      const shapes = scopedNodes.filter(isShapeNode);
      const connectors = getConnectorNodes(scopedNodes);
      const shapeEntryById = new Map(state.shapeEntries.map((e) => [e.id, e]));

      const inputs = shapes.map((node) => {
        const shapeEntryId = state.nodeAssignments.shape[node.id];
        const shapeEntry = shapeEntryId ? shapeEntryById.get(shapeEntryId) : undefined;
        return {
          id: node.id,
          x: node.x,
          y: node.y,
          width: node.width,
          height: node.height,
          shapeType: node.shapeType,
          layoutRole: shapeEntry?.layoutRole as LayoutRole | undefined
        };
      });

      const connectorInputs = connectors.map((c) => ({
        id: c.id,
        sourceNodeId: "endpointNodeId" in c.connectorStart ? c.connectorStart.endpointNodeId ?? undefined : undefined,
        targetNodeId: "endpointNodeId" in c.connectorEnd ? c.connectorEnd.endpointNodeId ?? undefined : undefined,
        label: (() => { try { return c.text.characters.trim(); } catch { return ""; } })(),
        pathType: c.connectorLineType
      }));

      // Map V2 config to V1 config for computeOrganizeLayout
      const presetMap: Record<string, string> = {
        flow_lr: "process_lr",
        flow_tb: "hierarchy_tb",
        tree: "decision_tree_tb",
        swimlane: "swimlane_category",
        compact: "hierarchy_tb"
      };

      const connectorHandlingMap: Record<string, string> = {
        clean: "spread",
        smooth: "tree",
        direct: "minimal"
      };

      const v1Config = {
        preset: (presetMap[message.config.preset] ?? "process_lr") as import("@shared/types").LayoutPreset,
        routingMode: "auto" as const,
        spacingMode: "balanced" as const,
        connectorHandling: (connectorHandlingMap[message.config.connectorStyle] ?? "spread") as import("@shared/types").ConnectorHandlingMode,
        nodeGap: message.config.nodeGap,
        laneGap: message.config.laneGap,
        alignStrict: message.config.alignStrict
      };

      // Need a V1-compatible state for computeOrganizeLayout
      const v1State: import("@shared/types").PluginStateV1 = {
        schemaVersion: 1,
        themeMode: state.themeMode,
        shapePresets: [],
        connectorPresets: [],
        categories: [],
        nodeCategoryAssignments: {}
      };

      const layout = computeOrganizeLayout(inputs, connectorInputs, v1Config, v1State);

      let changed = 0;
      let skipped = 0;
      const shapeById = new Map(shapes.map((n) => [n.id, n]));
      const connectorById = new Map(connectors.map((c) => [c.id, c]));

      for (const placement of layout.placements) {
        const target = shapeById.get(placement.nodeId);
        if (!target) { skipped++; continue; }
        const nextX = message.config.alignStrict ? Math.round(placement.x) : Math.round(placement.x * 100) / 100;
        const nextY = message.config.alignStrict ? Math.round(placement.y) : Math.round(placement.y * 100) / 100;
        if (target.x !== nextX || target.y !== nextY) {
          target.x = nextX;
          target.y = nextY;
          changed++;
        }
      }

      for (const plan of layout.connectorPlans) {
        const connector = connectorById.get(plan.connectorId);
        if (!connector) { skipped++; continue; }
        try {
          connector.connectorLineType = plan.pathType;
          if (layout.diagnostics.modeChosen !== "safe") {
            try {
              if (plan.start.position) {
                connector.connectorStart = { endpointNodeId: plan.start.endpointNodeId, position: plan.start.position };
              } else {
                connector.connectorStart = { endpointNodeId: plan.start.endpointNodeId, magnet: plan.start.magnet ?? "AUTO" };
              }
            } catch {
              connector.connectorStart = { endpointNodeId: plan.start.endpointNodeId, magnet: plan.start.magnet ?? "AUTO" };
            }
            try {
              if (plan.end.position) {
                connector.connectorEnd = { endpointNodeId: plan.end.endpointNodeId, position: plan.end.position };
              } else {
                connector.connectorEnd = { endpointNodeId: plan.end.endpointNodeId, magnet: plan.end.magnet ?? "AUTO" };
              }
            } catch {
              connector.connectorEnd = { endpointNodeId: plan.end.endpointNodeId, magnet: plan.end.magnet ?? "AUTO" };
            }
          }
          changed++;
        } catch {
          skipped++;
        }
      }

      sendActionResult({
        action: "RUN_ORGANIZE_V2",
        severity: changed > 0 ? "info" : "warning",
        message: changed > 0
          ? `Organized ${layout.placements.filter((p) => shapeById.has(p.nodeId)).length} shapes using ${message.config.preset}.`
          : "No movable shapes found.",
        changed,
        skipped
      });
      sendSelectionState();
      return;
    }

    // ─── Import/Export ───────────────────────────────────────────
    case "EXPORT_PRESETS_V2": {
      const bundle = {
        schemaVersion: 2 as const,
        namespace: "legendflow.manager",
        exportedAt: new Date().toISOString(),
        systemEntries: state.systemEntries,
        shapeEntries: state.shapeEntries
      };
      sendActionResult({
        action: "EXPORT_PRESETS_V2",
        severity: "info",
        message: "Export ready.",
        changed: state.systemEntries.length + state.shapeEntries.length,
        skipped: 0,
        exportJson: JSON.stringify(bundle, null, 2)
      });
      return;
    }

    case "IMPORT_PRESETS_V2": {
      state = {
        ...state,
        systemEntries: message.payload.systemEntries ?? state.systemEntries,
        shapeEntries: message.payload.shapeEntries ?? state.shapeEntries
      };
      savePluginStateV2(state);
      sendInitState();
      sendSelectionState();
      sendActionResult({
        action: "IMPORT_PRESETS_V2",
        severity: "info",
        message: "Preset bundle imported.",
        changed: (message.payload.systemEntries?.length ?? 0) + (message.payload.shapeEntries?.length ?? 0),
        skipped: 0
      });
      return;
    }

    // ─── Auto-Detect ─────────────────────────────────────────
    case "AUTO_DETECT_SCAN": {
      const { getNodesInScope, isShapeNode, getConnectorNodes } = await import("@core/common/selection");
      const scopedNodes = getNodesInScope(message.scope);
      const shapeNodes = scopedNodes.filter(isShapeNode);
      const connectors = getConnectorNodes(scopedNodes);

      const shapeTypeCounts = new Map<string, number>();
      const colorGroups = new Map<string, { fill: string; stroke: string; count: number }>();

      for (const node of shapeNodes) {
        // Count shape types
        const st = node.shapeType;
        shapeTypeCounts.set(st, (shapeTypeCounts.get(st) ?? 0) + 1);

        // Group by fill color
        const fills = node.fills as readonly SolidPaint[];
        if (fills && fills.length > 0 && fills[0].type === "SOLID") {
          const c = fills[0].color;
          const hex = `#${Math.round(c.r * 255).toString(16).padStart(2, "0")}${Math.round(c.g * 255).toString(16).padStart(2, "0")}${Math.round(c.b * 255).toString(16).padStart(2, "0")}`.toUpperCase();
          if (!colorGroups.has(hex)) {
            // Get stroke color too
            const strokes = node.strokes as readonly SolidPaint[];
            let strokeHex = "#5C6B8A";
            if (strokes && strokes.length > 0 && strokes[0].type === "SOLID") {
              const sc = strokes[0].color;
              strokeHex = `#${Math.round(sc.r * 255).toString(16).padStart(2, "0")}${Math.round(sc.g * 255).toString(16).padStart(2, "0")}${Math.round(sc.b * 255).toString(16).padStart(2, "0")}`.toUpperCase();
            }
            colorGroups.set(hex, { fill: hex, stroke: strokeHex, count: 0 });
          }
          colorGroups.get(hex)!.count++;
        }
      }

      // Build suggestions
      const SHAPE_ROLE_MAP: Partial<Record<string, LayoutRole>> = {
        ELLIPSE: "entry",
        DIAMOND: "decision",
        PARALLELOGRAM_RIGHT: "io",
        TRAPEZOID: "manual",
        MANUAL_INPUT: "manual",
        ENG_DATABASE: "io",
        ENG_QUEUE: "io",
        PREDEFINED_PROCESS: "subprocess",
        DOCUMENT_SINGLE: "io",
        HEXAGON: "process",
        ROUNDED_RECTANGLE: "process",
        SQUARE: "process"
      };

      const SHAPE_LABEL_MAP: Partial<Record<string, string>> = {
        ELLIPSE: "Start / End",
        DIAMOND: "Decision",
        ROUNDED_RECTANGLE: "Process",
        SQUARE: "Process Block",
        PARALLELOGRAM_RIGHT: "Input / Output",
        TRAPEZOID: "Manual Process",
        MANUAL_INPUT: "Manual Input",
        ENG_DATABASE: "Database",
        ENG_QUEUE: "Queue",
        PREDEFINED_PROCESS: "Sub-process",
        DOCUMENT_SINGLE: "Document",
        HEXAGON: "Preparation"
      };

      const suggestions: AutoDetectSuggestion[] = [];

      // Shape type suggestions
      for (const [shapeType, count] of shapeTypeCounts) {
        if (count >= 1) {
          // Check if already defined
          const alreadyDefined = state.shapeEntries.some(e => e.shapeType === shapeType);
          if (!alreadyDefined) {
            suggestions.push({
              kind: "shape",
              name: SHAPE_LABEL_MAP[shapeType] ?? shapeType.toLowerCase().replace(/_/g, " "),
              shapeType: shapeType as FigJamShapeType,
              layoutRole: SHAPE_ROLE_MAP[shapeType] ?? "process",
              fill: "#F0F4FA",
              stroke: "#6B88AA",
              count
            });
          }
        }
      }

      // Color group suggestions (systems)
      for (const [, group] of colorGroups) {
        if (group.count >= 2) {
          const alreadyDefined = state.systemEntries.some(e => e.fill.toUpperCase() === group.fill.toUpperCase());
          if (!alreadyDefined) {
            suggestions.push({
              kind: "system",
              name: `Color Group (${group.fill})`,
              fill: group.fill,
              stroke: group.stroke,
              count: group.count
            });
          }
        }
      }

      const result: AutoDetectResult = {
        suggestions,
        totalShapes: shapeNodes.length,
        totalConnectors: connectors.length,
        uniqueShapeTypes: shapeTypeCounts.size,
        uniqueColors: colorGroups.size
      };

      postMessage({ type: "AUTO_DETECT_RESULT", result });
      return;
    }

    // ─── Organize Preview ─────────────────────────────────────
    case "ORGANIZE_PREVIEW": {
      const { getNodesInScope, isShapeNode, getConnectorNodes } = await import("@core/common/selection");
      const { computeOrganizeLayout } = await import("@core/organize/layout");

      const scopedNodes = getNodesInScope(message.scope);
      const shapes = scopedNodes.filter(isShapeNode);
      const connectors = getConnectorNodes(scopedNodes);
      const shapeEntryById = new Map(state.shapeEntries.map((e) => [e.id, e]));

      const inputs = shapes.map((node) => {
        const shapeEntryId = state.nodeAssignments.shape[node.id];
        const shapeEntry = shapeEntryId ? shapeEntryById.get(shapeEntryId) : undefined;
        return {
          id: node.id, x: node.x, y: node.y,
          width: node.width, height: node.height,
          shapeType: node.shapeType,
          layoutRole: shapeEntry?.layoutRole as LayoutRole | undefined
        };
      });

      const connectorInputs = connectors.map((c) => ({
        id: c.id,
        sourceNodeId: "endpointNodeId" in c.connectorStart ? c.connectorStart.endpointNodeId ?? undefined : undefined,
        targetNodeId: "endpointNodeId" in c.connectorEnd ? c.connectorEnd.endpointNodeId ?? undefined : undefined,
        label: (() => { try { return c.text.characters.trim(); } catch { return ""; } })(),
        pathType: c.connectorLineType
      }));

      const presetMap: Record<string, string> = {
        flow_lr: "process_lr", flow_tb: "hierarchy_tb",
        tree: "decision_tree_tb", swimlane: "swimlane_category", compact: "hierarchy_tb"
      };
      const connectorHandlingMap: Record<string, string> = {
        clean: "spread", smooth: "tree", direct: "minimal"
      };

      const v1Config = {
        preset: (presetMap[message.config.preset] ?? "process_lr") as import("@shared/types").LayoutPreset,
        routingMode: "auto" as const,
        spacingMode: "balanced" as const,
        connectorHandling: (connectorHandlingMap[message.config.connectorStyle] ?? "spread") as import("@shared/types").ConnectorHandlingMode,
        nodeGap: message.config.nodeGap,
        laneGap: message.config.laneGap,
        alignStrict: message.config.alignStrict
      };

      const v1State: import("@shared/types").PluginStateV1 = {
        schemaVersion: 1, themeMode: state.themeMode,
        shapePresets: [], connectorPresets: [], categories: [],
        nodeCategoryAssignments: {}
      };

      const layout = computeOrganizeLayout(inputs, connectorInputs, v1Config, v1State);

      let wouldMove = 0;
      let wouldSkip = 0;
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      const shapeById = new Map(shapes.map(n => [n.id, n]));

      for (const placement of layout.placements) {
        const target = shapeById.get(placement.nodeId);
        if (!target) { wouldSkip++; continue; }
        if (target.x !== Math.round(placement.x) || target.y !== Math.round(placement.y)) {
          wouldMove++;
        }
        minX = Math.min(minX, placement.x);
        minY = Math.min(minY, placement.y);
        maxX = Math.max(maxX, placement.x + target.width);
        maxY = Math.max(maxY, placement.y + target.height);
      }

      const preview: OrganizePreviewResult = {
        wouldMove,
        wouldSkip,
        estimatedCrossings: layout.diagnostics.crossingsReducedEstimate ?? 0,
        estimatedReduction: layout.diagnostics.crossingsReducedEstimate ?? 0,
        componentCount: layout.diagnostics.componentCount,
        boundingBox: {
          width: maxX > minX ? Math.round(maxX - minX) : 0,
          height: maxY > minY ? Math.round(maxY - minY) : 0
        }
      };

      postMessage({ type: "ORGANIZE_PREVIEW_RESULT", result: preview });
      return;
    }

    // ─── Bulk Operations ──────────────────────────────────────
    case "SELECT_BY_ROLE": {
      const targetRole = message.layoutRole;
      const matchingEntries = state.shapeEntries.filter(e => e.layoutRole === targetRole);
      const entryIds = new Set(matchingEntries.map(e => e.id));
      const nodeIds = Object.entries(state.nodeAssignments.shape)
        .filter(([, entryId]) => entryIds.has(entryId))
        .map(([nodeId]) => nodeId);

      const nodes = figma.currentPage.findAll(n =>
        n.type === "SHAPE_WITH_TEXT" && nodeIds.includes(n.id)
      );
      figma.currentPage.selection = nodes;
      sendSelectionState();
      sendActionResult({
        action: "SELECT_BY_ROLE",
        severity: nodes.length > 0 ? "info" : "warning",
        message: nodes.length > 0 ? `Selected ${nodes.length} "${targetRole}" shape(s).` : `No shapes assigned to role "${targetRole}".`,
        changed: nodes.length, skipped: 0
      });
      return;
    }

    case "SELECT_UNMAPPED": {
      const assignedShapeIds = new Set(Object.keys(state.nodeAssignments.shape));
      const assignedSystemIds = new Set(Object.keys(state.nodeAssignments.system));
      const nodes = figma.currentPage.findAll(n =>
        n.type === "SHAPE_WITH_TEXT" && !assignedShapeIds.has(n.id) && !assignedSystemIds.has(n.id)
      );
      figma.currentPage.selection = nodes;
      sendSelectionState();
      sendActionResult({
        action: "SELECT_UNMAPPED",
        severity: nodes.length > 0 ? "info" : "warning",
        message: nodes.length > 0 ? `Selected ${nodes.length} unmapped shape(s).` : "All shapes are mapped.",
        changed: nodes.length, skipped: 0
      });
      return;
    }

    case "SELECT_BY_SYSTEM": {
      const nodeIds = Object.entries(state.nodeAssignments.system)
        .filter(([, entryId]) => entryId === message.entryId)
        .map(([nodeId]) => nodeId);
      const nodes = figma.currentPage.findAll(n =>
        n.type === "SHAPE_WITH_TEXT" && nodeIds.includes(n.id)
      );
      figma.currentPage.selection = nodes;
      sendSelectionState();
      const entryName = state.systemEntries.find(e => e.id === message.entryId)?.name ?? "unknown";
      sendActionResult({
        action: "SELECT_BY_SYSTEM",
        severity: nodes.length > 0 ? "info" : "warning",
        message: nodes.length > 0 ? `Selected ${nodes.length} "${entryName}" shape(s).` : `No shapes assigned to "${entryName}".`,
        changed: nodes.length, skipped: 0
      });
      return;
    }

    case "CLEAR_ALL_ASSIGNMENTS": {
      const totalCleared = Object.keys(state.nodeAssignments.shape).length + Object.keys(state.nodeAssignments.system).length;
      state = { ...state, nodeAssignments: { system: {}, shape: {} } };
      savePluginStateV2(state);
      sendInitState();
      sendSelectionState();
      sendActionResult({
        action: "CLEAR_ALL_ASSIGNMENTS",
        severity: "info",
        message: `Cleared ${totalCleared} assignment(s).`,
        changed: totalCleared, skipped: 0
      });
      return;
    }

    // ─── Duplicate Entry ──────────────────────────────────────
    case "DUPLICATE_SHAPE_ENTRY": {
      const source = state.shapeEntries.find(e => e.id === message.entryId);
      if (!source) return;
      const dupe: ShapeLegendEntry = {
        ...source,
        id: `entry-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        name: `${source.name} (copy)`,
        order: state.shapeEntries.length + 1
      };
      upsertShapeEntry(dupe);
      savePluginStateV2(state);
      sendInitState();
      sendActionResult({
        action: "DUPLICATE_SHAPE_ENTRY",
        severity: "info",
        message: `Duplicated "${source.name}".`,
        changed: 1, skipped: 0
      });
      return;
    }

    case "DUPLICATE_SYSTEM_ENTRY": {
      const source = state.systemEntries.find(e => e.id === message.entryId);
      if (!source) return;
      const dupe: SystemLegendEntry = {
        ...source,
        id: `entry-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        name: `${source.name} (copy)`,
        order: state.systemEntries.length + 1
      };
      upsertSystemEntry(dupe);
      savePluginStateV2(state);
      sendInitState();
      sendActionResult({
        action: "DUPLICATE_SYSTEM_ENTRY",
        severity: "info",
        message: `Duplicated "${source.name}".`,
        changed: 1, skipped: 0
      });
      return;
    }

    default:
      return;
  }
};

sendInitState();
sendSelectionState();

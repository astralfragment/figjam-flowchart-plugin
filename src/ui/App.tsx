import { useEffect, useState } from "react";
import type { ChangeEvent } from "react";
import type { MainToUI, UIToMain } from "@shared/contracts";
import { LegendPanel } from "@ui/panels/LegendPanel";
import { OrganizePanel } from "@ui/panels/OrganizePanel";
import type {
  ActionResult,
  ApplyScope,
  BulkApplyDecision,
  BulkApplyPreview,
  LegendCandidateKind,
  LegendConversionDecision,
  LegendConversionCandidate,
  LayoutRole,
  OrganizeConfig,
  OrganizeDiagnostics,
  PluginState,
  PresetBundle,
  SelectionSummary,
  ThemeMode
} from "@shared/types";

const tabs = ["legend", "organize"] as const;
type TabKey = (typeof tabs)[number];

const defaultSelection: SelectionSummary = {
  total: 0,
  shapes: 0,
  connectors: 0,
  systemAssignedCount: 0,
  shapeAssignedCount: 0,
  unmappedCount: 0,
  systemBreakdown: [],
  shapeBreakdown: []
};

const defaultOrganizeConfig: OrganizeConfig = {
  preset: "flow_lr",
  spacingValue: 50,
  connectorStyle: "clean",
  nodeGap: 80,
  laneGap: 180,
  alignStrict: true,
  autoFixCrossings: true
};

const WINDOW_STORAGE_KEY = "fragment-flow.window-size";
const DEFAULT_WINDOW_SIZE = { width: 560, height: 820 };
const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

const loadStoredWindowSize = (): { width: number; height: number } => {
  try {
    const raw = localStorage.getItem(WINDOW_STORAGE_KEY);
    if (!raw) return DEFAULT_WINDOW_SIZE;
    const parsed = JSON.parse(raw) as { width?: unknown; height?: unknown };
    const width = typeof parsed.width === "number" ? parsed.width : DEFAULT_WINDOW_SIZE.width;
    const height = typeof parsed.height === "number" ? parsed.height : DEFAULT_WINDOW_SIZE.height;
    return { width: clamp(Math.round(width), 380, 960), height: clamp(Math.round(height), 560, 1200) };
  } catch {
    return DEFAULT_WINDOW_SIZE;
  }
};

const saveStoredWindowSize = (width: number, height: number): void => {
  try {
    localStorage.setItem(WINDOW_STORAGE_KEY, JSON.stringify({ width, height }));
  } catch {
    /* noop */
  }
};

const post = (message: UIToMain): void => {
  parent.postMessage({ pluginMessage: message }, "*");
};

const downloadJson = (filename: string, data: string): void => {
  const blob = new Blob([data], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
};

/* ── Main App ── */

export const App = (): JSX.Element => {
  const [activeTab, setActiveTab] = useState<TabKey>("legend");
  const [state, setState] = useState<PluginState | null>(null);
  const [selection, setSelection] = useState<SelectionSummary>(defaultSelection);
  const [lastResult, setLastResult] = useState<ActionResult | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [organizeConfig, setOrganizeConfig] = useState<OrganizeConfig>(defaultOrganizeConfig);
  const [organizeDiagnostics, setOrganizeDiagnostics] = useState<OrganizeDiagnostics | null>(null);
  const [windowSize, setWindowSize] = useState(loadStoredWindowSize);
  const [conversionCandidates, setConversionCandidates] = useState<LegendConversionCandidate[]>([]);
  const [bulkApplyPreview, setBulkApplyPreview] = useState<BulkApplyPreview | null>(null);

  useEffect(() => {
    window.onmessage = (event: MessageEvent<{ pluginMessage: MainToUI }>) => {
      const msg = event.data.pluginMessage;
      if (!msg) return;
      if (msg.type === "INIT_STATE") {
        setState(msg.state);
        setValidationError(null);
      }
      if (msg.type === "SELECTION_STATE") {
        setSelection(msg.selection);
      }
      if (msg.type === "ACTION_RESULT") {
        setLastResult(msg.result);
        setValidationError(null);
        setConversionCandidates([]);
        setBulkApplyPreview(null);
        if (msg.result.exportJson) downloadJson("fragment-flow-presets.json", msg.result.exportJson);
      }
      if (msg.type === "LEGEND_CONVERSION_PREVIEW") {
        setConversionCandidates(msg.candidates);
        setBulkApplyPreview(null);
        setValidationError(null);
      }
      if (msg.type === "BULK_APPLY_PREVIEW") {
        setBulkApplyPreview(msg.preview);
        setConversionCandidates([]);
        setValidationError(null);
      }
      if (msg.type === "VALIDATION_ERROR") {
        setValidationError(msg.error.message);
      }
    };
    post({ type: "INIT_REQUEST" });
    post({ type: "GET_SELECTION" });
    const ws = loadStoredWindowSize();
    post({ type: "RESIZE_UI", width: ws.width, height: ws.height });
  }, []);

  const themeMode: ThemeMode = state?.themeMode ?? "light";
  useEffect(() => {
    document.body.dataset.theme = themeMode;
  }, [themeMode]);

  const themeToggle = (): void => {
    if (state) post({ type: "SET_THEME_MODE", themeMode: state.themeMode === "light" ? "dark" : "light" });
  };

  const applyWindowSize = (next?: { width: number; height: number }): void => {
    const s = next ?? windowSize;
    const w = clamp(Math.round(s.width), 380, 960);
    const h = clamp(Math.round(s.height), 560, 1200);
    setWindowSize({ width: w, height: h });
    saveStoredWindowSize(w, h);
    post({ type: "RESIZE_UI", width: w, height: h });
    setValidationError(null);
  };

  const onImportBundle = (event: ChangeEvent<HTMLInputElement>): void => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        post({ type: "IMPORT_PRESETS", payload: JSON.parse(String(reader.result)) as PresetBundle });
      } catch {
        setValidationError("Could not parse JSON bundle.");
      }
    };
    reader.readAsText(file);
    event.target.value = "";
  };

  const footerMessage = validationError
    ? validationError
    : lastResult
      ? `${lastResult.message} (${lastResult.changed} changed, ${lastResult.skipped} skipped)`
      : "Ready";
  const footerSeverity = validationError ? "error" : lastResult?.severity ?? "info";

  const dismissResult = (): void => {
    setLastResult(null);
    setValidationError(null);
  };

  if (!state) {
    return <main className="app loading">Fragment Flow loading&hellip;</main>;
  }

  return (
    <main className="app">
      {/* ── Header ── */}
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark" aria-hidden="true">F</span>
          <div className="brand-text">
            <h1>Fragment Flow</h1>
            <span className="brand-tagline">Diagram organizer</span>
          </div>
        </div>
        <div className="topbar-actions">
          <button className="sm" onClick={() => post({ type: "EXPORT_PRESETS" })} title="Export legend presets as JSON">
            Export
          </button>
          <label className="file-input">
            <button className="sm">Import</button>
            <input type="file" accept="application/json" onChange={onImportBundle} />
          </label>
          <button className="icon-btn" onClick={themeToggle} title={state.themeMode === "light" ? "Switch to dark mode" : "Switch to light mode"}>
            {state.themeMode === "light" ? "\u263E" : "\u2600"}
          </button>
        </div>
      </header>

      {/* ── Tabs ── */}
      <nav className="tabs tabs-2" role="tablist">
        {tabs.map((tab) => (
          <button
            key={tab}
            role="tab"
            aria-selected={activeTab === tab}
            tabIndex={activeTab === tab ? 0 : -1}
            className={activeTab === tab ? "on" : ""}
            onClick={() => setActiveTab(tab)}
          >
            {tab === "legend" ? "Legend" : "Organize"}
          </button>
        ))}
      </nav>

      {/* ── Panel ── */}
      <section className="panel-area" role="tabpanel">
        {activeTab === "legend" && (
          <LegendPanel
            systemEntries={state.systemEntries}
            shapeEntries={state.shapeEntries}
            legendSets={state.legendSets}
            activeLegendSetId={state.activeLegendSetId}
            selection={selection}
            onSystemUpsert={(entry) => post({ type: "SYSTEM_ENTRY_UPSERT", entry })}
            onSystemDelete={(id) => post({ type: "SYSTEM_ENTRY_DELETE", entryId: id })}
            onShapeUpsert={(entry) => post({ type: "SHAPE_ENTRY_UPSERT", entry })}
            onShapeDelete={(id) => post({ type: "SHAPE_ENTRY_DELETE", entryId: id })}
            onSaveLegendSet={(name) => post({ type: "SAVE_LEGEND_SET", name })}
            onLoadLegendSet={(setId) => post({ type: "LOAD_LEGEND_SET", setId })}
            onDeleteLegendSet={(setId) => post({ type: "DELETE_LEGEND_SET", setId })}
            onAssignSystem={(entryId, nodeIds) => post({ type: "ASSIGN_SYSTEM", entryId, nodeIds })}
            onAssignShape={(entryId, nodeIds) => post({ type: "ASSIGN_SHAPE", entryId, nodeIds })}
            onUnassignSystem={(nodeIds) => post({ type: "UNASSIGN_SYSTEM", nodeIds })}
            onUnassignShape={(nodeIds) => post({ type: "UNASSIGN_SHAPE", nodeIds })}
            onApplyLegend={(scope: ApplyScope) => post({ type: "APPLY_LEGEND", scope })}
            conversionCandidates={conversionCandidates}
            bulkApplyPreview={bulkApplyPreview}
            onPreviewLegendConversion={() => post({ type: "PREVIEW_LEGEND_CONVERSION" })}
            onCommitLegendConversion={(decisions: LegendConversionDecision[]) => post({ type: "COMMIT_LEGEND_CONVERSION", decisions })}
            onQuickCreateFromSelection={(kind: Exclude<LegendCandidateKind, "ignore">, name: string, layoutRole: LayoutRole) => post({ type: "QUICK_CREATE_FROM_SELECTION", kind, name, layoutRole })}
            onImportSelectedStyle={(kind: Exclude<LegendCandidateKind, "ignore">, entryId: string) => post({ type: "IMPORT_SELECTED_STYLE_INTO_ENTRY", kind, entryId })}
            onPreviewBulkApply={() => post({ type: "PREVIEW_BULK_APPLY", scope: "selection" })}
            onCommitBulkApply={(preview: BulkApplyPreview, decisions: BulkApplyDecision[]) => post({ type: "COMMIT_BULK_APPLY", preview, decisions, scope: "selection" })}
            onDismissReview={() => {
              setConversionCandidates([]);
              setBulkApplyPreview(null);
            }}
          />
        )}

        {activeTab === "organize" && (
          <OrganizePanel
            config={organizeConfig}
            diagnostics={organizeDiagnostics}
            onConfigChange={setOrganizeConfig}
            onRun={() => post({ type: "RUN_ORGANIZE", config: organizeConfig, scope: "selection" })}
          />
        )}
      </section>

      {/* ── Toast ── */}
      {(lastResult || validationError) && (
        <div className={`toast toast--${footerSeverity}`} role="alert">
          <span>{footerMessage}</span>
          <button className="toast-x" onClick={dismissResult}>
            &times;
          </button>
        </div>
      )}

      {/* ── Footer ── */}
      <footer className="statusbar">
        <span className={`status-dot ${selection.total > 0 ? "live" : ""}`} />
        <p>
          {selection.total > 0
            ? `${selection.total} selected \u2014 ${selection.shapes} shapes, ${selection.connectors} connectors`
            : "Select shapes or connectors to begin"}
        </p>
      </footer>
    </main>
  );
};



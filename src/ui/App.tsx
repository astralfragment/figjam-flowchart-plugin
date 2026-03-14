import { useEffect, useState } from "react";
import type { ChangeEvent } from "react";
import type { MainToUIV2, UIToMainV2 } from "@shared/contracts";
import { LegendPanelV2 } from "@ui/panels/LegendPanelV2";
import { OrganizePanelV2 } from "@ui/panels/OrganizePanelV2";
import type {
  ActionResult,
  ApplyScope,
  OrganizeConfigV2,
  OrganizeDiagnosticsV2,
  PluginStateV2,
  PresetBundleV2,
  SelectionSummaryV2,
  ThemeMode
} from "@shared/types";

const tabs = ["legend", "organize"] as const;
type TabKey = (typeof tabs)[number];

const defaultSelectionV2: SelectionSummaryV2 = {
  total: 0,
  shapes: 0,
  connectors: 0,
  systemAssignedCount: 0,
  shapeAssignedCount: 0,
  unmappedCount: 0,
  systemBreakdown: [],
  shapeBreakdown: []
};

const defaultOrganizeConfigV2: OrganizeConfigV2 = {
  preset: "flow_lr",
  spacingValue: 50,
  connectorStyle: "clean",
  nodeGap: 80,
  laneGap: 180,
  alignStrict: true,
  autoFixCrossings: true
};

const WINDOW_STORAGE_KEY = "flowforge.window-size.v2";
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

const post = (message: UIToMainV2): void => {
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
  const [state, setState] = useState<PluginStateV2 | null>(null);
  const [selection, setSelection] = useState<SelectionSummaryV2>(defaultSelectionV2);
  const [lastResult, setLastResult] = useState<ActionResult | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [organizeConfig, setOrganizeConfig] = useState<OrganizeConfigV2>(defaultOrganizeConfigV2);
  const [organizeDiagnostics, setOrganizeDiagnostics] = useState<OrganizeDiagnosticsV2 | null>(null);
  const [windowSize, setWindowSize] = useState(loadStoredWindowSize);

  useEffect(() => {
    window.onmessage = (event: MessageEvent<{ pluginMessage: MainToUIV2 }>) => {
      const msg = event.data.pluginMessage;
      if (!msg) return;
      if (msg.type === "INIT_STATE_V2") {
        setState(msg.state);
        setValidationError(null);
      }
      if (msg.type === "SELECTION_STATE_V2") {
        setSelection(msg.selection);
      }
      if (msg.type === "ACTION_RESULT") {
        setLastResult(msg.result);
        setValidationError(null);
        if (msg.result.exportJson) downloadJson("flowforge-presets.json", msg.result.exportJson);
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
        post({ type: "IMPORT_PRESETS_V2", payload: JSON.parse(String(reader.result)) as PresetBundleV2 });
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
    return <main className="app loading">FlowForge loading&hellip;</main>;
  }

  return (
    <main className="app">
      {/* ── Header ── */}
      <header className="topbar">
        <div className="brand">
          <svg className="brand-mark" viewBox="0 0 20 20" width="20" height="20" fill="none">
            <rect x="1" y="1" width="7" height="7" rx="2" fill="var(--acc)" opacity=".85" />
            <rect x="12" y="1" width="7" height="7" rx="2" fill="var(--acc)" opacity=".5" />
            <rect x="1" y="12" width="7" height="7" rx="2" fill="var(--acc)" opacity=".5" />
            <rect x="12" y="12" width="7" height="7" rx="2" fill="var(--acc)" opacity=".3" />
            <path d="M8 4.5h4M4.5 8v4M15.5 8v4M8 15.5h4" stroke="var(--acc)" strokeWidth="1.2" strokeLinecap="round" opacity=".7" />
          </svg>
          <div className="brand-text">
            <h1>FlowForge</h1>
            <span className="brand-tagline">Diagram organizer</span>
          </div>
        </div>
        <div className="topbar-actions">
          <button className="sm" onClick={() => post({ type: "EXPORT_PRESETS_V2" })} title="Export legend presets as JSON">
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
          <LegendPanelV2
            systemEntries={state.systemEntries}
            shapeEntries={state.shapeEntries}
            selection={selection}
            onSystemUpsert={(entry) => post({ type: "SYSTEM_ENTRY_UPSERT", entry })}
            onSystemDelete={(id) => post({ type: "SYSTEM_ENTRY_DELETE", entryId: id })}
            onShapeUpsert={(entry) => post({ type: "SHAPE_ENTRY_UPSERT", entry })}
            onShapeDelete={(id) => post({ type: "SHAPE_ENTRY_DELETE", entryId: id })}
            onAssignSystem={(entryId, nodeIds) => post({ type: "ASSIGN_SYSTEM", entryId, nodeIds })}
            onAssignShape={(entryId, nodeIds) => post({ type: "ASSIGN_SHAPE", entryId, nodeIds })}
            onUnassignSystem={(nodeIds) => post({ type: "UNASSIGN_SYSTEM", nodeIds })}
            onUnassignShape={(nodeIds) => post({ type: "UNASSIGN_SHAPE", nodeIds })}
            onApplyLegend={(scope: ApplyScope) => post({ type: "APPLY_LEGEND", scope })}
          />
        )}

        {activeTab === "organize" && (
          <OrganizePanelV2
            config={organizeConfig}
            diagnostics={organizeDiagnostics}
            onConfigChange={setOrganizeConfig}
            onRun={() => post({ type: "RUN_ORGANIZE_V2", config: organizeConfig, scope: "selection" })}
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

import { useEffect, useMemo, useRef, useState } from "react";
import type { ChangeEvent, KeyboardEvent } from "react";
import type { MainToUI, UIToMain } from "@shared/contracts";
import type {
  ActionResult,
  ApplyScope,
  ConnectorStylePreset,
  FigJamShapeType,
  LegendCategory,
  OrganizeConfig,
  PluginStateV1,
  PresetBundleV1,
  SelectionSummary,
  ShapeStylePreset,
  ThemeMode
} from "@shared/types";

const tabs = ["styles", "legend", "connectors", "organize"] as const;
type TabKey = (typeof tabs)[number];

const defaultSelection: SelectionSummary = {
  total: 0,
  shapes: 0,
  connectors: 0
};

const WINDOW_STORAGE_KEY = "legendflow.window-size.v1";
const DEFAULT_WINDOW_SIZE = { width: 560, height: 820 };
const WINDOW_PRESETS = [
  { key: "compact", label: "Compact", width: 460, height: 700 },
  { key: "standard", label: "Standard", width: 560, height: 820 },
  { key: "wide", label: "Wide", width: 760, height: 920 }
] as const;
type WindowPresetKey = (typeof WINDOW_PRESETS)[number]["key"];
type LegendPreviewMode = "swatch" | "diagram";
type LegendFieldKey = "label" | "order" | "shapePresetId";

interface LegendPreviewItem {
  categoryId: string;
  order: number;
  label: string;
  marker?: string;
  shape: {
    fill: string;
    stroke: string;
    strokeWidth: number;
    textColor: string;
  };
  connector?: {
    stroke: string;
    strokeWidth: number;
    lineStyle: "solid" | "dashed" | "dotted";
    arrowStart: "none" | "line" | "triangle";
    arrowEnd: "none" | "line" | "triangle";
  };
  assignedCount: number;
  isMissingBinding: boolean;
}

const SHAPE_TYPE_OPTIONS: { value: FigJamShapeType; label: string }[] = [
  { value: "ROUNDED_RECTANGLE", label: "Rounded Rectangle" },
  { value: "SQUARE", label: "Square" },
  { value: "ELLIPSE", label: "Ellipse" },
  { value: "DIAMOND", label: "Diamond" },
  { value: "TRIANGLE_UP", label: "Triangle Up" },
  { value: "TRIANGLE_DOWN", label: "Triangle Down" },
  { value: "PARALLELOGRAM_RIGHT", label: "Parallelogram R" },
  { value: "PARALLELOGRAM_LEFT", label: "Parallelogram L" },
  { value: "ENG_DATABASE", label: "Database" },
  { value: "ENG_QUEUE", label: "Queue" },
  { value: "ENG_FILE", label: "File" },
  { value: "ENG_FOLDER", label: "Folder" },
  { value: "STAR", label: "Star" }
];

const shapeTypeLabel = (type?: FigJamShapeType): string => {
  if (!type) return "Any";
  return SHAPE_TYPE_OPTIONS.find((o) => o.value === type)?.label ?? type;
};

const HEX_6 = /^#?[0-9A-F]{6}$/i;
const HEX_8 = /^#?[0-9A-F]{8}$/i;

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

const normalizeHexColor = (value: string, fallback: string): string => {
  const fallbackColor = fallback.trim().toUpperCase();
  const raw = value.trim().toUpperCase();
  const candidate = raw.startsWith("#") ? raw : `#${raw}`;
  if (HEX_6.test(candidate)) return candidate;
  if (HEX_8.test(candidate)) return candidate.slice(0, 7);
  return fallbackColor;
};

const isHexColor = (value: string): boolean => HEX_6.test(value);

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

const nearestPresetKey = (size: { width: number; height: number }): WindowPresetKey => {
  let winner: (typeof WINDOW_PRESETS)[number] = WINDOW_PRESETS[0];
  let bestDistance = Number.POSITIVE_INFINITY;
  for (const preset of WINDOW_PRESETS) {
    const distance = Math.abs(size.width - preset.width) + Math.abs(size.height - preset.height);
    if (distance < bestDistance) {
      bestDistance = distance;
      winner = preset;
    }
  }
  return winner.key;
};

const makeId = (prefix: string): string =>
  `${prefix}-${Math.random().toString(36).slice(2, 8)}-${Date.now().toString(36)}`;

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

const defaultStyleDraft = (): ShapeStylePreset => ({
  id: makeId("shape"),
  name: "",
  targetNodeTypes: ["SHAPE_WITH_TEXT"],
  shapeType: "ROUNDED_RECTANGLE",
  fill: "#F6F8FC",
  stroke: "#5C6B8A",
  strokeWidth: 2,
  cornerRadius: 12,
  textColor: "#10223A",
  textSize: 16,
  textWeight: 500,
  opacity: 1
});

const defaultConnectorDraft = (): ConnectorStylePreset => ({
  id: makeId("connector"),
  name: "",
  stroke: "#5C6B8A",
  strokeWidth: 2,
  lineStyle: "solid",
  arrowStart: "none",
  arrowEnd: "triangle",
  opacity: 1
});

const defaultCategoryDraft = (): LegendCategory => ({
  id: makeId("category"),
  label: "",
  order: 1,
  shapePresetId: "",
  connectorPresetId: undefined,
  marker: ""
});

const defaultOrganizeConfig: OrganizeConfig = {
  preset: "process_lr",
  nodeGap: 80,
  laneGap: 180,
  alignStrict: true
};

/* ── Small components ── */

interface NumericInputProps {
  label: string;
  value: number;
  min?: number;
  max?: number;
  step?: number;
  onChange: (value: number) => void;
}

const NumericInput = ({ label, value, min, max, step, onChange }: NumericInputProps): JSX.Element => (
  <label className="field">
    <span>{label}</span>
    <input
      type="number"
      value={Number.isFinite(value) ? value : 0}
      min={min}
      max={max}
      step={step ?? 1}
      onChange={(e) => onChange(Number(e.target.value))}
    />
  </label>
);

interface ColorFieldProps {
  label: string;
  value: string;
  fallback: string;
  onChange: (value: string) => void;
}

const ColorField = ({ label, value, fallback, onChange }: ColorFieldProps): JSX.Element => (
  <label className="field">
    <span>{label}</span>
    <div className="color-row">
      <input
        type="color"
        value={isHexColor(value) ? normalizeHexColor(value, fallback) : normalizeHexColor(fallback, "#000000")}
        onChange={(e) => onChange(normalizeHexColor(e.target.value, fallback))}
      />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value.toUpperCase())}
        onBlur={(e) => onChange(normalizeHexColor(e.target.value, fallback))}
      />
    </div>
  </label>
);

const sanitizeStyleDraft = (preset: ShapeStylePreset): ShapeStylePreset => ({
  ...preset,
  fill: normalizeHexColor(preset.fill, "#F6F8FC"),
  stroke: normalizeHexColor(preset.stroke, "#5C6B8A"),
  strokeWidth: Math.max(0, preset.strokeWidth),
  textColor: normalizeHexColor(preset.textColor, "#10223A"),
  opacity: clamp(preset.opacity, 0.1, 1)
});

const sanitizeConnectorDraft = (preset: ConnectorStylePreset): ConnectorStylePreset => ({
  ...preset,
  stroke: normalizeHexColor(preset.stroke, "#5C6B8A"),
  opacity: clamp(preset.opacity, 0.1, 1)
});

/* ── Main App ── */

export const App = (): JSX.Element => {
  const [activeTab, setActiveTab] = useState<TabKey>("styles");
  const [scope, setScope] = useState<ApplyScope>("selection");
  const [state, setState] = useState<PluginStateV1 | null>(null);
  const [selection, setSelection] = useState<SelectionSummary>(defaultSelection);
  const [lastResult, setLastResult] = useState<ActionResult | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  const [styleDraft, setStyleDraft] = useState<ShapeStylePreset>(defaultStyleDraft);
  const [connectorDraft, setConnectorDraft] = useState<ConnectorStylePreset>(defaultConnectorDraft);
  const [categoryDraft, setCategoryDraft] = useState<LegendCategory>(defaultCategoryDraft);
  const [organizeConfig, setOrganizeConfig] = useState<OrganizeConfig>(defaultOrganizeConfig);
  const [showStyleAdvanced, setShowStyleAdvanced] = useState(false);
  const [showStyleLibrary, setShowStyleLibrary] = useState(true);
  const [stylePresetQuery, setStylePresetQuery] = useState("");
  const [connectorPresetQuery, setConnectorPresetQuery] = useState("");
  const [windowSize, setWindowSize] = useState(loadStoredWindowSize);
  const [windowPresetKey, setWindowPresetKey] = useState<WindowPresetKey>(() =>
    nearestPresetKey(loadStoredWindowSize())
  );
  const [legendPreviewMode, setLegendPreviewMode] = useState<LegendPreviewMode>("swatch");
  const [legendFieldErrors, setLegendFieldErrors] = useState<Partial<Record<LegendFieldKey, string>>>({});

  const tabRefs = useRef<Record<TabKey, HTMLButtonElement | null>>({
    styles: null,
    legend: null,
    connectors: null,
    organize: null
  });

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
        if (msg.result.exportJson) downloadJson("legendflow-presets-v1.json", msg.result.exportJson);
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

  useEffect(() => {
    if (state && !categoryDraft.shapePresetId) {
      setCategoryDraft((c) => ({ ...c, shapePresetId: state.shapePresets[0]?.id ?? "" }));
    }
  }, [state, categoryDraft.shapePresetId]);

  const themeMode: ThemeMode = state?.themeMode ?? "light";
  useEffect(() => {
    document.body.dataset.theme = themeMode;
  }, [themeMode]);

  const categoryUsage = useMemo(() => {
    if (!state) return new Map<string, number>();
    const counts = new Map<string, number>();
    for (const cid of Object.values(state.nodeCategoryAssignments)) {
      counts.set(cid, (counts.get(cid) ?? 0) + 1);
    }
    return counts;
  }, [state]);

  const isEditingCategory = useMemo(() => {
    return state?.categories.some((c) => c.id === categoryDraft.id) ?? false;
  }, [state, categoryDraft.id]);

  const legendPreviewItems = useMemo<LegendPreviewItem[]>(() => {
    if (!state) return [];
    const list = [...state.categories];
    const draftInState = list.some((c) => c.id === categoryDraft.id);
    if (draftInState) {
      for (let i = 0; i < list.length; i++) {
        if (list[i].id === categoryDraft.id) {
          list[i] = categoryDraft;
          break;
        }
      }
    } else if (categoryDraft.label.trim() || (categoryDraft.marker ?? "").trim()) {
      list.push(categoryDraft);
    }
    const sorted = [...list].sort((a, b) => a.order - b.order || a.label.localeCompare(b.label));
    return sorted.map((cat) => {
      const sp = state.shapePresets.find((p) => p.id === cat.shapePresetId);
      const cp = cat.connectorPresetId
        ? state.connectorPresets.find((p) => p.id === cat.connectorPresetId)
        : undefined;
      return {
        categoryId: cat.id,
        order: cat.order,
        label: cat.label || "Untitled",
        marker: cat.marker,
        shape: {
          fill: sp?.fill ?? "#DCE5F2",
          stroke: sp?.stroke ?? "#9FB1C8",
          strokeWidth: sp?.strokeWidth ?? 1,
          textColor: sp?.textColor ?? "#10223A"
        },
        connector: cp
          ? {
              stroke: cp.stroke,
              strokeWidth: cp.strokeWidth,
              lineStyle: cp.lineStyle,
              arrowStart: cp.arrowStart,
              arrowEnd: cp.arrowEnd
            }
          : undefined,
        assignedCount: categoryUsage.get(cat.id) ?? 0,
        isMissingBinding: !sp || Boolean(cat.connectorPresetId && !cp)
      };
    });
  }, [state, categoryDraft, categoryUsage]);

  const filteredStylePresets = useMemo(() => {
    if (!state) return [];
    const q = stylePresetQuery.trim().toLowerCase();
    if (!q) return state.shapePresets;
    return state.shapePresets.filter(
      (p) => `${p.name} ${p.targetNodeTypes.join(" ")} ${p.shapeType ?? ""}`.toLowerCase().includes(q)
    );
  }, [state, stylePresetQuery]);

  const filteredConnectorPresets = useMemo(() => {
    if (!state) return [];
    const q = connectorPresetQuery.trim().toLowerCase();
    if (!q) return state.connectorPresets;
    return state.connectorPresets.filter(
      (p) => `${p.name} ${p.lineStyle} ${p.arrowStart} ${p.arrowEnd}`.toLowerCase().includes(q)
    );
  }, [state, connectorPresetQuery]);

  const onTabKeyDown = (event: KeyboardEvent<HTMLButtonElement>, current: TabKey): void => {
    const i = tabs.indexOf(current);
    if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
    event.preventDefault();
    const dir = event.key === "ArrowRight" ? 1 : -1;
    const next = tabs[(i + dir + tabs.length) % tabs.length];
    setActiveTab(next);
    tabRefs.current[next]?.focus();
  };

  const themeToggle = (): void => {
    if (state) post({ type: "SET_THEME_MODE", themeMode: state.themeMode === "light" ? "dark" : "light" });
  };

  const applyWindowSize = (next?: { width: number; height: number }): void => {
    const s = next ?? windowSize;
    const w = clamp(Math.round(s.width), 380, 960);
    const h = clamp(Math.round(s.height), 560, 1200);
    setWindowSize({ width: w, height: h });
    setWindowPresetKey(nearestPresetKey({ width: w, height: h }));
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
        post({ type: "IMPORT_PRESETS", payload: JSON.parse(String(reader.result)) as PresetBundleV1 });
      } catch {
        setValidationError("Could not parse JSON bundle.");
      }
    };
    reader.readAsText(file);
    event.target.value = "";
  };

  const loadSelectionPreviewIntoDraft = (): void => {
    const p = selection.shapeStylePreview;
    if (!p) {
      setValidationError("Select a shape first.");
      return;
    }
    setStyleDraft(
      sanitizeStyleDraft({
        id: makeId("shape"),
        name: p.name,
        targetNodeTypes: p.targetNodeTypes,
        shapeType: p.shapeType,
        fill: p.fill,
        stroke: p.stroke,
        strokeWidth: p.strokeWidth,
        cornerRadius: p.cornerRadius,
        textColor: p.textColor,
        textSize: p.textSize,
        textWeight: p.textWeight,
        opacity: p.opacity
      })
    );
    setValidationError(null);
  };

  const saveStyleDraft = (): void => {
    if (!styleDraft.name.trim()) {
      setValidationError("Name is required.");
      return;
    }
    const s = sanitizeStyleDraft(styleDraft);
    if (!isHexColor(s.fill) || !isHexColor(s.stroke) || !isHexColor(s.textColor)) {
      setValidationError("Use hex colors like #1A2B3C.");
      return;
    }
    post({ type: "STYLE_PRESET_UPSERT", preset: s });
    setStyleDraft(defaultStyleDraft());
  };

  const clearLegendFieldError = (field: LegendFieldKey): void => {
    if (!legendFieldErrors[field]) return;
    setLegendFieldErrors((c) => {
      const n = { ...c };
      delete n[field];
      return n;
    });
  };

  const startNewCategoryDraft = (): void => {
    setCategoryDraft({
      ...defaultCategoryDraft(),
      shapePresetId: state?.shapePresets[0]?.id ?? "",
      order: state ? state.categories.length + 1 : 1
    });
    setLegendFieldErrors({});
    setValidationError(null);
  };

  const selectCategoryForEdit = (categoryId: string): void => {
    if (!state) return;
    const existing = state.categories.find((c) => c.id === categoryId);
    if (existing) {
      setCategoryDraft({ ...existing });
      setLegendFieldErrors({});
      setValidationError(null);
      return;
    }
    if (categoryDraft.id === categoryId) {
      setLegendFieldErrors({});
      setValidationError(null);
    }
  };

  const validateCategoryDraft = (): boolean => {
    const errs: Partial<Record<LegendFieldKey, string>> = {};
    if (!categoryDraft.label.trim()) errs.label = "Required.";
    if (!Number.isFinite(categoryDraft.order) || categoryDraft.order < 1) errs.order = "Must be \u22651.";
    if (!categoryDraft.shapePresetId) errs.shapePresetId = "Required.";
    setLegendFieldErrors(errs);
    if (Object.keys(errs).length > 0) {
      setValidationError("Fix highlighted fields.");
      return false;
    }
    setValidationError(null);
    return true;
  };

  const saveCategoryDraft = (): void => {
    if (!validateCategoryDraft()) return;
    post({ type: "CATEGORY_UPSERT", category: categoryDraft });
  };

  const deleteCategoryFromDraft = (): void => {
    if (!isEditingCategory) return;
    post({ type: "CATEGORY_DELETE", categoryId: categoryDraft.id });
    startNewCategoryDraft();
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
    return <main className="app loading">Loading&hellip;</main>;
  }

  return (
    <main className="app">
      {/* ── Header ── */}
      <header className="topbar">
        <div className="brand">
          <h1>LegendFlow</h1>
          <span className="tag">FigJam</span>
        </div>
        <div className="topbar-actions">
          <button onClick={() => post({ type: "EXPORT_PRESETS" })} title="Export presets">
            Export
          </button>
          <label className="file-input">
            <button>Import</button>
            <input type="file" accept="application/json" onChange={onImportBundle} />
          </label>
          <button onClick={themeToggle} title="Toggle theme">
            {state.themeMode === "light" ? "\u263E" : "\u2600"}
          </button>
          <div className="size-group">
            {WINDOW_PRESETS.map((p) => (
              <button
                key={p.key}
                className={windowPresetKey === p.key ? "active" : ""}
                onClick={() => applyWindowSize({ width: p.width, height: p.height })}
                title={`${p.label} (${p.width}\u00d7${p.height})`}
              >
                {p.label[0]}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* ── Scope ── */}
      <div className="scopebar">
        <div className="scope-toggle" role="radiogroup">
          <label className={scope === "selection" ? "on" : ""}>
            <input type="radio" name="scope" checked={scope === "selection"} onChange={() => setScope("selection")} />
            Selection {selection.total > 0 && <b>{selection.total}</b>}
          </label>
          <label className={scope === "board" ? "on" : ""}>
            <input type="radio" name="scope" checked={scope === "board"} onChange={() => setScope("board")} />
            Board
          </label>
        </div>
        <div className="scope-stats">
          <span className="dot dot-shape" />
          {selection.shapes} shp
          <span className="dot dot-conn" />
          {selection.connectors} conn
        </div>
      </div>

      {/* ── Tabs ── */}
      <nav className="tabs" role="tablist">
        {tabs.map((tab) => (
          <button
            key={tab}
            ref={(el) => {
              tabRefs.current[tab] = el;
            }}
            role="tab"
            aria-selected={activeTab === tab}
            tabIndex={activeTab === tab ? 0 : -1}
            className={activeTab === tab ? "on" : ""}
            onKeyDown={(e) => onTabKeyDown(e, tab)}
            onClick={() => setActiveTab(tab)}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </nav>

      {/* ── Panel ── */}
      <section className="panel" role="tabpanel">
        {/* ═══ STYLES ═══ */}
        {activeTab === "styles" && (
          <>
            <div className="split">
              {/* Preview */}
              <div className="card card--outline">
                <h4>Selection Preview</h4>
                {selection.shapeStylePreview ? (
                  <>
                    <div
                      className="preview-shape"
                      style={{
                        background: selection.shapeStylePreview.fill,
                        borderColor:
                          selection.shapeStylePreview.strokeWidth > 0
                            ? selection.shapeStylePreview.stroke
                            : "transparent",
                        borderWidth: `${selection.shapeStylePreview.strokeWidth}px`,
                        borderStyle: "solid",
                        opacity: selection.shapeStylePreview.opacity
                      }}
                    >
                      <span
                        style={{
                          color: selection.shapeStylePreview.textColor,
                          fontSize: `${Math.min(selection.shapeStylePreview.textSize, 18)}px`,
                          fontWeight: selection.shapeStylePreview.textWeight
                        }}
                      >
                        Preview
                      </span>
                    </div>
                    <div className="prop-grid">
                      <span className="prop-chip">
                        <span className="dot-preview" style={{ background: selection.shapeStylePreview.fill }} />
                        {selection.shapeStylePreview.fill}
                      </span>
                      <span className="prop-chip">
                        <span className="dot-preview" style={{ background: selection.shapeStylePreview.stroke }} />
                        {selection.shapeStylePreview.stroke}/{selection.shapeStylePreview.strokeWidth}px
                      </span>
                      <span className="prop-chip">
                        <span className="dot-preview" style={{ background: selection.shapeStylePreview.textColor }} />
                        Text
                      </span>
                      {selection.shapeStylePreview.shapeType && (
                        <span className="prop-chip">{shapeTypeLabel(selection.shapeStylePreview.shapeType)}</span>
                      )}
                    </div>
                    <div className="btn-row">
                      <button onClick={loadSelectionPreviewIntoDraft}>Load into editor</button>
                      <button className="primary" onClick={() => post({ type: "CREATE_STYLE_FROM_SELECTED" })}>
                        Quick create
                      </button>
                    </div>
                  </>
                ) : (
                  <p className="muted center">Select a shape to preview its style.</p>
                )}
              </div>

              {/* Editor */}
              <div className="card">
                <div className="card-head">
                  <h4>Preset Editor</h4>
                  <button className="primary sm" onClick={saveStyleDraft}>
                    Save
                  </button>
                </div>
                <div className="grid-2">
                  <label className="field">
                    <span>Name</span>
                    <input
                      value={styleDraft.name}
                      placeholder="e.g. Process Node"
                      onChange={(e) => setStyleDraft({ ...styleDraft, name: e.target.value })}
                    />
                  </label>
                  <label className="field">
                    <span>Shape type</span>
                    <select
                      value={styleDraft.shapeType ?? ""}
                      onChange={(e) =>
                        setStyleDraft({
                          ...styleDraft,
                          shapeType: (e.target.value || undefined) as FigJamShapeType | undefined
                        })
                      }
                    >
                      <option value="">Any shape</option>
                      {SHAPE_TYPE_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <ColorField
                    label="Fill"
                    value={styleDraft.fill}
                    fallback="#F6F8FC"
                    onChange={(v) => setStyleDraft({ ...styleDraft, fill: v })}
                  />
                  <ColorField
                    label="Stroke"
                    value={styleDraft.stroke}
                    fallback="#5C6B8A"
                    onChange={(v) => setStyleDraft({ ...styleDraft, stroke: v })}
                  />
                  <NumericInput
                    label="Stroke W"
                    value={styleDraft.strokeWidth}
                    min={0}
                    max={24}
                    step={0.5}
                    onChange={(v) => setStyleDraft({ ...styleDraft, strokeWidth: v })}
                  />
                  <ColorField
                    label="Text color"
                    value={styleDraft.textColor}
                    fallback="#10223A"
                    onChange={(v) => setStyleDraft({ ...styleDraft, textColor: v })}
                  />
                  <NumericInput
                    label="Text size"
                    value={styleDraft.textSize}
                    min={8}
                    max={72}
                    onChange={(v) => setStyleDraft({ ...styleDraft, textSize: v })}
                  />
                </div>
                <button className="ghost sm" onClick={() => setShowStyleAdvanced(!showStyleAdvanced)}>
                  {showStyleAdvanced ? "\u25B4 Hide advanced" : "\u25BE Advanced"}
                </button>
                {showStyleAdvanced && (
                  <div className="grid-2">
                    <NumericInput
                      label="Radius"
                      value={styleDraft.cornerRadius}
                      min={0}
                      max={64}
                      onChange={(v) => setStyleDraft({ ...styleDraft, cornerRadius: v })}
                    />
                    <NumericInput
                      label="Weight"
                      value={styleDraft.textWeight}
                      min={100}
                      max={900}
                      step={100}
                      onChange={(v) => setStyleDraft({ ...styleDraft, textWeight: v })}
                    />
                    <NumericInput
                      label="Opacity"
                      value={styleDraft.opacity}
                      min={0.1}
                      max={1}
                      step={0.1}
                      onChange={(v) => setStyleDraft({ ...styleDraft, opacity: v })}
                    />
                    <label className="field">
                      <span>Node types</span>
                      <input
                        value={styleDraft.targetNodeTypes.join(",")}
                        onChange={(e) =>
                          setStyleDraft({
                            ...styleDraft,
                            targetNodeTypes: e.target.value
                              .split(",")
                              .map((s) => s.trim())
                              .filter(Boolean)
                          })
                        }
                      />
                    </label>
                    <button className="ghost sm" onClick={() => setStyleDraft(defaultStyleDraft())}>
                      Reset
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Library */}
            <div className="divider">
              <span>Library ({state.shapePresets.length})</span>
              <button className="ghost sm" onClick={() => setShowStyleLibrary((c) => !c)}>
                {showStyleLibrary ? "Collapse" : "Expand"}
              </button>
            </div>

            {showStyleLibrary && (
              <>
                <div className="toolbar">
                  <input
                    className="search"
                    placeholder="Search presets\u2026"
                    value={stylePresetQuery}
                    onChange={(e) => setStylePresetQuery(e.target.value)}
                  />
                  <span className="count">
                    {filteredStylePresets.length}/{state.shapePresets.length}
                  </span>
                </div>
                <div className="list">
                  {filteredStylePresets.map((p) => (
                    <div key={p.id} className="preset-row">
                      <div className="swatches">
                        <span style={{ background: p.fill }} />
                        <span style={{ background: p.stroke }} />
                        <span style={{ background: p.textColor }} />
                      </div>
                      <div className="preset-info">
                        <strong>{p.name}</strong>
                        <small>{shapeTypeLabel(p.shapeType)}</small>
                      </div>
                      <div className="preset-btns">
                        <button
                          className="primary sm"
                          onClick={() => post({ type: "APPLY_STYLE_PRESET", presetId: p.id, scope })}
                        >
                          Apply
                        </button>
                        <button className="sm" onClick={() => setStyleDraft(sanitizeStyleDraft({ ...p }))}>
                          Edit
                        </button>
                        <button
                          className="sm"
                          onClick={() =>
                            setStyleDraft(
                              sanitizeStyleDraft({ ...p, id: makeId("shape"), name: `${p.name} Copy` })
                            )
                          }
                        >
                          Dup
                        </button>
                        <button
                          className="sm danger"
                          onClick={() => post({ type: "STYLE_PRESET_DELETE", presetId: p.id })}
                        >
                          Del
                        </button>
                      </div>
                    </div>
                  ))}
                  {filteredStylePresets.length === 0 && <p className="muted center">No presets found.</p>}
                </div>
              </>
            )}
          </>
        )}

        {/* ═══ LEGEND ═══ */}
        {activeTab === "legend" && (
          <div className="legend-split">
            {/* Editor */}
            <div className="card">
              <div className="card-head">
                <h4>{isEditingCategory ? "Edit Category" : "New Category"}</h4>
              </div>
              <div className="grid-2">
                <label className={`field ${legendFieldErrors.label ? "invalid" : ""}`}>
                  <span>Label</span>
                  <input
                    value={categoryDraft.label}
                    placeholder="e.g. Decision"
                    onChange={(e) => {
                      setCategoryDraft({ ...categoryDraft, label: e.target.value });
                      clearLegendFieldError("label");
                    }}
                  />
                  {legendFieldErrors.label && <small className="err">{legendFieldErrors.label}</small>}
                </label>
                <label className={`field ${legendFieldErrors.order ? "invalid" : ""}`}>
                  <span>Order</span>
                  <input
                    type="number"
                    value={Number.isFinite(categoryDraft.order) ? categoryDraft.order : 1}
                    min={1}
                    max={999}
                    onChange={(e) => {
                      setCategoryDraft({ ...categoryDraft, order: Number(e.target.value) });
                      clearLegendFieldError("order");
                    }}
                  />
                  {legendFieldErrors.order && <small className="err">{legendFieldErrors.order}</small>}
                </label>
                <label className={`field ${legendFieldErrors.shapePresetId ? "invalid" : ""}`}>
                  <span>Shape preset</span>
                  <select
                    value={categoryDraft.shapePresetId}
                    onChange={(e) => {
                      setCategoryDraft({ ...categoryDraft, shapePresetId: e.target.value });
                      clearLegendFieldError("shapePresetId");
                    }}
                  >
                    {state.shapePresets.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                  {legendFieldErrors.shapePresetId && (
                    <small className="err">{legendFieldErrors.shapePresetId}</small>
                  )}
                </label>
                <label className="field">
                  <span>Connector</span>
                  <select
                    value={categoryDraft.connectorPresetId ?? ""}
                    onChange={(e) =>
                      setCategoryDraft({ ...categoryDraft, connectorPresetId: e.target.value || undefined })
                    }
                  >
                    <option value="">None</option>
                    {state.connectorPresets.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="field">
                  <span>Marker</span>
                  <input
                    value={categoryDraft.marker ?? ""}
                    placeholder="P"
                    onChange={(e) => setCategoryDraft({ ...categoryDraft, marker: e.target.value })}
                  />
                </label>
              </div>
              <div className="btn-row">
                <button className="primary" onClick={saveCategoryDraft}>
                  Save
                </button>
                <button onClick={startNewCategoryDraft}>New</button>
                {isEditingCategory && (
                  <button className="danger" onClick={deleteCategoryFromDraft}>
                    Delete
                  </button>
                )}
              </div>

              <div className="divider">
                <span>Categories</span>
              </div>
              <div className="cat-list">
                {state.categories.map((cat) => (
                  <div
                    key={cat.id}
                    className={`cat-row ${categoryDraft.id === cat.id ? "on" : ""}`}
                    onClick={() => selectCategoryForEdit(cat.id)}
                  >
                    <span className="cat-marker">{cat.marker?.trim() || cat.order}</span>
                    <div className="cat-info">
                      <strong>{cat.label}</strong>
                      <small>{categoryUsage.get(cat.id) ?? 0} assigned</small>
                    </div>
                    <button
                      className="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        post({ type: "ASSIGN_CATEGORY", categoryId: cat.id, nodeIds: [] });
                      }}
                    >
                      Assign
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Preview */}
            <div className="card card--outline">
              <div className="card-head">
                <div className="toggle-group">
                  <button
                    className={legendPreviewMode === "swatch" ? "on" : ""}
                    onClick={() => setLegendPreviewMode("swatch")}
                  >
                    Swatch
                  </button>
                  <button
                    className={legendPreviewMode === "diagram" ? "on" : ""}
                    onClick={() => setLegendPreviewMode("diagram")}
                  >
                    Diagram
                  </button>
                </div>
                <button className="primary sm" onClick={() => post({ type: "APPLY_LEGEND_MAPPING", scope })}>
                  Apply mapping
                </button>
              </div>

              {legendPreviewItems.length === 0 && (
                <p className="muted center">Create a category to see the legend.</p>
              )}

              {legendPreviewMode === "swatch" && (
                <div className="swatch-list">
                  {legendPreviewItems.map((item) => (
                    <button
                      key={item.categoryId}
                      className={`swatch-row ${categoryDraft.id === item.categoryId ? "on" : ""} ${item.isMissingBinding ? "warn" : ""}`}
                      onClick={() => selectCategoryForEdit(item.categoryId)}
                    >
                      <span className="cat-marker">{item.marker?.trim() || item.order}</span>
                      <span className="swatch-info">
                        <strong>{item.label}</strong>
                        <small>{item.assignedCount} assigned</small>
                      </span>
                      <span
                        className="swatch-color"
                        style={{
                          background: item.shape.fill,
                          borderColor: item.shape.stroke,
                          borderWidth: `${item.shape.strokeWidth}px`,
                          borderStyle: "solid",
                          color: item.shape.textColor
                        }}
                      >
                        Aa
                      </span>
                      {item.connector && (
                        <span
                          className={`swatch-line ${item.connector.lineStyle}`}
                          style={{
                            borderColor: item.connector.stroke,
                            borderTopWidth: `${Math.max(1, item.connector.strokeWidth)}px`
                          }}
                        />
                      )}
                      {item.isMissingBinding && <span className="badge-warn">!</span>}
                    </button>
                  ))}
                </div>
              )}

              {legendPreviewMode === "diagram" && (
                <div className="diagram">
                  {legendPreviewItems.map((item, i) => (
                    <div key={item.categoryId} className="diagram-wrap">
                      <button
                        className={`diagram-node ${categoryDraft.id === item.categoryId ? "on" : ""}`}
                        onClick={() => selectCategoryForEdit(item.categoryId)}
                        style={{
                          background: item.shape.fill,
                          borderColor: item.shape.stroke,
                          borderWidth: `${item.shape.strokeWidth}px`,
                          borderStyle: "solid",
                          color: item.shape.textColor
                        }}
                      >
                        <strong>
                          {item.order}. {item.label}
                        </strong>
                        <small>{item.assignedCount} assigned</small>
                      </button>
                      {i < legendPreviewItems.length - 1 && (
                        <div
                          className={`diagram-link ${item.connector?.lineStyle ?? "solid"}`}
                          style={{
                            borderColor: item.connector?.stroke ?? "var(--b2)",
                            borderLeftWidth: `${Math.max(1, item.connector?.strokeWidth ?? 1)}px`
                          }}
                        />
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ═══ CONNECTORS ═══ */}
        {activeTab === "connectors" && (
          <>
            <div className="card">
              <div className="card-head">
                <h4>Connector Editor</h4>
                <button
                  className="primary sm"
                  onClick={() => {
                    if (!connectorDraft.name.trim()) {
                      setValidationError("Name is required.");
                      return;
                    }
                    const s = sanitizeConnectorDraft(connectorDraft);
                    if (!isHexColor(s.stroke)) {
                      setValidationError("Use hex color.");
                      return;
                    }
                    post({ type: "CONNECTOR_PRESET_UPSERT", preset: s });
                    setConnectorDraft(defaultConnectorDraft());
                  }}
                >
                  Save
                </button>
              </div>
              <div className="grid-2">
                <label className="field">
                  <span>Name</span>
                  <input
                    value={connectorDraft.name}
                    placeholder="e.g. Default Flow"
                    onChange={(e) => setConnectorDraft({ ...connectorDraft, name: e.target.value })}
                  />
                </label>
                <ColorField
                  label="Stroke"
                  value={connectorDraft.stroke}
                  fallback="#5C6B8A"
                  onChange={(v) => setConnectorDraft({ ...connectorDraft, stroke: v })}
                />
                <NumericInput
                  label="Stroke W"
                  value={connectorDraft.strokeWidth}
                  min={0}
                  max={24}
                  step={0.5}
                  onChange={(v) => setConnectorDraft({ ...connectorDraft, strokeWidth: v })}
                />
                <label className="field">
                  <span>Line style</span>
                  <select
                    value={connectorDraft.lineStyle}
                    onChange={(e) =>
                      setConnectorDraft({
                        ...connectorDraft,
                        lineStyle: e.target.value as ConnectorStylePreset["lineStyle"]
                      })
                    }
                  >
                    <option value="solid">Solid</option>
                    <option value="dashed">Dashed</option>
                    <option value="dotted">Dotted</option>
                  </select>
                </label>
                <label className="field">
                  <span>Arrow start</span>
                  <select
                    value={connectorDraft.arrowStart}
                    onChange={(e) =>
                      setConnectorDraft({
                        ...connectorDraft,
                        arrowStart: e.target.value as ConnectorStylePreset["arrowStart"]
                      })
                    }
                  >
                    <option value="none">None</option>
                    <option value="line">Line</option>
                    <option value="triangle">Triangle</option>
                  </select>
                </label>
                <label className="field">
                  <span>Arrow end</span>
                  <select
                    value={connectorDraft.arrowEnd}
                    onChange={(e) =>
                      setConnectorDraft({
                        ...connectorDraft,
                        arrowEnd: e.target.value as ConnectorStylePreset["arrowEnd"]
                      })
                    }
                  >
                    <option value="none">None</option>
                    <option value="line">Line</option>
                    <option value="triangle">Triangle</option>
                  </select>
                </label>
                <NumericInput
                  label="Opacity"
                  value={connectorDraft.opacity}
                  min={0.1}
                  max={1}
                  step={0.1}
                  onChange={(v) => setConnectorDraft({ ...connectorDraft, opacity: v })}
                />
              </div>
            </div>

            <div className="divider">
              <span>Saved ({state.connectorPresets.length})</span>
            </div>
            <div className="toolbar">
              <input
                className="search"
                placeholder="Search\u2026"
                value={connectorPresetQuery}
                onChange={(e) => setConnectorPresetQuery(e.target.value)}
              />
              <span className="count">
                {filteredConnectorPresets.length}/{state.connectorPresets.length}
              </span>
            </div>
            <div className="list">
              {filteredConnectorPresets.map((p) => (
                <div key={p.id} className="preset-row">
                  <svg width="36" height="16" viewBox="0 0 36 16" className="conn-preview">
                    <line
                      x1="2"
                      y1="8"
                      x2="34"
                      y2="8"
                      stroke={p.stroke}
                      strokeWidth={Math.max(1, p.strokeWidth)}
                      strokeDasharray={
                        p.lineStyle === "dashed" ? "5,3" : p.lineStyle === "dotted" ? "2,2" : "none"
                      }
                    />
                    {p.arrowEnd !== "none" && <polygon points="34,8 28,5 28,11" fill={p.stroke} />}
                  </svg>
                  <div className="preset-info">
                    <strong>{p.name}</strong>
                    <small>
                      {p.lineStyle} &middot; {p.arrowStart}&rarr;{p.arrowEnd}
                    </small>
                  </div>
                  <div className="preset-btns">
                    <button
                      className="primary sm"
                      onClick={() => post({ type: "APPLY_CONNECTOR_PRESET", presetId: p.id, scope })}
                    >
                      Normalize
                    </button>
                    <button className="sm" onClick={() => setConnectorDraft(sanitizeConnectorDraft({ ...p }))}>
                      Edit
                    </button>
                    <button
                      className="sm danger"
                      onClick={() => post({ type: "CONNECTOR_PRESET_DELETE", presetId: p.id })}
                    >
                      Del
                    </button>
                  </div>
                </div>
              ))}
              {filteredConnectorPresets.length === 0 && <p className="muted center">No connectors found.</p>}
            </div>
          </>
        )}

        {/* ═══ ORGANIZE ═══ */}
        {activeTab === "organize" && (
          <>
            <div className="card">
              <div className="card-head">
                <h4>Layout</h4>
                <button
                  className="primary"
                  onClick={() => post({ type: "RUN_ORGANIZE", config: organizeConfig, scope })}
                >
                  Run organize
                </button>
              </div>
              <div className="grid-2">
                <label className="field">
                  <span>Preset</span>
                  <select
                    value={organizeConfig.preset}
                    onChange={(e) =>
                      setOrganizeConfig({
                        ...organizeConfig,
                        preset: e.target.value as OrganizeConfig["preset"]
                      })
                    }
                  >
                    <option value="process_lr">Process LR</option>
                    <option value="hierarchy_tb">Hierarchy TB</option>
                    <option value="swimlane_category">Swimlane by Category</option>
                  </select>
                </label>
                <NumericInput
                  label="Node gap"
                  value={organizeConfig.nodeGap}
                  min={20}
                  max={400}
                  step={10}
                  onChange={(v) => setOrganizeConfig({ ...organizeConfig, nodeGap: v })}
                />
                <NumericInput
                  label="Lane gap"
                  value={organizeConfig.laneGap}
                  min={60}
                  max={600}
                  step={20}
                  onChange={(v) => setOrganizeConfig({ ...organizeConfig, laneGap: v })}
                />
                <label className="field field--check">
                  <input
                    type="checkbox"
                    checked={organizeConfig.alignStrict}
                    onChange={(e) => setOrganizeConfig({ ...organizeConfig, alignStrict: e.target.checked })}
                  />
                  <span>Strict pixel grid</span>
                </label>
              </div>
            </div>
            <div className="card card--outline">
              <h4>Tips</h4>
              <ul className="tips">
                <li>
                  Use <b>Selection</b> scope first for a safe preview
                </li>
                <li>
                  <b>Swimlane</b> groups shapes by legend category
                </li>
                <li>
                  Undo with <kbd>Ctrl+Z</kbd> / <kbd>Cmd+Z</kbd>
                </li>
              </ul>
            </div>
          </>
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

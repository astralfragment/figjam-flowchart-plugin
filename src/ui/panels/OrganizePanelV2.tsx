import { useState } from "react";
import type { JSX } from "react";
import { NumericInput } from "@ui/components/FormFields";
import type {
  ConnectorStyleOption,
  LayoutPresetV2,
  OrganizeConfigV2,
  OrganizeDiagnosticsV2
} from "@shared/types";

interface OrganizePanelV2Props {
  config: OrganizeConfigV2;
  diagnostics: OrganizeDiagnosticsV2 | null;
  onConfigChange: (config: OrganizeConfigV2) => void;
  onRun: () => void;
}

const PRESET_OPTIONS: {
  value: LayoutPresetV2;
  title: string;
  description: string;
  icon: JSX.Element;
}[] = [
  {
    value: "flow_lr",
    title: "Flow \u2192",
    description: "Left-to-right process maps and operational workflows.",
    icon: (
      <svg viewBox="0 0 48 24" width="48" height="24">
        <rect x="1" y="6" width="10" height="12" rx="2" fill="var(--teal)" opacity=".25" stroke="var(--teal)" strokeWidth="1" />
        <line x1="12" y1="12" x2="18" y2="12" stroke="var(--t2)" strokeWidth="1" markerEnd="url(#arrowV2)" />
        <rect x="19" y="6" width="10" height="12" rx="2" fill="var(--teal)" opacity=".25" stroke="var(--teal)" strokeWidth="1" />
        <line x1="30" y1="12" x2="36" y2="12" stroke="var(--t2)" strokeWidth="1" markerEnd="url(#arrowV2)" />
        <rect x="37" y="6" width="10" height="12" rx="2" fill="var(--teal)" opacity=".25" stroke="var(--teal)" strokeWidth="1" />
      </svg>
    )
  },
  {
    value: "flow_tb",
    title: "Flow \u2193",
    description: "Top-to-bottom sequential process with vertical layering.",
    icon: (
      <svg viewBox="0 0 24 48" width="24" height="48">
        <rect x="4" y="1" width="16" height="10" rx="2" fill="var(--teal)" opacity=".25" stroke="var(--teal)" strokeWidth="1" />
        <line x1="12" y1="12" x2="12" y2="18" stroke="var(--t2)" strokeWidth="1" />
        <rect x="4" y="19" width="16" height="10" rx="2" fill="var(--teal)" opacity=".25" stroke="var(--teal)" strokeWidth="1" />
        <line x1="12" y1="30" x2="12" y2="36" stroke="var(--t2)" strokeWidth="1" />
        <rect x="4" y="37" width="16" height="10" rx="2" fill="var(--teal)" opacity=".25" stroke="var(--teal)" strokeWidth="1" />
      </svg>
    )
  },
  {
    value: "tree",
    title: "Tree",
    description: "Top-down branching with decision/fork separation and tree balancing.",
    icon: (
      <svg viewBox="0 0 48 36" width="48" height="36">
        <rect x="17" y="1" width="14" height="8" rx="2" fill="var(--acc)" opacity=".2" stroke="var(--acc)" strokeWidth="1" />
        <line x1="20" y1="10" x2="10" y2="18" stroke="var(--t2)" strokeWidth="1" />
        <line x1="28" y1="10" x2="38" y2="18" stroke="var(--t2)" strokeWidth="1" />
        <rect x="2" y="19" width="14" height="8" rx="2" fill="var(--teal)" opacity=".25" stroke="var(--teal)" strokeWidth="1" />
        <rect x="32" y="19" width="14" height="8" rx="2" fill="var(--teal)" opacity=".25" stroke="var(--teal)" strokeWidth="1" />
      </svg>
    )
  },
  {
    value: "swimlane",
    title: "Swimlane",
    description: "Keeps system lanes aligned, reduces crossings within lanes.",
    icon: (
      <svg viewBox="0 0 48 32" width="48" height="32">
        <line x1="16" y1="0" x2="16" y2="32" stroke="var(--b2)" strokeWidth="1" strokeDasharray="2,2" />
        <line x1="32" y1="0" x2="32" y2="32" stroke="var(--b2)" strokeWidth="1" strokeDasharray="2,2" />
        <rect x="3" y="4" width="10" height="6" rx="1.5" fill="var(--teal)" opacity=".25" stroke="var(--teal)" strokeWidth="1" />
        <rect x="3" y="14" width="10" height="6" rx="1.5" fill="var(--teal)" opacity=".25" stroke="var(--teal)" strokeWidth="1" />
        <rect x="19" y="8" width="10" height="6" rx="1.5" fill="var(--acc)" opacity=".2" stroke="var(--acc)" strokeWidth="1" />
        <rect x="35" y="4" width="10" height="6" rx="1.5" fill="var(--teal)" opacity=".25" stroke="var(--teal)" strokeWidth="1" />
        <rect x="35" y="18" width="10" height="6" rx="1.5" fill="var(--teal)" opacity=".25" stroke="var(--teal)" strokeWidth="1" />
      </svg>
    )
  },
  {
    value: "compact",
    title: "Compact",
    description: "Tight grid for smaller board footprint.",
    icon: (
      <svg viewBox="0 0 36 28" width="36" height="28">
        <rect x="1" y="1" width="10" height="8" rx="1.5" fill="var(--teal)" opacity=".25" stroke="var(--teal)" strokeWidth="1" />
        <rect x="13" y="1" width="10" height="8" rx="1.5" fill="var(--teal)" opacity=".25" stroke="var(--teal)" strokeWidth="1" />
        <rect x="25" y="1" width="10" height="8" rx="1.5" fill="var(--teal)" opacity=".25" stroke="var(--teal)" strokeWidth="1" />
        <rect x="1" y="11" width="10" height="8" rx="1.5" fill="var(--teal)" opacity=".25" stroke="var(--teal)" strokeWidth="1" />
        <rect x="13" y="11" width="10" height="8" rx="1.5" fill="var(--teal)" opacity=".25" stroke="var(--teal)" strokeWidth="1" />
        <rect x="25" y="11" width="10" height="8" rx="1.5" fill="var(--teal)" opacity=".25" stroke="var(--teal)" strokeWidth="1" />
      </svg>
    )
  }
];

const CONNECTOR_STYLE_OPTIONS: {
  value: ConnectorStyleOption;
  title: string;
  description: string;
}[] = [
  { value: "clean", title: "Clean", description: "Elbowed paths with spread ports — best for most flowcharts." },
  { value: "smooth", title: "Smooth", description: "Curved paths for organic-looking diagrams." },
  { value: "direct", title: "Direct", description: "Straight point-to-point lines for simple graphs." }
];

const SPACING_LABELS = ["Compact", "Balanced", "Spacious"];
const spacingLabelIndex = (value: number): number => {
  if (value <= 30) return 0;
  if (value >= 70) return 2;
  return 1;
};

export const OrganizePanelV2 = ({
  config,
  diagnostics,
  onConfigChange,
  onRun
}: OrganizePanelV2Props): JSX.Element => {
  const [showAdvanced, setShowAdvanced] = useState(false);

  return (
    <div className="panel organize-panel-v2">
      {/* Layout Preset */}
      <div className="section-hd">
        <div>
          <h3>Layout</h3>
          <p>Choose how nodes are arranged.</p>
        </div>
      </div>
      <div className="layout-preset-grid">
        {PRESET_OPTIONS.map((option) => (
          <button
            key={option.value}
            aria-pressed={config.preset === option.value}
            className={`layout-preset-card ${config.preset === option.value ? "selected" : ""}`}
            onClick={() => onConfigChange({ ...config, preset: option.value })}
          >
            <div className="preset-icon">{option.icon}</div>
            <strong>{option.title}</strong>
            <small>{option.description}</small>
          </button>
        ))}
      </div>

      {/* Spacing */}
      <div className="section-hd">
        <div>
          <h3>Spacing</h3>
          <p>{SPACING_LABELS[spacingLabelIndex(config.spacingValue)]} — increase when connectors bunch together.</p>
        </div>
      </div>
      <div className="spacing-slider-row">
        <span className="spacing-label">Compact</span>
        <input
          type="range"
          className="spacing-slider"
          min={0}
          max={100}
          step={5}
          value={config.spacingValue}
          onChange={(e) => onConfigChange({ ...config, spacingValue: Number(e.target.value) })}
        />
        <span className="spacing-label">Spacious</span>
      </div>

      {/* Connector Style */}
      <div className="section-hd">
        <div>
          <h3>Connector style</h3>
          <p>How connectors are drawn after layout.</p>
        </div>
      </div>
      <div className="connector-style-group">
        {CONNECTOR_STYLE_OPTIONS.map((option) => (
          <button
            key={option.value}
            aria-pressed={config.connectorStyle === option.value}
            className={`connector-style-btn ${config.connectorStyle === option.value ? "selected" : ""}`}
            onClick={() => onConfigChange({ ...config, connectorStyle: option.value })}
          >
            <strong>{option.title}</strong>
            <small>{option.description}</small>
          </button>
        ))}
      </div>

      {/* Run Button */}
      <button className="organize-run-btn primary" onClick={onRun}>
        Organize Now
      </button>

      {/* Advanced */}
      <button className="ghost sm" onClick={() => setShowAdvanced((c) => !c)}>
        {showAdvanced ? "\u25B4 Hide advanced" : "\u25BE Advanced"}
      </button>
      {showAdvanced && (
        <div className="grid-2">
          <NumericInput
            label="Node gap"
            value={config.nodeGap}
            min={20}
            max={400}
            step={10}
            onChange={(v) => onConfigChange({ ...config, nodeGap: v })}
          />
          <NumericInput
            label="Lane gap"
            value={config.laneGap}
            min={60}
            max={600}
            step={20}
            onChange={(v) => onConfigChange({ ...config, laneGap: v })}
          />
          <label className="field field--check">
            <input
              type="checkbox"
              checked={config.alignStrict}
              onChange={(e) => onConfigChange({ ...config, alignStrict: e.target.checked })}
            />
            <span>Strict pixel grid</span>
          </label>
          <label className="field field--check">
            <input
              type="checkbox"
              checked={config.autoFixCrossings}
              onChange={(e) => onConfigChange({ ...config, autoFixCrossings: e.target.checked })}
            />
            <span>Auto-fix remaining crossings</span>
          </label>
        </div>
      )}

      {/* Diagnostics */}
      {diagnostics && (
        <div className="card organize-diagnostics">
          <div className="section-hd">
            <div>
              <h3>Run diagnostics</h3>
              <p>Latest organize analysis.</p>
            </div>
          </div>
          <div className="diagnostics-grid">
            <div><strong>{diagnostics.componentCount}</strong><span>components</span></div>
            <div><strong>{diagnostics.decisionsDetected}</strong><span>decisions</span></div>
            <div><strong>{diagnostics.mergesDetected}</strong><span>merges</span></div>
            <div><strong>{diagnostics.forksDetected}</strong><span>forks</span></div>
            <div><strong>{diagnostics.crossingsBefore}</strong><span>crossings before</span></div>
            <div><strong>{diagnostics.crossingsAfter}</strong><span>crossings after</span></div>
            <div className="diag-highlight">
              <strong>{diagnostics.crossingReductionPercent}%</strong>
              <span>reduction</span>
            </div>
            <div><strong>{diagnostics.connectorsProcessed}</strong><span>connectors processed</span></div>
          </div>
        </div>
      )}

      {/* SVG defs for arrows */}
      <svg width="0" height="0" style={{ position: "absolute" }}>
        <defs>
          <marker id="arrowV2" markerWidth="6" markerHeight="4" refX="5" refY="2" orient="auto">
            <path d="M0,0 L6,2 L0,4" fill="var(--t2)" />
          </marker>
        </defs>
      </svg>
    </div>
  );
};

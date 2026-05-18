import { useState } from "react";
import type { JSX } from "react";
import { NumericInput } from "@ui/components/FormFields";
import type {
  ConnectorStyleOption,
  LayoutPreset,
  OrganizeConfig,
  OrganizeDiagnostics
} from "@shared/types";

interface OrganizePanelProps {
  config: OrganizeConfig;
  diagnostics: OrganizeDiagnostics | null;
  onConfigChange: (config: OrganizeConfig) => void;
  onRun: () => void;
}

const PRESET_OPTIONS: {
  value: LayoutPreset;
  title: string;
  description: string;
  pattern: "flow-x" | "flow-y" | "tree" | "lanes" | "grid";
}[] = [
  {
    value: "flow_lr",
    title: "Flow \u2192",
    description: "Left-to-right process maps and operational workflows.",
    pattern: "flow-x"
  },
  {
    value: "flow_tb",
    title: "Flow \u2193",
    description: "Top-to-bottom sequential process with vertical layering.",
    pattern: "flow-y"
  },
  {
    value: "tree",
    title: "Tree",
    description: "Top-down branching with decision/fork separation and tree balancing.",
    pattern: "tree"
  },
  {
    value: "swimlane",
    title: "Swimlane",
    description: "Keeps system lanes aligned, reduces crossings within lanes.",
    pattern: "lanes"
  },
  {
    value: "compact",
    title: "Compact",
    description: "Tight grid for smaller board footprint.",
    pattern: "grid"
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

export const OrganizePanel = ({
  config,
  diagnostics,
  onConfigChange,
  onRun
}: OrganizePanelProps): JSX.Element => {
  const [showAdvanced, setShowAdvanced] = useState(false);

  return (
    <div className="panel organize-panel">
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
            <span className={`preset-glyph preset-glyph--${option.pattern}`} aria-hidden="true">
              <span />
              <span />
              <span />
              <span />
              <span />
              <span />
            </span>
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
    </div>
  );
};



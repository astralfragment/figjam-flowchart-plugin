import { useState } from "react";
import type { JSX } from "react";
import { ColorField, NumericInput } from "@ui/components/FormFields";
import { ShapePreview } from "@ui/components/ShapePreview";
import { LAYOUT_ROLE_DESCRIPTIONS } from "@shared/defaults";
import type {
  ApplyScope,
  AutoDetectResult,
  AutoDetectSuggestion,
  ConnectorPathType,
  FigJamShapeType,
  LayoutRole,
  SelectionSummaryV2,
  ShapeLegendEntry,
  SystemLegendEntry
} from "@shared/types";

const SHAPE_TYPE_OPTIONS: { value: FigJamShapeType; label: string }[] = [
  { value: "ROUNDED_RECTANGLE", label: "Rounded Rect" },
  { value: "ELLIPSE", label: "Ellipse" },
  { value: "DIAMOND", label: "Diamond" },
  { value: "SQUARE", label: "Square" },
  { value: "PARALLELOGRAM_RIGHT", label: "Parallelogram" },
  { value: "TRAPEZOID", label: "Trapezoid" },
  { value: "MANUAL_INPUT", label: "Manual Input" },
  { value: "ENG_DATABASE", label: "Database" },
  { value: "ENG_QUEUE", label: "Queue" },
  { value: "ENG_FILE", label: "File" },
  { value: "DOCUMENT_SINGLE", label: "Document" },
  { value: "HEXAGON", label: "Hexagon" },
  { value: "PREDEFINED_PROCESS", label: "Predefined Process" }
];

const LAYOUT_ROLES: LayoutRole[] = [
  "entry", "exit", "process", "decision", "merge", "fork",
  "loop", "io", "manual", "subprocess", "annotation", "delay", "default"
];

const PATH_TYPES: { value: ConnectorPathType; label: string }[] = [
  { value: "ELBOWED", label: "Elbowed" },
  { value: "CURVED", label: "Curved" },
  { value: "STRAIGHT", label: "Straight" }
];

interface LegendPanelV2Props {
  systemEntries: SystemLegendEntry[];
  shapeEntries: ShapeLegendEntry[];
  selection: SelectionSummaryV2;
  autoDetectResult: AutoDetectResult | null;
  onSystemUpsert: (entry: SystemLegendEntry) => void;
  onSystemDelete: (id: string) => void;
  onShapeUpsert: (entry: ShapeLegendEntry) => void;
  onShapeDelete: (id: string) => void;
  onAssignSystem: (entryId: string, nodeIds: string[]) => void;
  onAssignShape: (entryId: string, nodeIds: string[]) => void;
  onUnassignSystem: (nodeIds: string[]) => void;
  onUnassignShape: (nodeIds: string[]) => void;
  onApplyLegend: (scope: ApplyScope) => void;
  onAutoDetect: () => void;
  onDismissAutoDetect: () => void;
  onSelectByRole: (role: string) => void;
  onSelectUnmapped: () => void;
  onSelectBySystem: (entryId: string) => void;
  onClearAllAssignments: () => void;
  onDuplicateShape: (id: string) => void;
  onDuplicateSystem: (id: string) => void;
}

const uid = () => `entry-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const CONNECTOR_DEFAULTS = {
  connectorStroke: "#5C6B8A",
  connectorWidth: 2,
  connectorLineStyle: "solid" as const,
  connectorPathType: "ELBOWED" as const,
  connectorArrowStart: "none" as const,
  connectorArrowEnd: "triangle" as const,
  connectorOpacity: 1
};

export const LegendPanelV2 = ({
  systemEntries,
  shapeEntries,
  selection,
  autoDetectResult,
  onSystemUpsert,
  onSystemDelete,
  onShapeUpsert,
  onShapeDelete,
  onAssignSystem,
  onAssignShape,
  onUnassignSystem,
  onUnassignShape,
  onApplyLegend,
  onAutoDetect,
  onDismissAutoDetect,
  onSelectByRole,
  onSelectUnmapped,
  onSelectBySystem,
  onClearAllAssignments,
  onDuplicateShape,
  onDuplicateSystem
}: LegendPanelV2Props): JSX.Element => {
  const [subTab, setSubTab] = useState<"shapes" | "systems">("shapes");
  const [editingSystemId, setEditingSystemId] = useState<string | null>(null);
  const [editingShapeId, setEditingShapeId] = useState<string | null>(null);
  const [showBulkOps, setShowBulkOps] = useState(false);

  const editingSystem = editingSystemId
    ? systemEntries.find((e) => e.id === editingSystemId) ?? null
    : null;

  const editingShape = editingShapeId
    ? shapeEntries.find((e) => e.id === editingShapeId) ?? null
    : null;

  const newSystemEntry = (): SystemLegendEntry => ({
    id: uid(),
    name: "New System",
    order: systemEntries.length + 1,
    fill: "#6BA4D9",
    stroke: "#4A8BC2",
    strokeWidth: 2,
    textColor: "#FFFFFF",
    textSize: 16,
    textWeight: 600,
    opacity: 1,
    ...CONNECTOR_DEFAULTS,
    connectorStroke: "#6BA4D9"
  });

  const newShapeEntry = (): ShapeLegendEntry => ({
    id: uid(),
    name: "New Shape",
    order: shapeEntries.length + 1,
    shapeType: "ROUNDED_RECTANGLE",
    layoutRole: "process",
    fill: "#F0F4FA",
    stroke: "#6B88AA",
    strokeWidth: 2,
    textColor: "#10223A",
    textSize: 16,
    textWeight: 500,
    opacity: 1,
    ...CONNECTOR_DEFAULTS
  });

  const acceptSuggestion = (s: AutoDetectSuggestion): void => {
    if (s.kind === "shape" && s.shapeType && s.layoutRole) {
      onShapeUpsert({
        id: uid(),
        name: s.name,
        order: shapeEntries.length + 1,
        shapeType: s.shapeType,
        layoutRole: s.layoutRole,
        fill: s.fill,
        stroke: s.stroke,
        strokeWidth: 2,
        textColor: "#10223A",
        textSize: 16,
        textWeight: 500,
        opacity: 1,
        ...CONNECTOR_DEFAULTS
      });
    } else if (s.kind === "system") {
      onSystemUpsert({
        id: uid(),
        name: s.name,
        order: systemEntries.length + 1,
        fill: s.fill,
        stroke: s.stroke,
        strokeWidth: 2,
        textColor: "#FFFFFF",
        textSize: 16,
        textWeight: 600,
        opacity: 1,
        ...CONNECTOR_DEFAULTS,
        connectorStroke: s.fill
      });
    }
  };

  return (
    <div className="panel legend-panel-v2">
      <div className="sub-tabs">
        <button className={subTab === "shapes" ? "active" : ""} onClick={() => setSubTab("shapes")}>
          Shapes by Role
        </button>
        <button className={subTab === "systems" ? "active" : ""} onClick={() => setSubTab("systems")}>
          Systems by Color
        </button>
      </div>

      {/* Selection Summary */}
      {selection.total > 0 && (
        <div className="selection-bar">
          <span>{selection.shapes} shapes, {selection.connectors} connectors selected</span>
          {selection.unmappedCount > 0 && (
            <span className="unmapped">{selection.unmappedCount} unmapped</span>
          )}
        </div>
      )}

      {/* Quick Actions Bar */}
      <div className="quick-actions-bar">
        <button className="xs" onClick={onAutoDetect} title="Scan your board and suggest legend entries based on shapes and colors found">
          Auto-Detect
        </button>
        <button className="xs" onClick={() => setShowBulkOps(!showBulkOps)} title="Bulk selection and assignment operations">
          Bulk Ops {showBulkOps ? "\u25B4" : "\u25BE"}
        </button>
        <button className="xs" onClick={onSelectUnmapped} title="Select all shapes on the board that have no legend assignment">
          Select Unmapped
        </button>
      </div>

      {/* Bulk Operations Panel */}
      {showBulkOps && (
        <div className="bulk-ops-panel">
          <div className="bulk-ops-section">
            <span className="bulk-label">Select by role</span>
            <div className="bulk-chips">
              {LAYOUT_ROLES.filter(r => r !== "default").map(role => (
                <button key={role} className="chip" onClick={() => onSelectByRole(role)}>
                  {role}
                </button>
              ))}
            </div>
          </div>
          {systemEntries.length > 0 && (
            <div className="bulk-ops-section">
              <span className="bulk-label">Select by system</span>
              <div className="bulk-chips">
                {systemEntries.map(e => (
                  <button key={e.id} className="chip" onClick={() => onSelectBySystem(e.id)}>
                    <span className="chip-dot" style={{ background: e.fill }} />
                    {e.name}
                  </button>
                ))}
              </div>
            </div>
          )}
          <button className="xs danger" onClick={onClearAllAssignments} title="Remove all shape and system assignments">
            Clear All Assignments
          </button>
        </div>
      )}

      {/* Auto-Detect Results */}
      {autoDetectResult && (
        <div className="auto-detect-results">
          <div className="auto-detect-header">
            <strong>Board Scan Results</strong>
            <button className="toast-x" onClick={onDismissAutoDetect}>&times;</button>
          </div>
          <div className="auto-detect-stats">
            <span>{autoDetectResult.totalShapes} shapes</span>
            <span>{autoDetectResult.totalConnectors} connectors</span>
            <span>{autoDetectResult.uniqueShapeTypes} types</span>
            <span>{autoDetectResult.uniqueColors} colors</span>
          </div>
          {autoDetectResult.suggestions.length === 0 && (
            <p className="muted center">All detected shapes and colors are already in your legend.</p>
          )}
          {autoDetectResult.suggestions.map((s, i) => (
            <div key={i} className="suggestion-card">
              <div className="suggestion-info">
                {s.kind === "shape" && s.shapeType && (
                  <ShapePreview shapeType={s.shapeType} fill={s.fill} stroke={s.stroke} size={24} />
                )}
                {s.kind === "system" && (
                  <div className="swatch" style={{ backgroundColor: s.fill, border: `2px solid ${s.stroke}` }} />
                )}
                <div>
                  <strong>{s.name}</strong>
                  <span className="suggestion-meta">
                    {s.kind === "shape" ? s.layoutRole : "system"} &mdash; {s.count} found
                  </span>
                </div>
              </div>
              <button className="xs" onClick={() => acceptSuggestion(s)}>Add</button>
            </div>
          ))}
        </div>
      )}

      {subTab === "shapes" && (
        <div className="entry-list">
          {shapeEntries.map((entry) => (
            <div
              key={entry.id}
              className={`entry-card ${editingShapeId === entry.id ? "editing" : ""}`}
              onClick={() => setEditingShapeId(editingShapeId === entry.id ? null : entry.id)}
            >
              <div className="entry-header">
                <ShapePreview shapeType={entry.shapeType} fill={entry.fill} stroke={entry.stroke} size={28} />
                <span className="entry-name">{entry.name}</span>
                <span className="role-badge">{entry.layoutRole}</span>
              </div>
              <div className="role-hint">{LAYOUT_ROLE_DESCRIPTIONS[entry.layoutRole]}</div>
            </div>
          ))}

          {editingShape && (
            <div className="edit-form">
              <h4>Edit Shape Entry</h4>
              <label className="field">
                <span>Name</span>
                <input
                  value={editingShape.name}
                  onChange={(e) => onShapeUpsert({ ...editingShape, name: e.target.value })}
                />
              </label>
              <label className="field">
                <span>Shape Type</span>
                <select
                  value={editingShape.shapeType}
                  onChange={(e) => onShapeUpsert({ ...editingShape, shapeType: e.target.value as FigJamShapeType })}
                >
                  {SHAPE_TYPE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>Layout Role</span>
                <select
                  value={editingShape.layoutRole}
                  onChange={(e) => onShapeUpsert({ ...editingShape, layoutRole: e.target.value as LayoutRole })}
                >
                  {LAYOUT_ROLES.map((role) => (
                    <option key={role} value={role}>{role} &mdash; {LAYOUT_ROLE_DESCRIPTIONS[role]}</option>
                  ))}
                </select>
              </label>
              <div className="shape-preview-large">
                <ShapePreview shapeType={editingShape.shapeType} fill={editingShape.fill} stroke={editingShape.stroke} size={48} />
              </div>
              <ColorField label="Fill" value={editingShape.fill} fallback="#F0F4FA" onChange={(v) => onShapeUpsert({ ...editingShape, fill: v })} />
              <ColorField label="Stroke" value={editingShape.stroke} fallback="#6B88AA" onChange={(v) => onShapeUpsert({ ...editingShape, stroke: v })} />
              <NumericInput label="Stroke Width" value={editingShape.strokeWidth} min={0} max={10} onChange={(v) => onShapeUpsert({ ...editingShape, strokeWidth: v })} />
              <ColorField label="Text Color" value={editingShape.textColor} fallback="#10223A" onChange={(v) => onShapeUpsert({ ...editingShape, textColor: v })} />

              <h5>Connector Style</h5>
              <ColorField label="Connector Color" value={editingShape.connectorStroke} fallback="#5C6B8A" onChange={(v) => onShapeUpsert({ ...editingShape, connectorStroke: v })} />
              <label className="field">
                <span>Path Type</span>
                <select value={editingShape.connectorPathType} onChange={(e) => onShapeUpsert({ ...editingShape, connectorPathType: e.target.value as ConnectorPathType })}>
                  {PATH_TYPES.map((pt) => <option key={pt.value} value={pt.value}>{pt.label}</option>)}
                </select>
              </label>

              <div className="btn-row">
                <button onClick={() => onAssignShape(editingShape.id, [])} title="Assign this shape role to all currently selected shapes on the canvas">
                  Tag Selected
                </button>
                <button className="xs" onClick={() => onDuplicateShape(editingShape.id)} title="Create a copy of this entry">
                  Duplicate
                </button>
                <button className="danger xs" onClick={() => { onShapeDelete(editingShape.id); setEditingShapeId(null); }}>Delete</button>
              </div>
            </div>
          )}

          <button className="add-btn" onClick={() => {
            const entry = newShapeEntry();
            onShapeUpsert(entry);
            setEditingShapeId(entry.id);
          }}>
            + Add Shape Entry
          </button>
        </div>
      )}

      {subTab === "systems" && (
        <div className="entry-list">
          {systemEntries.length === 0 && (
            <div className="empty-state">
              <p>No systems defined yet. Systems let you color-code shapes by department or subsystem.</p>
            </div>
          )}

          {systemEntries.map((entry) => (
            <div
              key={entry.id}
              className={`entry-card ${editingSystemId === entry.id ? "editing" : ""}`}
              onClick={() => setEditingSystemId(editingSystemId === entry.id ? null : entry.id)}
            >
              <div className="entry-header">
                <div className="swatch" style={{ backgroundColor: entry.fill, border: `2px solid ${entry.stroke}` }} />
                <span className="entry-name">{entry.name}</span>
                {selection.systemBreakdown.find(b => b.entryId === entry.id) && (
                  <span className="count-badge">
                    {selection.systemBreakdown.find(b => b.entryId === entry.id)?.count}
                  </span>
                )}
              </div>
            </div>
          ))}

          {editingSystem && (
            <div className="edit-form">
              <h4>Edit System Entry</h4>
              <label className="field">
                <span>Name</span>
                <input value={editingSystem.name} onChange={(e) => onSystemUpsert({ ...editingSystem, name: e.target.value })} />
              </label>
              <ColorField label="Fill" value={editingSystem.fill} fallback="#6BA4D9" onChange={(v) => onSystemUpsert({ ...editingSystem, fill: v })} />
              <ColorField label="Stroke" value={editingSystem.stroke} fallback="#4A8BC2" onChange={(v) => onSystemUpsert({ ...editingSystem, stroke: v })} />
              <ColorField label="Text Color" value={editingSystem.textColor} fallback="#FFFFFF" onChange={(v) => onSystemUpsert({ ...editingSystem, textColor: v })} />

              <div className="btn-row">
                <button onClick={() => onAssignSystem(editingSystem.id, [])} title="Assign this system to all currently selected shapes on the canvas">
                  Tag Selected
                </button>
                <button className="xs" onClick={() => onSelectBySystem(editingSystem.id)} title="Select all shapes assigned to this system on the canvas">
                  Select All
                </button>
                <button className="xs" onClick={() => onDuplicateSystem(editingSystem.id)} title="Create a copy of this entry">
                  Duplicate
                </button>
                <button className="danger xs" onClick={() => { onSystemDelete(editingSystem.id); setEditingSystemId(null); }}>Delete</button>
              </div>
            </div>
          )}

          <button className="add-btn" onClick={() => {
            const entry = newSystemEntry();
            onSystemUpsert(entry);
            setEditingSystemId(entry.id);
          }}>
            + Add System Entry
          </button>
        </div>
      )}

      {/* Apply actions */}
      <div className="action-bar">
        <button className="primary" onClick={() => onApplyLegend("selection")} title="Apply legend styles to currently selected shapes">
          Style Selection
        </button>
        <button onClick={() => onApplyLegend("board")} title="Apply legend styles to all shapes on the board">
          Style Entire Board
        </button>
      </div>
    </div>
  );
};

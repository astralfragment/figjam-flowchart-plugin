import { useState } from "react";
import type { JSX } from "react";
import { ColorField, NumericInput } from "@ui/components/FormFields";
import { LAYOUT_ROLE_DESCRIPTIONS } from "@shared/defaults";
import type {
  ApplyScope,
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
  onSystemUpsert: (entry: SystemLegendEntry) => void;
  onSystemDelete: (id: string) => void;
  onShapeUpsert: (entry: ShapeLegendEntry) => void;
  onShapeDelete: (id: string) => void;
  onAssignSystem: (entryId: string, nodeIds: string[]) => void;
  onAssignShape: (entryId: string, nodeIds: string[]) => void;
  onUnassignSystem: (nodeIds: string[]) => void;
  onUnassignShape: (nodeIds: string[]) => void;
  onApplyLegend: (scope: ApplyScope) => void;
}

const uid = () => `entry-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

export const LegendPanelV2 = ({
  systemEntries,
  shapeEntries,
  selection,
  onSystemUpsert,
  onSystemDelete,
  onShapeUpsert,
  onShapeDelete,
  onAssignSystem,
  onAssignShape,
  onUnassignSystem,
  onUnassignShape,
  onApplyLegend
}: LegendPanelV2Props): JSX.Element => {
  const [subTab, setSubTab] = useState<"shapes" | "systems">("shapes");
  const [editingSystemId, setEditingSystemId] = useState<string | null>(null);
  const [editingShapeId, setEditingShapeId] = useState<string | null>(null);

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
    connectorStroke: "#6BA4D9",
    connectorWidth: 2,
    connectorLineStyle: "solid",
    connectorPathType: "ELBOWED",
    connectorArrowStart: "none",
    connectorArrowEnd: "triangle",
    connectorOpacity: 1
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
    connectorStroke: "#5C6B8A",
    connectorWidth: 2,
    connectorLineStyle: "solid",
    connectorPathType: "ELBOWED",
    connectorArrowStart: "none",
    connectorArrowEnd: "triangle",
    connectorOpacity: 1
  });

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

      {subTab === "shapes" && (
        <div className="entry-list">
          {shapeEntries.map((entry) => (
            <div
              key={entry.id}
              className={`entry-card ${editingShapeId === entry.id ? "editing" : ""}`}
              onClick={() => setEditingShapeId(editingShapeId === entry.id ? null : entry.id)}
            >
              <div className="entry-header">
                <div className="swatch" style={{ backgroundColor: entry.fill, border: `2px solid ${entry.stroke}` }} />
                <span className="entry-name">{entry.name}</span>
                <span className="role-badge">{entry.layoutRole}</span>
                <span className="shape-badge">{entry.shapeType.toLowerCase().replace(/_/g, " ")}</span>
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
                    <option key={role} value={role}>{role} — {LAYOUT_ROLE_DESCRIPTIONS[role]}</option>
                  ))}
                </select>
              </label>
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
                <button onClick={() => onAssignShape(editingShape.id, [])}>Assign to Selected</button>
                <button className="danger" onClick={() => { onShapeDelete(editingShape.id); setEditingShapeId(null); }}>Delete</button>
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
                <button onClick={() => onAssignSystem(editingSystem.id, [])}>Assign to Selected</button>
                <button className="danger" onClick={() => { onSystemDelete(editingSystem.id); setEditingSystemId(null); }}>Delete</button>
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

      {/* Apply */}
      <div className="action-bar">
        <button className="primary" onClick={() => onApplyLegend("selection")}>Apply to Selection</button>
        <button onClick={() => onApplyLegend("board")}>Apply to Board</button>
      </div>
    </div>
  );
};

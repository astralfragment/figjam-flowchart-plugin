import { useState } from "react";
import type { JSX } from "react";
import { ColorField, NumericInput } from "@ui/components/FormFields";
import { LAYOUT_ROLE_DESCRIPTIONS } from "@shared/defaults";
import { BulkApplyResolver } from "@ui/panels/legend/BulkApplyResolver";
import { ConversionReview } from "@ui/panels/legend/ConversionReview";
import { LAYOUT_ROLES, PATH_TYPES, SHAPE_TYPE_OPTIONS } from "@ui/panels/legend/legendOptions";
import { QuickCreateCard } from "@ui/panels/legend/QuickCreateCard";
import type {
  ApplyScope,
  BulkApplyDecision,
  BulkApplyPreview,
  ConnectorPathType,
  FigJamShapeType,
  LegendCandidateKind,
  LegendConversionCandidate,
  LegendConversionDecision,
  LegendSet,
  LayoutRole,
  SelectionSummary,
  ShapeLegendEntry,
  SystemLegendEntry
} from "@shared/types";

interface LegendPanelProps {
  systemEntries: SystemLegendEntry[];
  shapeEntries: ShapeLegendEntry[];
  legendSets: LegendSet[];
  activeLegendSetId?: string;
  selection: SelectionSummary;
  onSystemUpsert: (entry: SystemLegendEntry) => void;
  onSystemDelete: (id: string) => void;
  onShapeUpsert: (entry: ShapeLegendEntry) => void;
  onShapeDelete: (id: string) => void;
  onSaveLegendSet: (name: string) => void;
  onLoadLegendSet: (setId: string) => void;
  onDeleteLegendSet: (setId: string) => void;
  onAssignSystem: (entryId: string, nodeIds: string[]) => void;
  onAssignShape: (entryId: string, nodeIds: string[]) => void;
  onUnassignSystem: (nodeIds: string[]) => void;
  onUnassignShape: (nodeIds: string[]) => void;
  onApplyLegend: (scope: ApplyScope) => void;
  conversionCandidates: LegendConversionCandidate[];
  bulkApplyPreview: BulkApplyPreview | null;
  onPreviewLegendConversion: () => void;
  onCommitLegendConversion: (decisions: LegendConversionDecision[]) => void;
  onQuickCreateFromSelection: (kind: Exclude<LegendCandidateKind, "ignore">, name: string, layoutRole: LayoutRole) => void;
  onImportSelectedStyle: (kind: Exclude<LegendCandidateKind, "ignore">, entryId: string) => void;
  onPreviewBulkApply: () => void;
  onCommitBulkApply: (preview: BulkApplyPreview, decisions: BulkApplyDecision[]) => void;
  onDismissReview: () => void;
}

const uid = () => `entry-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

export const LegendPanel = ({
  systemEntries,
  shapeEntries,
  legendSets,
  activeLegendSetId,
  selection,
  onSystemUpsert,
  onSystemDelete,
  onShapeUpsert,
  onShapeDelete,
  onSaveLegendSet,
  onLoadLegendSet,
  onDeleteLegendSet,
  onAssignSystem,
  onAssignShape,
  onUnassignSystem,
  onUnassignShape,
  onApplyLegend,
  conversionCandidates,
  bulkApplyPreview,
  onPreviewLegendConversion,
  onCommitLegendConversion,
  onQuickCreateFromSelection,
  onImportSelectedStyle,
  onPreviewBulkApply,
  onCommitBulkApply,
  onDismissReview
}: LegendPanelProps): JSX.Element => {
  const [subTab, setSubTab] = useState<"shapes" | "systems">("shapes");
  const [editingSystemId, setEditingSystemId] = useState<string | null>(null);
  const [editingShapeId, setEditingShapeId] = useState<string | null>(null);
  const [legendSetName, setLegendSetName] = useState("");

  const editingSystem = editingSystemId
    ? systemEntries.find((e) => e.id === editingSystemId) ?? null
    : null;

  const editingShape = editingShapeId
    ? shapeEntries.find((e) => e.id === editingShapeId) ?? null
    : null;

  const activeLegendSet = activeLegendSetId
    ? legendSets.find((set) => set.id === activeLegendSetId) ?? null
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
    <div className="panel legend-panel">
      <div className="sub-tabs">
        <button className={subTab === "shapes" ? "active" : ""} onClick={() => setSubTab("shapes")}>
          Shapes by Role
        </button>
        <button className={subTab === "systems" ? "active" : ""} onClick={() => setSubTab("systems")}>
          Systems by Color
        </button>
      </div>

      <div className="legend-set-bar">
        <label className="field set-select">
          <span>Set</span>
          <select
            value={activeLegendSetId ?? ""}
            onChange={(event) => event.target.value && onLoadLegendSet(event.target.value)}
          >
            <option value="">Current legend</option>
            {legendSets.map((set) => (
              <option key={set.id} value={set.id}>{set.name}</option>
            ))}
          </select>
        </label>
        <label className="field set-name">
          <span>Name</span>
          <input
            value={legendSetName}
            placeholder={activeLegendSet?.name ?? "New set"}
            onChange={(event) => setLegendSetName(event.target.value)}
          />
        </label>
        <button onClick={() => {
          onSaveLegendSet(legendSetName || activeLegendSet?.name || "New legend set");
          setLegendSetName("");
        }}>
          Save Set
        </button>
        <button
          className="danger"
          disabled={!activeLegendSetId}
          onClick={() => activeLegendSetId && onDeleteLegendSet(activeLegendSetId)}
        >
          Delete
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

      {selection.quickCreatePreview && conversionCandidates.length === 0 && !bulkApplyPreview && (
        <QuickCreateCard preview={selection.quickCreatePreview} onCreate={onQuickCreateFromSelection} />
      )}

      <div className="workflow-actions">
        <button onClick={onPreviewLegendConversion}>Convert Selected Legend</button>
        <button className="primary" onClick={onPreviewBulkApply}>Apply Legend to Selection</button>
      </div>

      {conversionCandidates.length > 0 && (
        <ConversionReview
          candidates={conversionCandidates}
          onCommit={onCommitLegendConversion}
          onDismiss={onDismissReview}
        />
      )}

      {bulkApplyPreview && (
        <BulkApplyResolver
          preview={bulkApplyPreview}
          shapeEntries={shapeEntries}
          systemEntries={systemEntries}
          onCommit={onCommitBulkApply}
          onDismiss={onDismissReview}
        />
      )}

      {subTab === "shapes" && (
        <div className="legend-workspace">
          <div className="entry-list">
            {shapeEntries.map((entry) => (
              <button
                key={entry.id}
                className={`entry-card ${editingShapeId === entry.id ? "editing" : ""}`}
                onClick={() => setEditingShapeId(editingShapeId === entry.id ? null : entry.id)}
              >
                <span className="swatch" style={{ backgroundColor: entry.fill, border: `2px solid ${entry.stroke}` }} />
                <span className="entry-main">
                  <span className="entry-name">{entry.name}</span>
                  <span className="entry-meta">{LAYOUT_ROLE_DESCRIPTIONS[entry.layoutRole]}</span>
                </span>
                <span className="entry-badges">
                  <span className="role-badge">{entry.layoutRole}</span>
                  <span className="shape-badge">{entry.shapeType.toLowerCase().replace(/_/g, " ")}</span>
                </span>
              </button>
            ))}

            <button className="add-btn" onClick={() => {
              const entry = newShapeEntry();
              onShapeUpsert(entry);
              setEditingShapeId(entry.id);
            }}>
              Add Shape Entry
            </button>
          </div>

          <aside className="legend-inspector">
            {editingShape ? (
              <div className="edit-form">
                <div className="inspector-head">
                  <h4>{editingShape.name}</h4>
                  <span>{editingShape.layoutRole}</span>
                </div>
                <label className="field">
                  <span>Name</span>
                  <input
                    value={editingShape.name}
                    onChange={(e) => onShapeUpsert({ ...editingShape, name: e.target.value })}
                  />
                </label>
                <div className="form-grid">
                  <label className="field">
                    <span>Shape</span>
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
                    <span>Role</span>
                    <select
                      value={editingShape.layoutRole}
                      onChange={(e) => onShapeUpsert({ ...editingShape, layoutRole: e.target.value as LayoutRole })}
                    >
                      {LAYOUT_ROLES.map((role) => (
                        <option key={role} value={role}>{role}</option>
                      ))}
                    </select>
                  </label>
                </div>
                <ColorField label="Fill" value={editingShape.fill} fallback="#F0F4FA" onChange={(v) => onShapeUpsert({ ...editingShape, fill: v })} />
                <ColorField label="Stroke" value={editingShape.stroke} fallback="#6B88AA" onChange={(v) => onShapeUpsert({ ...editingShape, stroke: v })} />
                <div className="form-grid">
                  <NumericInput label="Stroke" value={editingShape.strokeWidth} min={0} max={10} onChange={(v) => onShapeUpsert({ ...editingShape, strokeWidth: v })} />
                  <ColorField label="Text" value={editingShape.textColor} fallback="#10223A" onChange={(v) => onShapeUpsert({ ...editingShape, textColor: v })} />
                </div>

                <h5>Connector</h5>
                <ColorField label="Color" value={editingShape.connectorStroke} fallback="#5C6B8A" onChange={(v) => onShapeUpsert({ ...editingShape, connectorStroke: v })} />
                <label className="field">
                  <span>Path</span>
                  <select value={editingShape.connectorPathType} onChange={(e) => onShapeUpsert({ ...editingShape, connectorPathType: e.target.value as ConnectorPathType })}>
                    {PATH_TYPES.map((pt) => <option key={pt.value} value={pt.value}>{pt.label}</option>)}
                  </select>
                </label>

                <div className="btn-row inspector-actions">
                  <button onClick={() => onAssignShape(editingShape.id, [])}>Tag Selection</button>
                  <button onClick={() => onImportSelectedStyle("shape", editingShape.id)} disabled={!selection.quickCreatePreview}>
                    Import Style
                  </button>
                  <button className="danger" onClick={() => { onShapeDelete(editingShape.id); setEditingShapeId(null); }}>Delete</button>
                </div>
              </div>
            ) : (
              <div className="empty-state compact">
                <p>Select a role to edit its style.</p>
              </div>
            )}
          </aside>
        </div>
      )}

      {subTab === "systems" && (
        <div className="legend-workspace">
          <div className="entry-list">
            {systemEntries.length === 0 && (
              <div className="empty-state">
                <p>No systems defined yet.</p>
              </div>
            )}

            {systemEntries.map((entry) => (
              <button
                key={entry.id}
                className={`entry-card ${editingSystemId === entry.id ? "editing" : ""}`}
                onClick={() => setEditingSystemId(editingSystemId === entry.id ? null : entry.id)}
              >
                <span className="swatch" style={{ backgroundColor: entry.fill, border: `2px solid ${entry.stroke}` }} />
                <span className="entry-main">
                  <span className="entry-name">{entry.name}</span>
                  <span className="entry-meta">{entry.fill} / {entry.stroke}</span>
                </span>
              </button>
            ))}

            <button className="add-btn" onClick={() => {
              const entry = newSystemEntry();
              onSystemUpsert(entry);
              setEditingSystemId(entry.id);
            }}>
              Add System Entry
            </button>
          </div>

          <aside className="legend-inspector">
            {editingSystem ? (
              <div className="edit-form">
                <div className="inspector-head">
                  <h4>{editingSystem.name}</h4>
                  <span>system</span>
                </div>
                <label className="field">
                  <span>Name</span>
                  <input value={editingSystem.name} onChange={(e) => onSystemUpsert({ ...editingSystem, name: e.target.value })} />
                </label>
                <ColorField label="Fill" value={editingSystem.fill} fallback="#6BA4D9" onChange={(v) => onSystemUpsert({ ...editingSystem, fill: v })} />
                <ColorField label="Stroke" value={editingSystem.stroke} fallback="#4A8BC2" onChange={(v) => onSystemUpsert({ ...editingSystem, stroke: v })} />
                <ColorField label="Text" value={editingSystem.textColor} fallback="#FFFFFF" onChange={(v) => onSystemUpsert({ ...editingSystem, textColor: v })} />

                <div className="btn-row inspector-actions">
                  <button onClick={() => onAssignSystem(editingSystem.id, [])}>Tag Selection</button>
                  <button onClick={() => onImportSelectedStyle("system", editingSystem.id)} disabled={!selection.quickCreatePreview}>
                    Import Style
                  </button>
                  <button className="danger" onClick={() => { onSystemDelete(editingSystem.id); setEditingSystemId(null); }}>Delete</button>
                </div>
              </div>
            ) : (
              <div className="empty-state compact">
                <p>Select a system to edit its style.</p>
              </div>
            )}
          </aside>
        </div>
      )}

      {/* Apply — applies all legend entry styles to matching shapes */}
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


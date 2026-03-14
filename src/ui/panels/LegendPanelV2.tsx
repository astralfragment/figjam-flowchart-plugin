import { useState } from "react";
import type { JSX } from "react";
import { ColorField, NumericInput } from "@ui/components/FormFields";
import { ShapePreview } from "@ui/components/ShapePreview";
import { LAYOUT_ROLE_DESCRIPTIONS } from "@shared/defaults";
import {
  IconCheck,
  IconChevronDown,
  IconChevronUp,
  IconClearAll,
  IconClose,
  IconCopy,
  IconPalette,
  IconPlus,
  IconScan,
  IconSearch,
  IconSelectAll,
  IconTag,
  IconTrash,
  IconWand
} from "@ui/components/Icons";
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

const ROLE_ICONS: Partial<Record<LayoutRole, string>> = {
  entry: "\u25B6",
  exit: "\u25A0",
  process: "\u2699",
  decision: "\u25C7",
  merge: "\u22C8",
  fork: "\u2442",
  loop: "\u21BB",
  io: "\u21C6",
  manual: "\u270B",
  subprocess: "\u2610",
  annotation: "\u270E",
  delay: "\u23F1",
  default: "\u2022"
};

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
  const [searchQuery, setSearchQuery] = useState("");

  const editingSystem = editingSystemId
    ? systemEntries.find((e) => e.id === editingSystemId) ?? null
    : null;

  const editingShape = editingShapeId
    ? shapeEntries.find((e) => e.id === editingShapeId) ?? null
    : null;

  const filteredShapes = searchQuery
    ? shapeEntries.filter(e =>
        e.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        e.layoutRole.toLowerCase().includes(searchQuery.toLowerCase()) ||
        e.shapeType.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : shapeEntries;

  const filteredSystems = searchQuery
    ? systemEntries.filter(e =>
        e.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : systemEntries;

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

  const activeEntries = subTab === "shapes" ? filteredShapes : filteredSystems;

  return (
    <div className="panel legend-panel-v2">
      {/* Sub-tabs */}
      <div className="sub-tabs">
        <button className={subTab === "shapes" ? "active" : ""} onClick={() => setSubTab("shapes")}>
          <IconPalette size={12} />
          Shapes
          <span className="tab-count">{shapeEntries.length}</span>
        </button>
        <button className={subTab === "systems" ? "active" : ""} onClick={() => setSubTab("systems")}>
          <IconTag size={12} />
          Systems
          <span className="tab-count">{systemEntries.length}</span>
        </button>
      </div>

      {/* Selection Summary */}
      {selection.total > 0 && (
        <div className="selection-bar">
          <span className="sel-count">{selection.shapes}</span>
          <span>shapes</span>
          <span className="sel-sep">&bull;</span>
          <span className="sel-count">{selection.connectors}</span>
          <span>connectors</span>
          {selection.unmappedCount > 0 && (
            <span className="unmapped">
              <span className="unmapped-dot" />
              {selection.unmappedCount} unmapped
            </span>
          )}
        </div>
      )}

      {/* Toolbar */}
      <div className="legend-toolbar">
        <div className="search-field">
          <IconSearch size={12} className="search-icon" />
          <input
            type="text"
            placeholder={`Filter ${subTab}...`}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button className="search-clear" onClick={() => setSearchQuery("")} aria-label="Clear search">
              <IconClose size={10} />
            </button>
          )}
        </div>
        <div className="toolbar-actions">
          <button className="tool-btn" onClick={onAutoDetect} title="Scan board for shapes &amp; colors">
            <IconWand size={13} />
          </button>
          <button className="tool-btn" onClick={() => setShowBulkOps(!showBulkOps)} title="Bulk operations" aria-pressed={showBulkOps}>
            <IconScan size={13} />
          </button>
          <button className="tool-btn" onClick={onSelectUnmapped} title="Select unmapped shapes">
            <IconSelectAll size={13} />
          </button>
        </div>
      </div>

      {/* Bulk Operations Panel */}
      {showBulkOps && (
        <div className="bulk-ops-panel">
          <div className="bulk-ops-section">
            <span className="bulk-label">Select by role</span>
            <div className="bulk-chips">
              {LAYOUT_ROLES.filter(r => r !== "default").map(role => (
                <button key={role} className="chip" onClick={() => onSelectByRole(role)}>
                  <span className="chip-icon">{ROLE_ICONS[role]}</span>
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
          <button className="bulk-clear-btn" onClick={onClearAllAssignments} title="Remove all shape and system assignments">
            <IconClearAll size={12} />
            Clear All Assignments
          </button>
        </div>
      )}

      {/* Auto-Detect Results */}
      {autoDetectResult && (
        <div className="auto-detect-results">
          <div className="auto-detect-header">
            <div className="auto-detect-title">
              <IconWand size={13} />
              <strong>Board Scan</strong>
            </div>
            <button className="close-btn" onClick={onDismissAutoDetect} aria-label="Dismiss">
              <IconClose size={12} />
            </button>
          </div>
          <div className="auto-detect-stats">
            <div className="stat-pill">
              <span className="stat-value">{autoDetectResult.totalShapes}</span>
              <span className="stat-label">shapes</span>
            </div>
            <div className="stat-pill">
              <span className="stat-value">{autoDetectResult.totalConnectors}</span>
              <span className="stat-label">connectors</span>
            </div>
            <div className="stat-pill">
              <span className="stat-value">{autoDetectResult.uniqueShapeTypes}</span>
              <span className="stat-label">types</span>
            </div>
            <div className="stat-pill">
              <span className="stat-value">{autoDetectResult.uniqueColors}</span>
              <span className="stat-label">colors</span>
            </div>
          </div>
          {autoDetectResult.suggestions.length === 0 && (
            <p className="muted center">All shapes and colors are already in your legend.</p>
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
              <button className="accept-btn" onClick={() => acceptSuggestion(s)} title="Add to legend">
                <IconPlus size={12} />
                Add
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Entries */}
      {subTab === "shapes" && (
        <div className="entry-list">
          {filteredShapes.length === 0 && shapeEntries.length > 0 && (
            <div className="empty-state">
              <p>No shapes match &ldquo;{searchQuery}&rdquo;</p>
            </div>
          )}
          {filteredShapes.length === 0 && shapeEntries.length === 0 && (
            <div className="empty-state">
              <IconPalette size={20} />
              <p>No shapes defined yet.</p>
              <p>Add shape entries to define visual roles for your flowchart nodes.</p>
            </div>
          )}

          {filteredShapes.map((entry) => {
            const breakdownItem = selection.shapeBreakdown.find(b => b.entryId === entry.id);
            return (
              <div
                key={entry.id}
                className={`entry-card ${editingShapeId === entry.id ? "editing" : ""}`}
                onClick={() => setEditingShapeId(editingShapeId === entry.id ? null : entry.id)}
              >
                <div className="entry-header">
                  <ShapePreview shapeType={entry.shapeType} fill={entry.fill} stroke={entry.stroke} size={28} />
                  <div className="entry-meta">
                    <span className="entry-name">{entry.name}</span>
                    <span className="entry-sub">{SHAPE_TYPE_OPTIONS.find(o => o.value === entry.shapeType)?.label}</span>
                  </div>
                  <span className="role-badge">
                    <span className="role-icon">{ROLE_ICONS[entry.layoutRole]}</span>
                    {entry.layoutRole}
                  </span>
                  {breakdownItem && (
                    <span className="count-badge">{breakdownItem.count}</span>
                  )}
                  <span className="entry-chevron">
                    {editingShapeId === entry.id ? <IconChevronUp size={12} /> : <IconChevronDown size={12} />}
                  </span>
                </div>
              </div>
            );
          })}

          {editingShape && (
            <div className="edit-form" onClick={(e) => e.stopPropagation()}>
              <div className="edit-form-header">
                <h4>Edit Shape</h4>
                <button className="close-btn" onClick={() => setEditingShapeId(null)} aria-label="Close">
                  <IconClose size={12} />
                </button>
              </div>

              <div className="shape-preview-large">
                <ShapePreview shapeType={editingShape.shapeType} fill={editingShape.fill} stroke={editingShape.stroke} size={52} />
              </div>

              <label className="field">
                <span>Name</span>
                <input
                  value={editingShape.name}
                  onChange={(e) => onShapeUpsert({ ...editingShape, name: e.target.value })}
                />
              </label>

              <div className="grid-2">
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
                      <option key={role} value={role}>{role}</option>
                    ))}
                  </select>
                </label>
              </div>

              <p className="role-description">{LAYOUT_ROLE_DESCRIPTIONS[editingShape.layoutRole]}</p>

              <div className="grid-2">
                <ColorField label="Fill" value={editingShape.fill} fallback="#F0F4FA" onChange={(v) => onShapeUpsert({ ...editingShape, fill: v })} />
                <ColorField label="Stroke" value={editingShape.stroke} fallback="#6B88AA" onChange={(v) => onShapeUpsert({ ...editingShape, stroke: v })} />
              </div>

              <div className="grid-2">
                <NumericInput label="Stroke Width" value={editingShape.strokeWidth} min={0} max={10} onChange={(v) => onShapeUpsert({ ...editingShape, strokeWidth: v })} />
                <ColorField label="Text Color" value={editingShape.textColor} fallback="#10223A" onChange={(v) => onShapeUpsert({ ...editingShape, textColor: v })} />
              </div>

              <div className="edit-section-label">Connector</div>
              <div className="grid-2">
                <ColorField label="Connector Color" value={editingShape.connectorStroke} fallback="#5C6B8A" onChange={(v) => onShapeUpsert({ ...editingShape, connectorStroke: v })} />
                <label className="field">
                  <span>Path Type</span>
                  <select value={editingShape.connectorPathType} onChange={(e) => onShapeUpsert({ ...editingShape, connectorPathType: e.target.value as ConnectorPathType })}>
                    {PATH_TYPES.map((pt) => <option key={pt.value} value={pt.value}>{pt.label}</option>)}
                  </select>
                </label>
              </div>

              <div className="edit-actions">
                <button className="edit-action-btn primary-action" onClick={() => onAssignShape(editingShape.id, [])} title="Tag selected shapes on canvas">
                  <IconTag size={12} />
                  Tag Selected
                </button>
                <button className="edit-action-btn" onClick={() => onDuplicateShape(editingShape.id)} title="Duplicate entry">
                  <IconCopy size={12} />
                </button>
                <button className="edit-action-btn danger-action" onClick={() => { onShapeDelete(editingShape.id); setEditingShapeId(null); }} title="Delete entry">
                  <IconTrash size={12} />
                </button>
              </div>
            </div>
          )}

          <button className="add-entry-btn" onClick={() => {
            const entry = newShapeEntry();
            onShapeUpsert(entry);
            setEditingShapeId(entry.id);
          }}>
            <IconPlus size={13} />
            Add Shape Entry
          </button>
        </div>
      )}

      {subTab === "systems" && (
        <div className="entry-list">
          {filteredSystems.length === 0 && systemEntries.length === 0 && (
            <div className="empty-state">
              <IconTag size={20} />
              <p>No systems defined yet.</p>
              <p>Systems let you color-code shapes by department, team, or subsystem.</p>
            </div>
          )}
          {filteredSystems.length === 0 && systemEntries.length > 0 && (
            <div className="empty-state">
              <p>No systems match &ldquo;{searchQuery}&rdquo;</p>
            </div>
          )}

          {filteredSystems.map((entry) => {
            const breakdownItem = selection.systemBreakdown.find(b => b.entryId === entry.id);
            return (
              <div
                key={entry.id}
                className={`entry-card ${editingSystemId === entry.id ? "editing" : ""}`}
                onClick={() => setEditingSystemId(editingSystemId === entry.id ? null : entry.id)}
              >
                <div className="entry-header">
                  <div className="swatch" style={{ backgroundColor: entry.fill, borderColor: entry.stroke }} />
                  <div className="entry-meta">
                    <span className="entry-name">{entry.name}</span>
                  </div>
                  {breakdownItem && (
                    <span className="count-badge">{breakdownItem.count}</span>
                  )}
                  <span className="entry-chevron">
                    {editingSystemId === entry.id ? <IconChevronUp size={12} /> : <IconChevronDown size={12} />}
                  </span>
                </div>
              </div>
            );
          })}

          {editingSystem && (
            <div className="edit-form" onClick={(e) => e.stopPropagation()}>
              <div className="edit-form-header">
                <h4>Edit System</h4>
                <button className="close-btn" onClick={() => setEditingSystemId(null)} aria-label="Close">
                  <IconClose size={12} />
                </button>
              </div>

              <div className="system-preview-bar" style={{ background: editingSystem.fill, borderColor: editingSystem.stroke }}>
                <span style={{ color: editingSystem.textColor, fontWeight: editingSystem.textWeight }}>{editingSystem.name}</span>
              </div>

              <label className="field">
                <span>Name</span>
                <input value={editingSystem.name} onChange={(e) => onSystemUpsert({ ...editingSystem, name: e.target.value })} />
              </label>

              <div className="grid-2">
                <ColorField label="Fill" value={editingSystem.fill} fallback="#6BA4D9" onChange={(v) => onSystemUpsert({ ...editingSystem, fill: v })} />
                <ColorField label="Stroke" value={editingSystem.stroke} fallback="#4A8BC2" onChange={(v) => onSystemUpsert({ ...editingSystem, stroke: v })} />
              </div>

              <ColorField label="Text Color" value={editingSystem.textColor} fallback="#FFFFFF" onChange={(v) => onSystemUpsert({ ...editingSystem, textColor: v })} />

              <div className="edit-actions">
                <button className="edit-action-btn primary-action" onClick={() => onAssignSystem(editingSystem.id, [])} title="Tag selected shapes on canvas">
                  <IconTag size={12} />
                  Tag Selected
                </button>
                <button className="edit-action-btn" onClick={() => onSelectBySystem(editingSystem.id)} title="Select all shapes in this system">
                  <IconSelectAll size={12} />
                </button>
                <button className="edit-action-btn" onClick={() => onDuplicateSystem(editingSystem.id)} title="Duplicate entry">
                  <IconCopy size={12} />
                </button>
                <button className="edit-action-btn danger-action" onClick={() => { onSystemDelete(editingSystem.id); setEditingSystemId(null); }} title="Delete entry">
                  <IconTrash size={12} />
                </button>
              </div>
            </div>
          )}

          <button className="add-entry-btn" onClick={() => {
            const entry = newSystemEntry();
            onSystemUpsert(entry);
            setEditingSystemId(entry.id);
          }}>
            <IconPlus size={13} />
            Add System Entry
          </button>
        </div>
      )}

      {/* Apply actions */}
      <div className="action-bar">
        <button className="apply-btn primary" onClick={() => onApplyLegend("selection")} title="Apply legend styles to selected shapes">
          <IconBolt size={13} />
          Style Selection
        </button>
        <button className="apply-btn" onClick={() => onApplyLegend("board")} title="Apply legend styles to entire board">
          Style Board
        </button>
      </div>
    </div>
  );
};

/* Inline tiny bolt icon for apply button (avoid circular import) */
const IconBolt = ({ size = 16 }: { size?: number }): JSX.Element => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="currentColor" stroke="none">
    <path d="M9 1L3 9h4.5l-1 6L13 7H8.5z" />
  </svg>
);

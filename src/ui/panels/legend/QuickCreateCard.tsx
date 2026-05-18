import { useEffect, useState } from "react";
import type { JSX } from "react";
import { LAYOUT_ROLES } from "./legendOptions";
import type { LegendCandidateKind, LegendConversionCandidate, LayoutRole } from "@shared/types";

interface QuickCreateCardProps {
  preview: LegendConversionCandidate;
  onCreate: (kind: Exclude<LegendCandidateKind, "ignore">, name: string, layoutRole: LayoutRole) => void;
}

export const QuickCreateCard = ({ preview, onCreate }: QuickCreateCardProps): JSX.Element => {
  const [name, setName] = useState(preview.label);
  const [layoutRole, setLayoutRole] = useState<LayoutRole>(preview.layoutRole);

  useEffect(() => {
    setName(preview.label);
    setLayoutRole(preview.layoutRole);
  }, [preview.sourceNodeId, preview.label, preview.layoutRole]);

  return (
    <div className="quick-create-card">
      <div className="quick-create-preview">
        <div
          className="quick-preview-shape"
          style={{
            backgroundColor: preview.fill,
            border: `${Math.max(1, preview.strokeWidth)}px solid ${preview.stroke}`,
            color: preview.textColor
          }}
        >
          {preview.label || "Selected shape"}
        </div>
        <div className="quick-preview-meta">
          <strong>{preview.shapeType.toLowerCase().replace(/_/g, " ")}</strong>
          <span>{preview.fill} / {preview.stroke}</span>
        </div>
      </div>

      <div className="quick-create-fields">
        <label className="field">
          <span>Name</span>
          <input value={name} onChange={(event) => setName(event.target.value)} />
        </label>
        <label className="field">
          <span>Role</span>
          <select value={layoutRole} onChange={(event) => setLayoutRole(event.target.value as LayoutRole)}>
            {LAYOUT_ROLES.map((role) => (
              <option key={role} value={role}>{role}</option>
            ))}
          </select>
        </label>
      </div>

      <div className="btn-row">
        <button className="primary" onClick={() => onCreate("shape", name, layoutRole)}>
          Create Shape Role
        </button>
        <button onClick={() => onCreate("system", name, layoutRole)}>
          Create System
        </button>
      </div>
    </div>
  );
};

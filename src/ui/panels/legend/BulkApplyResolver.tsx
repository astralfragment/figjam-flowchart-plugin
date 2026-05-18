import { useEffect, useState } from "react";
import type { JSX } from "react";
import type {
  BulkApplyDecision,
  BulkApplyPreview,
  ShapeLegendEntry,
  SystemLegendEntry
} from "@shared/types";

interface BulkApplyResolverProps {
  preview: BulkApplyPreview;
  shapeEntries: ShapeLegendEntry[];
  systemEntries: SystemLegendEntry[];
  onCommit: (preview: BulkApplyPreview, decisions: BulkApplyDecision[]) => void;
  onDismiss: () => void;
}

export const BulkApplyResolver = ({
  preview,
  shapeEntries,
  systemEntries,
  onCommit,
  onDismiss
}: BulkApplyResolverProps): JSX.Element => {
  const [decisions, setDecisions] = useState<Record<string, BulkApplyDecision>>({});

  useEffect(() => {
    setDecisions(Object.fromEntries(preview.groups.map((group) => [
      group.id,
      {
        groupId: group.id,
        shapeEntryId: group.defaultShapeEntryId ?? group.shapeCandidates[0]?.entryId,
        systemEntryId: group.defaultSystemEntryId ?? group.systemCandidates[0]?.entryId
      }
    ])));
  }, [preview]);

  const updateDecision = (groupId: string, patch: Partial<BulkApplyDecision>): void => {
    setDecisions((current) => ({
      ...current,
      [groupId]: {
        ...current[groupId],
        groupId,
        ...patch
      }
    }));
  };

  const decisionList = (): BulkApplyDecision[] =>
    preview.groups.map((group) => decisions[group.id] ?? { groupId: group.id });

  return (
    <div className="review-card">
      <div className="review-header">
        <h4>Resolve Apply</h4>
        <button className="xs" onClick={onDismiss}>Close</button>
      </div>

      {preview.autoMatches.length > 0 && (
        <p className="muted">{preview.autoMatches.length} shape(s) matched automatically.</p>
      )}

      {preview.groups.map((group) => {
        const decision = decisions[group.id] ?? { groupId: group.id };
        return (
          <div key={group.id} className="resolver-row">
            <div className="resolver-sample">
              <div className="swatch" style={{ backgroundColor: group.fill, border: `2px solid ${group.stroke}` }} />
              <div>
                <strong>{group.sampleLabel || group.shapeType}</strong>
                <span>{group.count} shape(s)</span>
              </div>
            </div>
            <label className="field">
              <span>Shape Role</span>
              <select
                value={decision.shapeEntryId ?? ""}
                onChange={(event) => updateDecision(group.id, { shapeEntryId: event.target.value || undefined })}
              >
                <option value="">Skip</option>
                {shapeEntries.map((entry) => (
                  <option key={entry.id} value={entry.id}>{entry.name}</option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>System</span>
              <select
                value={decision.systemEntryId ?? ""}
                onChange={(event) => updateDecision(group.id, { systemEntryId: event.target.value || undefined })}
              >
                <option value="">Skip</option>
                {systemEntries.map((entry) => (
                  <option key={entry.id} value={entry.id}>{entry.name}</option>
                ))}
              </select>
            </label>
          </div>
        );
      })}

      <div className="btn-row">
        <button className="primary" onClick={() => onCommit(preview, decisionList())}>
          Apply Mappings
        </button>
        <button onClick={onDismiss}>Cancel</button>
      </div>
    </div>
  );
};

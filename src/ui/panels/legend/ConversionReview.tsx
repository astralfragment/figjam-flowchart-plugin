import { useEffect, useState } from "react";
import type { JSX } from "react";
import { LAYOUT_ROLES } from "./legendOptions";
import type {
  LegendCandidateKind,
  LegendConversionCandidate,
  LegendConversionDecision,
  LayoutRole
} from "@shared/types";

interface ConversionReviewProps {
  candidates: LegendConversionCandidate[];
  onCommit: (decisions: LegendConversionDecision[]) => void;
  onDismiss: () => void;
}

export const ConversionReview = ({ candidates, onCommit, onDismiss }: ConversionReviewProps): JSX.Element => {
  const [decisions, setDecisions] = useState<Record<string, LegendConversionDecision>>({});

  useEffect(() => {
    setDecisions(Object.fromEntries(candidates.map((candidate) => [
      candidate.id,
      {
        candidateId: candidate.id,
        kind: candidate.suggestedKind,
        name: candidate.label,
        layoutRole: candidate.layoutRole
      }
    ])));
  }, [candidates]);

  const updateDecision = (
    candidateId: string,
    patch: Partial<Omit<LegendConversionDecision, "candidateId">>
  ): void => {
    setDecisions((current) => ({
      ...current,
      [candidateId]: {
        ...current[candidateId],
        candidateId,
        ...patch
      }
    }));
  };

  const decisionList = (): LegendConversionDecision[] =>
    candidates
      .map((candidate) => decisions[candidate.id])
      .filter((decision): decision is LegendConversionDecision => Boolean(decision));

  return (
    <div className="review-card">
      <div className="review-header">
        <h4>Convert Selection</h4>
        <button className="xs" onClick={onDismiss}>Close</button>
      </div>

      {candidates.map((candidate) => {
        const decision = decisions[candidate.id];
        const kind = decision?.kind ?? candidate.suggestedKind;
        return (
          <div key={candidate.id} className="review-row">
            <div className="swatch" style={{ backgroundColor: candidate.fill, border: `2px solid ${candidate.stroke}` }} />
            <label className="field">
              <span>Name</span>
              <input
                value={decision?.name ?? candidate.label}
                onChange={(event) => updateDecision(candidate.id, { name: event.target.value })}
              />
            </label>
            <label className="field">
              <span>Type</span>
              <select
                value={kind}
                onChange={(event) => updateDecision(candidate.id, { kind: event.target.value as LegendCandidateKind })}
              >
                <option value="system">System</option>
                <option value="shape">Shape Role</option>
                <option value="ignore">Ignore</option>
              </select>
            </label>
            <label className="field">
              <span>Role</span>
              <select
                value={decision?.layoutRole ?? candidate.layoutRole}
                disabled={kind !== "shape"}
                onChange={(event) => updateDecision(candidate.id, { layoutRole: event.target.value as LayoutRole })}
              >
                {LAYOUT_ROLES.map((role) => (
                  <option key={role} value={role}>{role}</option>
                ))}
              </select>
            </label>
          </div>
        );
      })}

      <div className="btn-row">
        <button className="primary" onClick={() => onCommit(decisionList())}>
          Save Converted Legend
        </button>
        <button onClick={onDismiss}>Cancel</button>
      </div>
    </div>
  );
};

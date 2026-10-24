import React, { useState } from "react";
import { VerdictBadge } from "../ui/VerdictBadge";
import { 
  X, 
  ChevronRight, 
  ChevronLeft, 
  Check, 
  AlertTriangle, 
  Edit3, 
  Trash2, 
  ArrowRight, 
  Layers, 
  Scale,
  Sparkles
} from "lucide-react";

interface FlagItem {
  id: string;
  kind: string;
  ref_id: string;
  title: string;
  materiality_score: number;
  impact_text: string;
  status: string;
  severity: string;
  is_top_3?: number;
}

interface ConflictItem {
  id: string;
  metric: string;
  period: string;
  difference: number;
  source_a_title: string;
  source_b_title: string;
  value_a: number;
  value_b: number;
  suggested_authoritative_fact_id: string;
  chosen_authoritative_fact_id: string;
  impact_description: string;
  fact_a_id: string;
  fact_b_id: string;
}

interface ReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  flags: FlagItem[];
  conflicts: ConflictItem[];
  onTakeAction: (actionType: string, reason: string, flagId?: string, claimId?: string) => void;
  onSwitchAuthority: (conflictId: string, chosenFactId: string) => void;
}

export const ReviewModal: React.FC<ReviewModalProps> = ({
  isOpen,
  onClose,
  flags,
  conflicts,
  onTakeAction,
  onSwitchAuthority
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showImpactFlow, setShowImpactFlow] = useState(false);
  const [dismissReason, setDismissReason] = useState("");
  const [showDismissInput, setShowDismissInput] = useState(false);

  if (!isOpen) return null;

  const activeFlag = flags[currentIndex] || null;
  const matchingConflict = conflicts.find((c) => c.metric === "revenue" || c.id.includes(activeFlag?.ref_id || ""));

  const handleNext = () => {
    if (currentIndex < flags.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setShowDismissInput(false);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      setShowDismissInput(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-xs">
              {currentIndex + 1}/{Math.max(1, flags.length)}
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Focused Issue Review: {activeFlag?.title || "Flagged Statement"}
              </h3>
              <p className="text-[11px] text-slate-500 font-medium">
                Ranked by materiality score ({activeFlag ? (activeFlag.materiality_score * 100).toFixed(0) : 0}% impact)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowImpactFlow(!showImpactFlow)}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                showImpactFlow ? "bg-indigo-600 text-white" : "bg-slate-100 hover:bg-slate-200 text-slate-700"
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>See impact flow</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Side-by-side: Draft says vs Source says */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 text-left">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Draft Asserted:
              </span>
              <p className="mt-1.5 text-xs text-slate-900 font-serif leading-relaxed">
                "{activeFlag?.impact_text.split("vs claimed")[1] || activeFlag?.impact_text || "Asserted figure in draft"}"
              </p>
            </div>

            <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/40 text-left">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">
                Statutory Source Filings Report:
              </span>
              <p className="mt-1.5 text-xs text-emerald-950 font-serif leading-relaxed font-semibold">
                "{activeFlag?.impact_text.split(":")[1] || activeFlag?.impact_text || "Recomputed statutory figure"}"
              </p>
            </div>
          </div>

          {/* Conflict Authority Switcher (if this is a source conflict) */}
          {matchingConflict && (
            <div className="p-4 bg-amber-50/70 border border-amber-200 rounded-xl space-y-3 text-left">
              <div className="flex items-center gap-2 text-xs font-bold text-amber-900">
                <Scale className="w-4 h-4 text-amber-600" />
                <span>Multi-Source Discrepancy (Choose Authoritative Source)</span>
              </div>
              <p className="text-xs text-amber-950 leading-relaxed">
                {matchingConflict.impact_description}
              </p>
              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => onSwitchAuthority(matchingConflict.id, matchingConflict.fact_a_id)}
                  className={`p-2.5 rounded-lg border text-xs font-semibold text-left transition-all cursor-pointer ${
                    matchingConflict.chosen_authoritative_fact_id === matchingConflict.fact_a_id
                      ? "bg-amber-600 text-white border-amber-600 shadow-xs"
                      : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  <div className="text-[10px] opacity-80">Authoritative Option A</div>
                  <div className="font-bold">{matchingConflict.source_a_title}</div>
                  <div className="text-[11px] tabular-nums mt-0.5">Value: {matchingConflict.value_a?.toLocaleString()}</div>
                </button>

                <button
                  type="button"
                  onClick={() => onSwitchAuthority(matchingConflict.id, matchingConflict.fact_b_id)}
                  className={`p-2.5 rounded-lg border text-xs font-semibold text-left transition-all cursor-pointer ${
                    matchingConflict.chosen_authoritative_fact_id === matchingConflict.fact_b_id
                      ? "bg-amber-600 text-white border-amber-600 shadow-xs"
                      : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  <div className="text-[10px] opacity-80">Option B (Press Release)</div>
                  <div className="font-bold">{matchingConflict.source_b_title}</div>
                  <div className="text-[11px] tabular-nums mt-0.5">Value: {matchingConflict.value_b?.toLocaleString()}</div>
                </button>
              </div>
            </div>
          )}

          {/* Simple Left-to-Right Downstream Impact Flow */}
          {showImpactFlow && (
            <div className="p-4 bg-indigo-50/50 border border-indigo-200 rounded-xl space-y-3 text-left animate-in fade-in duration-150">
              <span className="text-xs font-bold text-indigo-900 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                Downstream Dependency Impact (Deterministic Python Lineage)
              </span>
              <div className="flex items-center gap-2 overflow-x-auto py-2 text-xs">
                <div className="bg-white border border-slate-200 p-2.5 rounded-lg shrink-0 shadow-xs">
                  <div className="text-[10px] text-slate-400 font-semibold uppercase">Source Fact</div>
                  <div className="font-bold text-slate-900 mt-0.5">Revenue Choice</div>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-400 shrink-0" />
                <div className="bg-white border border-slate-200 p-2.5 rounded-lg shrink-0 shadow-xs">
                  <div className="text-[10px] text-slate-400 font-semibold uppercase">Downstream Metric 1</div>
                  <div className="font-bold text-indigo-700 mt-0.5">YoY Growth Rate</div>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-400 shrink-0" />
                <div className="bg-white border border-slate-200 p-2.5 rounded-lg shrink-0 shadow-xs">
                  <div className="text-[10px] text-slate-400 font-semibold uppercase">Downstream Metric 2</div>
                  <div className="font-bold text-indigo-700 mt-0.5">Net Profit Margin</div>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-400 shrink-0" />
                <div className="bg-white border border-slate-200 p-2.5 rounded-lg shrink-0 shadow-xs">
                  <div className="text-[10px] text-slate-400 font-semibold uppercase">Final Verdict</div>
                  <div className="font-bold text-emerald-700 mt-0.5">Tie-Out Passed</div>
                </div>
              </div>
            </div>
          )}

          {/* Dismiss input box if requested */}
          {showDismissInput && (
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-left">
              <label className="text-xs font-semibold text-slate-700">
                Reason for Dismissal (Cryptographic Audit Record):
              </label>
              <input
                type="text"
                value={dismissReason}
                onChange={(e) => setDismissReason(e.target.value)}
                placeholder="e.g. Immaterial rounding difference / Non-GAAP reconciliation approved"
                className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
              <button
                onClick={() => {
                  if (dismissReason.trim()) {
                    onTakeAction("dismiss", dismissReason, activeFlag?.id, activeFlag?.ref_id);
                    setShowDismissInput(false);
                    setDismissReason("");
                    handleNext();
                  }
                }}
                className="px-3 py-1 bg-slate-800 text-white text-xs font-medium rounded-lg hover:bg-slate-900 cursor-pointer"
              >
                Confirm Dismissal
              </button>
            </div>
          )}
        </div>

        {/* Modal Footer Controls */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <button
              onClick={handlePrev}
              disabled={currentIndex === 0}
              className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 text-slate-700 cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={handleNext}
              disabled={currentIndex >= flags.length - 1}
              className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 text-slate-700 cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                onTakeAction("accept", "Accepted statutory source figure", activeFlag?.id, activeFlag?.ref_id);
                handleNext();
              }}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Accept Source Figure</span>
            </button>

            <button
              onClick={() => setShowDismissInput(true)}
              className="px-3 py-1.5 border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              <span>Dismiss with Reason</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

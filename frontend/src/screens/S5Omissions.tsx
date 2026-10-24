import React from "react";
import { CaseState, OmissionItem } from "../types";
import { Radar, AlertOctagon, CheckCircle2, HelpCircle, FileText, ArrowRight } from "lucide-react";

interface S5OmissionsProps {
  caseState: CaseState | null;
  onNavigateToReview: () => void;
}

export const S5Omissions: React.FC<S5OmissionsProps> = ({ caseState, onNavigateToReview }) => {
  const omissions = caseState?.omissions || [];
  const omittedCount = omissions.filter((o) => o.status === "Disclosed in filings but OMITTED from the draft").length;

  return (
    <div className="max-w-7xl mx-auto py-6 px-4 space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between p-5 rounded-xl bg-zinc-900/60 border border-zinc-800 gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Radar className="w-5 h-5 text-rose-400" />
            <h2 className="text-lg font-bold text-zinc-100">Omission Radar: Mandatory Disclosure Checklist</h2>
          </div>
          <p className="text-xs text-zinc-400 mt-1 max-w-2xl">
            Detects critical off-balance-sheet liabilities and governance disclosures present in statutory filings that the AI draft completely failed to mention.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="px-3.5 py-1.5 rounded-lg bg-rose-950/40 border border-rose-500/40 text-rose-400 text-xs font-semibold flex items-center gap-1.5">
            <AlertOctagon className="w-4 h-4 text-rose-400" />
            <span>{omittedCount} High-Severity Omissions Detected</span>
          </div>

          <button
            onClick={onNavigateToReview}
            className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 text-xs font-semibold flex items-center gap-1.5 transition-all"
          >
            <span>Review Flags</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* 8-Card Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {omissions.map((item) => {
          const isOmitted = item.status === "Disclosed in filings but OMITTED from the draft";
          const isAddressed = item.status === "Disclosed in filings and addressed";

          return (
            <div
              key={item.id}
              className={`p-5 rounded-xl border transition-all space-y-3 flex flex-col justify-between ${
                isOmitted
                  ? "bg-rose-950/20 border-rose-500/50 shadow-lg shadow-rose-950/20"
                  : isAddressed
                  ? "bg-zinc-900/40 border-zinc-800"
                  : "bg-zinc-900/20 border-zinc-800/60 opacity-80"
              }`}
            >
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <span className="text-xs font-bold text-zinc-100 leading-snug">
                    {item.checklist_title}
                  </span>
                  <span
                    className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold uppercase shrink-0 ${
                      isOmitted
                        ? "bg-rose-900/60 border border-rose-600 text-rose-200"
                        : isAddressed
                        ? "bg-emerald-950/60 border border-emerald-700 text-emerald-300"
                        : "bg-zinc-800 border border-zinc-700 text-zinc-400"
                    }`}
                  >
                    {isOmitted ? "OMITTED" : isAddressed ? "ADDRESSED" : "NOT FOUND"}
                  </span>
                </div>

                <div className="text-xs font-mono font-bold text-zinc-200">
                  {item.amount_text}
                </div>

                <p className="text-xs text-zinc-400 font-sans leading-relaxed">
                  {item.explanation}
                </p>
              </div>

              {/* Source Highlight Box */}
              {item.disclosed_in_doc_title && (
                <div className="pt-3 border-t border-zinc-800/80 space-y-1.5 text-[11px]">
                  <div className="flex items-center gap-1.5 text-zinc-400 font-mono">
                    <FileText className="w-3.5 h-3.5 text-zinc-500" />
                    <span>{item.disclosed_in_doc_title} (Page {item.disclosed_page})</span>
                  </div>
                  {item.highlight_text && (
                    <div className="p-2 rounded bg-zinc-950 border border-zinc-800 text-[11px] text-zinc-300 italic font-serif">
                      "{item.highlight_text}"
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

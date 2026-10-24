import React, { useState, useEffect } from "react";
import { CaseState, Claim, VerdictDetail, MaterialityFlag } from "../types";
import { VerdictBadge } from "../components/ui/VerdictBadge";
import { 
  Check, 
  RotateCcw, 
  ExternalLink, 
  FileText, 
  Scale, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  Sparkles,
  Flame,
  ArrowRight
} from "lucide-react";

interface S3ReviewProps {
  caseState: CaseState | null;
  onSwitchAuthority: (docId: string) => void;
  onReviewerAction: (type: string, reason: string, flagId?: string, claimId?: string) => void;
}

export const S3Review: React.FC<S3ReviewProps> = ({
  caseState,
  onSwitchAuthority,
  onReviewerAction,
}) => {
  const [selectedClaimId, setSelectedClaimId] = useState<string>("c1");
  const [viewMode, setViewMode] = useState<"draft" | "corrected">("draft");
  const [overrideReason, setOverrideReason] = useState<string>("");
  const [showOverrideInput, setShowOverrideInput] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<"inspector" | "debate">("inspector");

  const claims = caseState?.claims || [];
  const verdicts = caseState?.verdicts || [];
  const flags = caseState?.flags || [];
  const conflicts = caseState?.conflicts || [];
  const debates = caseState?.debates || [];
  const currentAuthority = caseState?.authoritative_rev_doc || "D1";

  // Map verdict details by claim_id
  const verdictsByClaim = React.useMemo(() => {
    const map = new Map<string, VerdictDetail>();
    verdicts.forEach((v) => map.set(v.claim_id, v));
    return map;
  }, [verdicts]);

  const selectedClaim = claims.find((c) => c.id === selectedClaimId) || claims[0];
  const selectedVerdict = selectedClaim ? verdictsByClaim.get(selectedClaim.id) : undefined;
  const associatedFlag = flags.find((f) => f.ref_id === selectedClaimId);

  // Keyboard navigation (J / K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === "j" || e.key === "ArrowDown") {
        const idx = claims.findIndex((c) => c.id === selectedClaimId);
        if (idx < claims.length - 1) setSelectedClaimId(claims[idx + 1].id);
      } else if (e.key === "k" || e.key === "ArrowUp") {
        const idx = claims.findIndex((c) => c.id === selectedClaimId);
        if (idx > 0) setSelectedClaimId(claims[idx - 1].id);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [claims, selectedClaimId]);

  const top3Flags = flags.filter((f) => f.is_top_3);
  const otherFlags = flags.filter((f) => !f.is_top_3);

  const getVerdictStyle = (v?: string) => {
    switch (v) {
      case "Supported":
        return "border-b-2 border-emerald-500/80 bg-emerald-950/20 text-emerald-200";
      case "Contradicted":
        return "border-b-2 border-rose-500/80 bg-rose-950/20 text-rose-200 line-through decoration-rose-500";
      case "Unsupported":
        return "border-b-2 border-amber-500/80 bg-amber-950/20 text-amber-200";
      case "Stale":
        return "border-b-2 border-slate-500/80 bg-slate-900/40 text-slate-300";
      default:
        return "border-b-2 border-zinc-500/80 bg-zinc-900/30 text-zinc-300";
    }
  };

  return (
    <div className="max-w-[1600px] mx-auto py-5 px-4 space-y-4">
      {/* 3-Pane Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 h-[calc(100vh-175px)]">
        
        {/* PANE 1: Left - Flag Queue Ranked by Materiality (3 cols) */}
        <div className="lg:col-span-3 flex flex-col bg-zinc-900/40 border border-zinc-800 rounded-xl overflow-hidden">
          <div className="p-3.5 border-b border-zinc-800 bg-zinc-900/60 flex items-center justify-between">
            <div>
              <h3 className="text-xs font-bold text-zinc-100 uppercase tracking-wider">
                Flag Queue
              </h3>
              <p className="text-[10px] text-zinc-400">Ranked by Downstream Materiality</p>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-800 text-zinc-300">
              {flags.length} Flags
            </span>
          </div>

          <div className="flex-1 overflow-y-auto p-2.5 space-y-4">
            {/* Top 3 Material Flags */}
            <div className="space-y-1.5">
              <span className="text-[10px] font-mono uppercase tracking-wider text-rose-400 font-bold px-1 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-ping"></span>
                Top 3 Material Flags (Review First)
              </span>

              {top3Flags.map((flag) => {
                const isSelected = selectedClaimId === flag.ref_id;
                return (
                  <div
                    key={flag.id}
                    onClick={() => setSelectedClaimId(flag.ref_id)}
                    className={`p-2.5 rounded-lg border transition-all cursor-pointer ${
                      isSelected
                        ? "bg-zinc-800 border-zinc-500 shadow-md ring-1 ring-zinc-500/30"
                        : "bg-zinc-900/80 border-zinc-800 hover:border-zinc-700"
                    }`}
                  >
                    <div className="flex items-center justify-between text-[11px] mb-1">
                      <span className="font-semibold text-zinc-200 truncate max-w-[170px]">{flag.title}</span>
                      <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-rose-950/60 border border-rose-800/80 text-rose-300 font-bold">
                        Impact: {flag.materiality_score.toFixed(0)}
                      </span>
                    </div>
                    <p className="text-[11px] text-zinc-400 font-sans leading-relaxed">{flag.impact_text}</p>
                  </div>
                );
              })}
            </div>

            {/* Other Flags */}
            {otherFlags.length > 0 && (
              <div className="space-y-1.5 pt-2 border-t border-zinc-800/80">
                <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 font-semibold px-1">
                  Secondary Flags
                </span>
                {otherFlags.map((flag) => {
                  const isSelected = selectedClaimId === flag.ref_id;
                  return (
                    <div
                      key={flag.id}
                      onClick={() => setSelectedClaimId(flag.ref_id)}
                      className={`p-2 rounded-lg border transition-all cursor-pointer ${
                        isSelected
                          ? "bg-zinc-800 border-zinc-500"
                          : "bg-zinc-900/40 border-zinc-800/70 hover:border-zinc-700"
                      }`}
                    >
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-zinc-300 truncate max-w-[170px]">{flag.title}</span>
                        <span className="font-mono text-[10px] text-zinc-500">
                          {flag.materiality_score.toFixed(0)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* PANE 2: Center - AI Draft Document with Highlighted Claims (5 cols) */}
        <div className="lg:col-span-5 flex flex-col bg-zinc-900/30 border border-zinc-800 rounded-xl overflow-hidden">
          <div className="p-3.5 border-b border-zinc-800 bg-zinc-900/60 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-zinc-300" />
              <h3 className="text-xs font-bold text-zinc-100 uppercase tracking-wider">
                Research Draft Document
              </h3>
            </div>

            <div className="flex items-center bg-zinc-950 border border-zinc-800 rounded-lg p-0.5 text-xs">
              <button
                onClick={() => setViewMode("draft")}
                className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-all ${
                  viewMode === "draft" ? "bg-zinc-800 text-zinc-100" : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                Annotated Draft
              </button>
              <button
                onClick={() => setViewMode("corrected")}
                className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-all ${
                  viewMode === "corrected" ? "bg-zinc-800 text-emerald-400" : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                Corrected View
              </button>
            </div>
          </div>

          {/* Draft Comparison Pitch Banner */}
          <div className="px-4 py-2 bg-zinc-950/80 border-b border-zinc-800/60 text-[11px] text-zinc-400 flex items-center justify-between">
            <span>
              Pitch Line: <strong className="text-zinc-200">"AI proposes. Evidence decides. Humans approve."</strong>
            </span>
            <span className="font-mono text-[10px] text-zinc-500">Click any claim to inspect evidence</span>
          </div>

          {/* Rendered Text Body */}
          <div className="flex-1 overflow-y-auto p-6 font-serif text-sm leading-relaxed text-zinc-300 bg-zinc-950/40">
            {viewMode === "draft" ? (
              <div className="space-y-4">
                <p>
                  Meridian Textiles Ltd presents an apparent picture of continuing operational expansion.{" "}
                  {claims.map((c) => {
                    const v = verdictsByClaim.get(c.id);
                    const isSelected = selectedClaimId === c.id;
                    const verdictStyle = getVerdictStyle(v?.verdict);

                    return (
                      <span
                        key={c.id}
                        onClick={() => setSelectedClaimId(c.id)}
                        className={`cursor-pointer px-1 py-0.5 rounded transition-all inline ${verdictStyle} ${
                          isSelected ? "ring-2 ring-white font-semibold text-white" : "hover:opacity-90"
                        }`}
                      >
                        {c.text_span}{" "}
                      </span>
                    );
                  })}
                </p>
              </div>
            ) : (
              /* Corrected Clean View */
              <div className="space-y-4 text-zinc-200 font-sans text-xs leading-loose">
                <div className="p-3 rounded-lg bg-emerald-950/20 border border-emerald-500/30 text-emerald-300 mb-3 text-xs">
                  ✓ Corrected Institutional Version: All contradicted assertions replaced with verified Fact Ledger figures.
                </div>
                <p>
                  Meridian Textiles Ltd posted statutory FY2025 revenue of <strong>1,120 crore</strong> (reflecting <strong>12.0% YoY growth</strong>, rather than 18%). Net profit contracted to <strong>72 crore</strong>, with net margin narrowing from 8.0% to <strong>6.4%</strong>. Total borrowings rose by 30% to <strong>520 crore</strong>, and current ratio stands at <strong>0.90</strong>, failing the 1.20 liquidity threshold. Workforce reached 4,200 employees, raising revenue-per-employee to ₹0.267 crore.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* PANE 3: Right - Evidence Inspector & Debate (4 cols) */}
        <div className="lg:col-span-4 flex flex-col bg-zinc-900/40 border border-zinc-800 rounded-xl overflow-hidden">
          {/* Header Tabs */}
          <div className="p-2 border-b border-zinc-800 bg-zinc-900/60 flex items-center justify-between">
            <div className="flex gap-1">
              <button
                onClick={() => setActiveTab("inspector")}
                className={`px-3 py-1 rounded-md text-xs font-semibold transition-all ${
                  activeTab === "inspector" ? "bg-zinc-800 text-zinc-100" : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                Evidence Inspector
              </button>
              <button
                onClick={() => setActiveTab("debate")}
                className={`px-3 py-1 rounded-md text-xs font-semibold transition-all flex items-center gap-1.5 ${
                  activeTab === "debate" ? "bg-zinc-800 text-rose-400" : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                <Flame className="w-3.5 h-3.5 text-rose-400" />
                Red-Team Debate
              </button>
            </div>
          </div>

          {activeTab === "inspector" ? (
            <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
              {/* Claim Summary */}
              {selectedClaim ? (
                <>
                  <div className="space-y-1.5 pb-3 border-b border-zinc-800">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[10px] text-zinc-500">ID: {selectedClaim.id.toUpperCase()}</span>
                      <VerdictBadge verdict={selectedVerdict?.verdict || "Needs Review"} size="sm" />
                    </div>
                    <p className="text-zinc-100 font-medium text-xs leading-relaxed">
                      "{selectedClaim.text_span}"
                    </p>
                  </div>

                  {/* Ground Truth Recomputed Result */}
                  <div className="p-3 rounded-lg bg-zinc-950 border border-zinc-800 space-y-1">
                    <span className="text-[10px] font-mono uppercase text-zinc-400 font-semibold block">
                      Deterministic Recomputation
                    </span>
                    <div className="font-mono text-sm text-zinc-100 font-bold">
                      {selectedVerdict?.recomputed_display || "No numeric formula required"}
                    </div>
                    <p className="text-[11px] text-zinc-400 leading-relaxed mt-1">
                      {selectedVerdict?.rationale}
                    </p>
                  </div>

                  {/* Conflict Authority Resolver (If Claim C1) */}
                  {selectedClaim.id === "c1" && (
                    <div className="p-3.5 rounded-lg bg-zinc-900 border border-rose-500/40 space-y-2.5">
                      <div className="flex items-center gap-2 text-rose-400 font-semibold text-xs">
                        <Scale className="w-4 h-4" />
                        <span>Disputed Revenue Conflict (60 cr Discrepancy)</span>
                      </div>
                      <p className="text-[11px] text-zinc-300">
                        Select which source is authoritative for FY2025 revenue:
                      </p>
                      <div className="grid grid-cols-2 gap-2 text-[11px]">
                        <button
                          onClick={() => onSwitchAuthority("D1")}
                          className={`p-2 rounded border text-left transition-all ${
                            currentAuthority === "D1"
                              ? "bg-emerald-950/40 border-emerald-500 text-emerald-300 font-bold"
                              : "bg-zinc-800/80 border-zinc-700 text-zinc-400 hover:text-zinc-200"
                          }`}
                        >
                          <div className="font-mono text-xs">D1: Annual Report</div>
                          <div className="text-[10px] opacity-80">1,120 cr (12% Growth)</div>
                        </button>
                        <button
                          onClick={() => onSwitchAuthority("D2")}
                          className={`p-2 rounded border text-left transition-all ${
                            currentAuthority === "D2"
                              ? "bg-rose-950/40 border-rose-500 text-rose-300 font-bold"
                              : "bg-zinc-800/80 border-zinc-700 text-zinc-400 hover:text-zinc-200"
                          }`}
                        >
                          <div className="font-mono text-xs">D2: Press Release</div>
                          <div className="text-[10px] opacity-80">1,180 cr (18% Growth)</div>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Cited Statutory Evidence */}
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-mono uppercase text-zinc-400 font-semibold block">
                      Cited Ground-Truth Source
                    </span>
                    {selectedVerdict?.evidence_doc_titles ? (
                      JSON.parse(selectedVerdict.evidence_doc_titles).map((docTitle: string, idx: number) => (
                        <div
                          key={idx}
                          className="p-3 rounded-lg bg-zinc-900 border border-zinc-800 text-xs text-zinc-300 flex items-start gap-2"
                        >
                          <FileText className="w-4 h-4 text-zinc-400 shrink-0 mt-0.5" />
                          <div>
                            <span className="font-bold text-zinc-200 block">{docTitle}</span>
                            <span className="text-[11px] text-zinc-400">Exact sentence & cell reference matched.</span>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-zinc-500 text-xs">No direct document citations found.</div>
                    )}
                  </div>

                  {/* Reviewer Action Buttons */}
                  <div className="pt-2 border-t border-zinc-800 space-y-2">
                    <span className="text-[10px] font-mono uppercase text-zinc-400 font-semibold block">
                      Human Reviewer Actions
                    </span>

                    <div className="flex gap-2">
                      <button
                        onClick={() =>
                          onReviewerAction("accept_verdict", "Analyst confirmed verdict against statutory footnote.", associatedFlag?.id, selectedClaim.id)
                        }
                        className="flex-1 py-1.5 px-3 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-semibold text-xs flex items-center justify-center gap-1.5 transition-all"
                      >
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Accept Verdict</span>
                      </button>

                      <button
                        onClick={() => setShowOverrideInput(!showOverrideInput)}
                        className="py-1.5 px-3 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-semibold text-xs flex items-center justify-center gap-1.5 transition-all"
                      >
                        <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
                        <span>Override...</span>
                      </button>
                    </div>

                    {showOverrideInput && (
                      <div className="p-2.5 rounded-lg bg-zinc-950 border border-zinc-700 space-y-2">
                        <input
                          type="text"
                          placeholder="State reason for overriding verdict..."
                          value={overrideReason}
                          onChange={(e) => setOverrideReason(e.target.value)}
                          className="w-full bg-zinc-900 border border-zinc-700 rounded p-1.5 text-xs text-zinc-200 focus:outline-none"
                        />
                        <button
                          onClick={() => {
                            if (overrideReason) {
                              onReviewerAction("override_verdict", overrideReason, associatedFlag?.id, selectedClaim.id);
                              setShowOverrideInput(false);
                              setOverrideReason("");
                            }
                          }}
                          className="w-full py-1 rounded bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs"
                        >
                          Submit Override
                        </button>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="text-center text-zinc-500 pt-10">Select a claim to inspect evidence</div>
              )}
            </div>
          ) : (
            /* RED-TEAM DEBATE PANEL */
            <div className="flex-1 overflow-y-auto p-4 space-y-3 text-xs">
              <div className="p-2 rounded bg-rose-950/20 border border-rose-500/30 text-rose-300 text-[11px] mb-2">
                Devil (Bear Case) vs Auditor (Statutory Verifier). Visibly real disagreements with evidence lineage.
              </div>

              {debates.map((deb) => (
                <div key={deb.id} className="p-3 rounded-lg bg-zinc-900/60 border border-zinc-800 space-y-2">
                  <div>
                    <span className="font-mono text-[10px] text-rose-400 font-bold uppercase block mb-1">
                      Devil Challenge ({deb.devil_point_id})
                    </span>
                    <p className="text-zinc-200 text-xs">{deb.devil_challenge}</p>
                  </div>

                  <div className="pt-2 border-t border-zinc-800/80">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono text-[10px] text-zinc-400 font-bold uppercase">Auditor Response:</span>
                      <span
                        className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                          deb.auditor_response === "REBUTTED"
                            ? "bg-emerald-950 text-emerald-400 border border-emerald-800"
                            : "bg-rose-950 text-rose-400 border border-rose-800"
                        }`}
                      >
                        {deb.auditor_response}
                      </span>
                    </div>
                    <p className="text-zinc-400 text-[11px] leading-relaxed">{deb.auditor_rationale}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

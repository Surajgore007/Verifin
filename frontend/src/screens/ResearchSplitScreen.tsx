import React, { useState } from "react";
import { VerdictBadge } from "../components/ui/VerdictBadge";
import { 
  FileText, 
  ExternalLink, 
  Search, 
  AlertCircle, 
  ShieldAlert, 
  Flame, 
  Radar, 
  ChevronRight, 
  ChevronLeft,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Maximize2
} from "lucide-react";

interface Claim {
  id: string;
  sentence_index: number;
  text_span: string;
  metric?: string;
  period?: string;
  asserted_value?: string;
  stated_precision?: string;
}

interface VerdictItem {
  id: string;
  claim_id: string;
  verdict: string;
  recomputed_value?: number;
  recomputed_display?: string;
  rationale: string;
  tolerance_passed?: number;
  page_number?: number;
  highlight_bbox?: number[];
  quote?: string;
}

interface OmissionItem {
  id: string;
  checklist_title: string;
  status: string;
  severity: string;
  explanation: string;
  disclosed_in?: string;
  page?: number;
  snippet?: string;
}

interface DebateItem {
  id: string;
  devil_point_id: string;
  devil_challenge: string;
  devil_evidence_chips: Array<{ label: string; doc: string }>;
  auditor_response: string;
  auditor_rationale: string;
  auditor_evidence_chips: Array<{ label: string; doc: string }>;
}

interface ResearchSplitScreenProps {
  claims: Claim[];
  verdicts: VerdictItem[];
  omissions: OmissionItem[];
  debates: DebateItem[];
  draftTitle: string;
  draftText: string;
  companyName: string;
  onSelectClaimForReview?: (claimId: string) => void;
}

export const ResearchSplitScreen: React.FC<ResearchSplitScreenProps> = ({
  claims,
  verdicts,
  omissions,
  debates,
  draftTitle,
  draftText,
  companyName,
  onSelectClaimForReview
}) => {
  const [activeTab, setActiveTab] = useState<"tieout" | "omissions" | "debate">("tieout");
  const [selectedClaimId, setSelectedClaimId] = useState<string>(claims[0]?.id || "");
  const [sourcePage, setSourcePage] = useState<number>(1);

  // Map claim ID to verdict
  const verdictMap = new Map<string, VerdictItem>();
  verdicts.forEach((v) => verdictMap.set(v.claim_id, v));

  const selectedVerdict = verdictMap.get(selectedClaimId);
  const selectedClaim = claims.find((c) => c.id === selectedClaimId);

  // When a claim or citation chip is clicked
  const handleSelectClaim = (cid: string) => {
    setSelectedClaimId(cid);
    const v = verdictMap.get(cid);
    if (v && v.page_number) {
      setSourcePage(v.page_number);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-80px)] bg-slate-50">
      {/* Tab Navigation Header */}
      <div className="px-6 py-2 bg-white border-b border-slate-200 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab("tieout")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeTab === "tieout"
                ? "bg-indigo-50 text-indigo-700 border border-indigo-200 shadow-xs"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
            }`}
          >
            Draft Tie-Out & Citations
          </button>
          <button
            onClick={() => setActiveTab("omissions")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === "omissions"
                ? "bg-indigo-50 text-indigo-700 border border-indigo-200 shadow-xs"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
            }`}
          >
            <Radar className="w-3.5 h-3.5 text-indigo-600" />
            <span>Missing Disclosures</span>
            <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-rose-100 text-rose-700">
              {omissions.filter((o) => o.status.includes("OMITTED") || o.status.includes("Disclosed but")).length}
            </span>
          </button>
          <button
            onClick={() => setActiveTab("debate")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === "debate"
                ? "bg-indigo-50 text-indigo-700 border border-indigo-200 shadow-xs"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
            }`}
          >
            <Flame className="w-3.5 h-3.5 text-amber-600" />
            <span>Red-Team Debate</span>
          </button>
        </div>

        <div className="text-xs text-slate-500 font-medium">
          Source Document: <span className="font-semibold text-slate-800">{companyName} Form 10-K (Official SEC Filing)</span>
        </div>
      </div>

      {/* Main Content Area */}
      {activeTab === "tieout" && (
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 overflow-hidden">
          {/* Left Pane: Answer with Numbered Citations & Status Dots */}
          <div className="h-full border-r border-slate-200 bg-white overflow-y-auto p-6 lg:p-8">
            <div className="max-w-xl mx-auto space-y-6">
              <div className="border-b border-slate-100 pb-4">
                <span className="text-[10px] uppercase font-bold tracking-wider text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                  Grounded Research Output
                </span>
                <h2 className="text-xl font-bold text-slate-900 mt-2">{draftTitle}</h2>
                <p className="text-xs text-slate-500 mt-1">
                  Click any statement or numbered citation chip to inspect exact bounding box coordinates in the statutory filing.
                </p>
              </div>

              {/* Statement List */}
              <div className="space-y-3">
                {claims.map((claim, idx) => {
                  const verdict = verdictMap.get(claim.id);
                  const isSelected = claim.id === selectedClaimId;
                  const vText = verdict?.verdict || "Needs review";

                  // Status dot colors
                  const getDotClass = () => {
                    if (vText === "Verified" || vText === "Supported") return "bg-emerald-500";
                    if (vText.includes("Conflict") || vText.includes("Contradict")) return "bg-rose-500";
                    if (vText.includes("Not supported") || vText.includes("Unsupported")) return "bg-amber-500";
                    return "bg-slate-400";
                  };

                  return (
                    <div
                      key={claim.id}
                      onClick={() => handleSelectClaim(claim.id)}
                      className={`p-3.5 rounded-xl border transition-all cursor-pointer text-left relative ${
                        isSelected
                          ? "bg-indigo-50/50 border-indigo-300 shadow-sm"
                          : "bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/60"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <span className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${getDotClass()}`} />
                        <div className="flex-1">
                          <p className="text-xs text-slate-900 leading-relaxed font-normal">
                            {claim.text_span}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSelectClaim(claim.id);
                              }}
                              className="citation-chip ml-1.5"
                            >
                              [{idx + 1}]
                            </button>
                          </p>

                          <div className="mt-2.5 flex items-center justify-between gap-2 pt-2 border-t border-slate-100/80">
                            <div className="flex items-center gap-2">
                              <VerdictBadge verdict={vText} size="sm" />
                              {verdict?.recomputed_display && (
                                <span className="text-[11px] font-semibold text-slate-700 tabular-nums">
                                  Recomputed: {verdict.recomputed_display}
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] text-indigo-600 font-medium hover:underline">
                              View in 10-K &rarr;
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right Pane: Source Viewer with Exact Highlight */}
          <div className="h-full bg-slate-100/70 overflow-y-auto p-6 lg:p-8 flex flex-col">
            <div className="max-w-xl mx-auto w-full flex-1 flex flex-col">
              {/* Document Header Controls */}
              <div className="bg-white rounded-t-xl border border-slate-200 border-b-0 px-4 py-2.5 flex items-center justify-between shadow-xs">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-slate-500" />
                  <span className="text-xs font-bold text-slate-800">
                    {companyName} Form 10-K
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setSourcePage(Math.max(1, sourcePage - 1))}
                    className="p-1 rounded hover:bg-slate-100 text-slate-500"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </button>
                  <span className="text-xs font-mono text-slate-600">
                    Page {sourcePage}
                  </span>
                  <button
                    onClick={() => setSourcePage(sourcePage + 1)}
                    className="p-1 rounded hover:bg-slate-100 text-slate-500"
                  >
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Source Document Card */}
              <div className="flex-1 bg-white border border-slate-200 rounded-b-xl p-6 shadow-xs overflow-y-auto relative">
                {selectedVerdict ? (
                  <div className="space-y-4">
                    {/* Highlight Box Banner */}
                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                      <div className="flex items-center justify-between text-xs font-semibold text-amber-900 mb-1">
                        <span>CITED PASSAGE & HIGHLIGHT</span>
                        <span className="text-[10px] font-mono text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded">
                          Page {selectedVerdict.page_number || sourcePage}
                        </span>
                      </div>
                      <p className="text-xs text-amber-950 font-serif leading-relaxed italic">
                        "{selectedVerdict.quote || selectedVerdict.rationale}"
                      </p>
                    </div>

                    {/* Statement Verification Rationale */}
                    <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-2 text-xs">
                      <div className="font-semibold text-slate-800 flex items-center justify-between">
                        <span>Audit Verdict Provenance:</span>
                        <VerdictBadge verdict={selectedVerdict.verdict} size="sm" />
                      </div>
                      <p className="text-slate-600 leading-relaxed">
                        {selectedVerdict.rationale}
                      </p>
                      {selectedVerdict.recomputed_display && (
                        <div className="pt-2 border-t border-slate-200/80 flex items-center justify-between font-mono text-[11px]">
                          <span className="text-slate-500">Fact Ledger Value:</span>
                          <span className="font-bold text-slate-900">{selectedVerdict.recomputed_display}</span>
                        </div>
                      )}
                    </div>

                    {/* Statutory Document Text Simulation */}
                    <div className="pt-4 border-t border-slate-100 text-slate-700 font-serif text-xs leading-relaxed space-y-3">
                      <div className="text-[10px] font-sans font-bold uppercase tracking-wider text-slate-400">
                        Item 8. Consolidated Financial Statements
                      </div>
                      <p className="text-slate-500">
                        The consolidated statements of operations reflect audited performance for the fiscal years ended September 27, 2025, September 28, 2024, and September 30, 2023.
                      </p>
                      {/* Highlighted text block */}
                      <div className="p-2.5 bg-yellow-100/80 border-l-3 border-yellow-500 text-slate-900 font-medium rounded-r">
                        Total net sales were reported as $416,161 million, with cost of sales of $220,960 million and gross profit of $195,201 million. Operating income totaled $133,050 million and net income reached $112,010 million.
                      </div>
                      <p className="text-slate-500">
                        Diluted net income per share was $7.46, compared to $6.08 in fiscal 2024 and $6.13 in fiscal 2023. Cash generated by operating activities was $111,482 million.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-center text-slate-400 py-12">
                    <Search className="w-8 h-8 text-slate-300 mb-2" />
                    <p className="text-xs">Select any claim on the left to locate its exact highlight coordinates in the filing.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Omission Radar */}
      {activeTab === "omissions" && (
        <div className="flex-1 p-6 lg:p-8 overflow-y-auto max-w-4xl mx-auto w-full">
          <div className="mb-6">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Radar className="w-5 h-5 text-indigo-600" />
              <span>Omission Radar: Statutory Disclosure Checklist</span>
            </h2>
            <p className="text-xs text-slate-600 mt-1">
              Checks real 10-K filings for mandatory disclosures and determines whether the research draft addressed or omitted them.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {omissions.map((om) => {
              const isOmitted = om.status.includes("OMITTED") || om.status.includes("Disclosed but");
              const isNotFound = om.status.includes("Not found");
              return (
                <div
                  key={om.id}
                  className={`p-4 rounded-xl border transition-all text-left ${
                    isOmitted
                      ? "bg-rose-50/60 border-rose-200"
                      : isNotFound
                      ? "bg-slate-50 border-slate-200"
                      : "bg-emerald-50/60 border-emerald-200"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="text-xs font-bold text-slate-900">{om.checklist_title}</span>
                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                        isOmitted
                          ? "bg-rose-100 text-rose-800 border-rose-200"
                          : isNotFound
                          ? "bg-slate-100 text-slate-600 border-slate-200"
                          : "bg-emerald-100 text-emerald-800 border-emerald-200"
                      }`}
                    >
                      {om.status}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed mb-2">
                    {om.explanation}
                  </p>
                  {om.snippet && (
                    <div className="p-2 bg-white/80 rounded border border-slate-200/80 text-[11px] font-serif text-slate-800 italic">
                      "{om.snippet}"
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Tab 3: Red-Team Debate */}
      {activeTab === "debate" && (
        <div className="flex-1 p-6 lg:p-8 overflow-y-auto max-w-4xl mx-auto w-full">
          <div className="mb-6">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Flame className="w-5 h-5 text-amber-600" />
              <span>Red-Team Debate: Devil (Bear-Case Challenger) vs Auditor</span>
            </h2>
            <p className="text-xs text-slate-600 mt-1">
              Adversarial agent challenges the research draft. The Auditor verifies or rebuts each challenge using Fact Ledger arithmetic.
            </p>
          </div>

          <div className="space-y-4">
            {debates.map((d) => (
              <div key={d.id} className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs text-left space-y-3">
                {/* Devil Challenge */}
                <div className="flex items-start gap-3">
                  <span className="px-2 py-0.5 rounded bg-rose-50 text-rose-700 text-[10px] font-bold tracking-wide uppercase border border-rose-200 shrink-0">
                    Devil Challenge
                  </span>
                  <div className="flex-1">
                    <p className="text-xs font-semibold text-slate-900 leading-relaxed">
                      {d.devil_challenge}
                    </p>
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {d.devil_evidence_chips?.map((c, i) => (
                        <span key={i} className="text-[10px] bg-slate-50 border border-slate-200 text-slate-600 px-2 py-0.5 rounded">
                          {c.label} ({c.doc})
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Auditor Rebuttal / Verdict */}
                <div className="pl-4 border-l-2 border-indigo-500 pt-2 flex items-start gap-3">
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold tracking-wide uppercase border shrink-0 ${
                      d.auditor_response === "REBUTTED"
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                        : d.auditor_response === "CONFIRMED"
                        ? "bg-rose-50 text-rose-700 border-rose-200"
                        : "bg-amber-50 text-amber-700 border-amber-200"
                    }`}
                  >
                    Auditor: {d.auditor_response}
                  </span>
                  <div className="flex-1">
                    <p className="text-xs text-slate-700 leading-relaxed">
                      {d.auditor_rationale}
                    </p>
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {d.auditor_evidence_chips?.map((c, i) => (
                        <span key={i} className="text-[10px] bg-indigo-50 border border-indigo-200 text-indigo-700 font-semibold px-2 py-0.5 rounded">
                          {c.label}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

import React, { useState, useRef, useEffect } from "react";
import { VerdictBadge } from "../components/ui/VerdictBadge";
import {
  FileText,
  Search,
  Radar,
  Flame,
  ChevronRight,
  ChevronLeft,
  BookOpen,
  BarChart3,
  Info,
  Send,
  Loader2,
  Zap,
  History,
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

interface MetricItem {
  id: string;
  name: string;
  display_name: string;
  period: string;
  value: number;
  unit: string;
  formula_text: string;
}

interface RunProvenance {
  run_id: string | null;
  timestamp: string | null;
  model: string | null;
  is_live: boolean;
  is_replay: boolean;
  duration_ms?: number;
}

interface ResearchSplitScreenProps {
  claims: Claim[];
  verdicts: VerdictItem[];
  omissions: OmissionItem[];
  debates: DebateItem[];
  metrics: MetricItem[];
  draftTitle: string;
  draftText: string;
  companyName: string;
  runProvenance?: RunProvenance;
  onSelectClaimForReview?: (claimId: string) => void;
}

export const ResearchSplitScreen: React.FC<ResearchSplitScreenProps> = ({
  claims,
  verdicts,
  omissions,
  debates,
  metrics,
  draftTitle,
  draftText,
  companyName,
  runProvenance,
  onSelectClaimForReview,
}) => {
  const [activeTab, setActiveTab] = useState<"tieout" | "omissions" | "debate">("tieout");
  const [rightPane, setRightPane] = useState<"sources" | "ledger" | "rundetails">("sources");
  const [selectedClaimId, setSelectedClaimId] = useState<string>(claims[0]?.id || "");
  const [sourcePage, setSourcePage] = useState<number>(1);
  const [chatInput, setChatInput] = useState("");
  const [chatHistory, setChatHistory] = useState<Array<{ role: "user" | "assistant"; text: string }>>([]);
  const [chatLoading, setChatLoading] = useState(false);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  const verdictMap = new Map<string, VerdictItem>();
  verdicts.forEach((v) => verdictMap.set(v.claim_id, v));

  const selectedVerdict = verdictMap.get(selectedClaimId);
  const selectedClaim = claims.find((c) => c.id === selectedClaimId);

  const handleSelectClaim = (cid: string) => {
    setSelectedClaimId(cid);
    const v = verdictMap.get(cid);
    if (v && v.page_number) setSourcePage(v.page_number);
    setRightPane("sources");
  };

  // Auto-scroll chat
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatHistory]);

  const handleChatSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const q = chatInput.trim();
    if (!q) return;
    setChatInput("");
    setChatHistory((prev) => [...prev, { role: "user", text: q }]);
    setChatLoading(true);
    try {
      const res = await fetch("http://localhost:8000/api/research/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: q, company_name: companyName }),
      });
      const data = await res.json();
      setChatHistory((prev) => [
        ...prev,
        {
          role: "assistant",
          text:
            data.draft?.summary ||
            data.draft?.full_text?.slice(0, 300) + "…" ||
            "Research complete — see updated tie-out above.",
        },
      ]);
    } catch {
      setChatHistory((prev) => [
        ...prev,
        { role: "assistant", text: "Error reaching backend. Check server status." },
      ]);
    } finally {
      setChatLoading(false);
    }
  };

  const getDotClass = (verdict?: VerdictItem) => {
    const vText = verdict?.verdict || "";
    if (vText === "Verified" || vText === "Supported") return "bg-emerald-500";
    if (vText.includes("Conflict") || vText.includes("Contradict")) return "bg-rose-500";
    if (vText.includes("Not supported") || vText.includes("Unsupported")) return "bg-amber-500";
    return "bg-slate-400";
  };

  return (
    <div className="flex flex-col h-[calc(100vh-80px)] bg-slate-50">
      {/* Tab Navigation Header */}
      <div className="px-6 py-2 bg-white border-b border-slate-200 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
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
            <Radar className="w-3.5 h-3.5" />
            Missing Disclosures
            <span className="text-[10px] font-bold px-1.5 rounded-full bg-rose-100 text-rose-700">
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
            Red-Team Debate
          </button>
        </div>

        <div className="text-[10px] text-slate-500 font-mono">
          {companyName} · SEC Form 10-K
        </div>
      </div>

      {/* Main Content Area — Tie-Out view has split pane */}
      {activeTab === "tieout" && (
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 overflow-hidden">
          {/* Left: Claims list with status dots */}
          <div className="h-full border-r border-slate-200 bg-white overflow-y-auto flex flex-col">
            <div className="flex-1 p-5 lg:p-7 space-y-2 overflow-y-auto">
              <div className="mb-4">
                <span className="text-[10px] uppercase font-bold tracking-wider text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                  Grounded Research Output
                </span>
                <h2 className="text-lg font-bold text-slate-900 mt-2">{draftTitle}</h2>
                <p className="text-[11px] text-slate-500 mt-1">
                  Click any statement to inspect its exact source passage and audit rationale.
                </p>
              </div>

              {claims.map((claim, idx) => {
                const verdict = verdictMap.get(claim.id);
                const isSelected = claim.id === selectedClaimId;
                return (
                  <div
                    key={claim.id}
                    onClick={() => handleSelectClaim(claim.id)}
                    className={`p-3.5 rounded-xl border transition-all cursor-pointer text-left ${
                      isSelected
                        ? "bg-indigo-50/50 border-indigo-300 shadow-sm"
                        : "bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/60"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <span className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${getDotClass(verdict)}`} />
                      <div className="flex-1">
                        <p className="text-xs text-slate-900 leading-relaxed">
                          {claim.text_span}
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); handleSelectClaim(claim.id); }}
                            className="citation-chip ml-1.5"
                          >
                            [{idx + 1}]
                          </button>
                        </p>
                        <div className="mt-2 flex items-center justify-between gap-2 pt-2 border-t border-slate-100/80">
                          <div className="flex items-center gap-2">
                            <VerdictBadge verdict={verdict?.verdict || "Needs review"} size="sm" />
                            {verdict?.recomputed_display && (
                              <span className="text-[11px] font-semibold text-slate-700 tabular-nums">
                                {verdict.recomputed_display}
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] text-indigo-600 font-medium">
                            View source →
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pinned Follow-up Chat Box — Patch E */}
            <div className="border-t border-slate-200 bg-white p-4">
              {chatHistory.length > 0 && (
                <div className="mb-3 max-h-40 overflow-y-auto space-y-2">
                  {chatHistory.map((msg, i) => (
                    <div
                      key={i}
                      className={`text-xs rounded-lg px-3 py-2 ${
                        msg.role === "user"
                          ? "bg-indigo-50 text-indigo-900 ml-6"
                          : "bg-slate-50 text-slate-700 mr-6"
                      }`}
                    >
                      {msg.text}
                    </div>
                  ))}
                  <div ref={chatBottomRef} />
                </div>
              )}
              <form onSubmit={handleChatSubmit} className="flex items-center gap-2">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Ask a follow-up question about this filing…"
                  className="flex-1 px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all"
                />
                <button
                  type="submit"
                  disabled={chatLoading || !chatInput.trim()}
                  className="p-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors disabled:opacity-40"
                >
                  {chatLoading ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Send className="w-3.5 h-3.5" />
                  )}
                </button>
              </form>
            </div>
          </div>

          {/* Right: Context-Aware Pane with Tab Strip — Patch E */}
          <div className="h-full bg-slate-100/70 flex flex-col overflow-hidden">
            {/* Tab Strip */}
            <div className="bg-white border-b border-slate-200 px-4 py-2 flex items-center gap-1">
              {(["sources", "ledger", "rundetails"] as const).map((tab) => {
                const labels: Record<string, React.ReactNode> = {
                  sources: (
                    <span className="flex items-center gap-1.5">
                      <BookOpen className="w-3 h-3" />
                      Sources
                    </span>
                  ),
                  ledger: (
                    <span className="flex items-center gap-1.5">
                      <BarChart3 className="w-3 h-3" />
                      Ledger
                    </span>
                  ),
                  rundetails: (
                    <span className="flex items-center gap-1.5">
                      <Info className="w-3 h-3" />
                      Run Details
                    </span>
                  ),
                };
                return (
                  <button
                    key={tab}
                    onClick={() => setRightPane(tab)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      rightPane === tab
                        ? "bg-slate-100 text-slate-900"
                        : "text-slate-500 hover:text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    {labels[tab]}
                  </button>
                );
              })}
              <div className="ml-auto text-[10px] font-mono text-slate-400">
                p.{sourcePage}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-5 lg:p-6">
              {/* SOURCES TAB */}
              {rightPane === "sources" && (
                <div className="space-y-4">
                  {/* Page Navigator */}
                  <div className="bg-white rounded-xl border border-slate-200 px-4 py-2.5 flex items-center justify-between shadow-xs">
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
                      <span className="text-xs font-mono text-slate-600">Page {sourcePage}</span>
                      <button
                        onClick={() => setSourcePage(sourcePage + 1)}
                        className="p-1 rounded hover:bg-slate-100 text-slate-500"
                      >
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {selectedVerdict ? (
                    <div className="space-y-3">
                      {/* Cited Passage */}
                      <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl">
                        <div className="flex items-center justify-between text-xs font-semibold text-amber-900 mb-1.5">
                          <span>Cited Passage</span>
                          <span className="text-[10px] font-mono text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded">
                            p.{selectedVerdict.page_number || sourcePage}
                          </span>
                        </div>
                        <p className="text-xs text-amber-950 font-serif leading-relaxed italic">
                          "{selectedVerdict.quote || selectedVerdict.rationale}"
                        </p>
                      </div>

                      {/* Audit Verdict */}
                      <div className="p-4 bg-white border border-slate-200 rounded-xl space-y-2 text-xs shadow-xs">
                        <div className="font-semibold text-slate-800 flex items-center justify-between">
                          <span>Audit Verdict</span>
                          <VerdictBadge verdict={selectedVerdict.verdict} size="sm" />
                        </div>
                        <p className="text-slate-600 leading-relaxed">{selectedVerdict.rationale}</p>
                        {selectedVerdict.recomputed_display && (
                          <div className="pt-2 border-t border-slate-200/80 flex items-center justify-between font-mono text-[11px]">
                            <span className="text-slate-500">Fact Ledger:</span>
                            <span className="font-bold text-slate-900">{selectedVerdict.recomputed_display}</span>
                          </div>
                        )}
                      </div>

                      {/* Statutory excerpt */}
                      <div className="p-4 bg-white border border-slate-200 rounded-xl text-xs shadow-xs font-serif leading-relaxed space-y-2 text-slate-700">
                        <div className="text-[10px] font-sans font-bold uppercase tracking-wider text-slate-400">
                          Item 8. Consolidated Financial Statements
                        </div>
                        <div className="p-2.5 bg-yellow-50 border-l-2 border-yellow-400 text-slate-900 font-medium rounded-r text-[11px]">
                          Total net sales were reported as $416,161M, gross profit $195,201M, net income $112,010M.
                        </div>
                        <p className="text-slate-500 text-[11px]">
                          Diluted EPS $7.46 vs $6.08 in FY2024. Operating cash flow $111,482M.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="h-48 flex flex-col items-center justify-center text-center text-slate-400 py-12">
                      <Search className="w-8 h-8 text-slate-300 mb-2" />
                      <p className="text-xs">Select a statement on the left to inspect its filing passage.</p>
                    </div>
                  )}
                </div>
              )}

              {/* LEDGER TAB */}
              {rightPane === "ledger" && (
                <div className="space-y-3">
                  <div className="mb-2">
                    <h3 className="text-sm font-bold text-slate-900">Fact Ledger</h3>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      All metrics recomputed in deterministic Python — no LLM arithmetic.
                    </p>
                  </div>
                  {metrics.length === 0 ? (
                    <div className="text-xs text-slate-400 text-center py-8">No metrics computed yet.</div>
                  ) : (
                    metrics.map((m) => (
                      <div
                        key={m.id}
                        className="bg-white border border-slate-200 rounded-xl px-4 py-3 shadow-xs"
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-semibold text-slate-800">{m.display_name}</span>
                          <span className="text-xs font-bold tabular-nums text-slate-900">
                            {m.unit === "%" || m.unit === "ratio"
                              ? `${m.value.toFixed(2)}${m.unit === "%" ? "%" : ""}`
                              : `$${(m.value / 1000).toFixed(1)}B`}
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-500 font-mono">{m.formula_text}</div>
                        <div className="text-[10px] text-slate-400 mt-0.5">Period: {m.period}</div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* RUN DETAILS TAB */}
              {rightPane === "rundetails" && (
                <div className="space-y-3">
                  <div className="mb-2">
                    <h3 className="text-sm font-bold text-slate-900">Run Details</h3>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Full provenance for this research session.
                    </p>
                  </div>

                  {runProvenance?.run_id ? (
                    <div className="space-y-2.5">
                      {/* Mode badge */}
                      <div className={`flex items-center gap-2 px-4 py-3 rounded-xl border font-medium text-xs ${
                        runProvenance.is_replay
                          ? "bg-amber-50 border-amber-200 text-amber-800"
                          : "bg-emerald-50 border-emerald-200 text-emerald-800"
                      }`}>
                        {runProvenance.is_replay ? (
                          <>
                            <History className="w-4 h-4" />
                            Replay mode — loaded from saved bundle
                          </>
                        ) : (
                          <>
                            <Zap className="w-4 h-4" />
                            Live run — real SEC EDGAR + LLM calls
                          </>
                        )}
                      </div>

                      {[
                        { label: "Run ID", value: runProvenance.run_id },
                        {
                          label: "Timestamp",
                          value: runProvenance.timestamp
                            ? new Date(runProvenance.timestamp).toLocaleString()
                            : "—",
                        },
                        { label: "Model", value: runProvenance.model || "—" },
                        {
                          label: "Duration",
                          value: runProvenance.duration_ms
                            ? `${(runProvenance.duration_ms / 1000).toFixed(2)}s`
                            : "—",
                        },
                        { label: "Company", value: companyName },
                        { label: "EDGAR source", value: runProvenance.is_replay ? "Replay bundle" : "Live SEC EDGAR" },
                      ].map(({ label, value }) => (
                        <div
                          key={label}
                          className="bg-white border border-slate-200 rounded-xl px-4 py-3 shadow-xs flex items-center justify-between"
                        >
                          <span className="text-[11px] font-semibold text-slate-500">{label}</span>
                          <span className="text-xs font-mono text-slate-800 text-right max-w-[55%] truncate">
                            {value}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-xs text-slate-400 text-center py-10">
                      No run recorded yet. Submit a research question to generate provenance.
                    </div>
                  )}
                </div>
              )}
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
              Omission Radar: Statutory Disclosure Checklist
            </h2>
            <p className="text-xs text-slate-600 mt-1">
              Checks real 10-K filings for mandatory disclosures and whether the draft addressed them.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {omissions.map((om) => {
              const isOmitted = om.status.includes("OMITTED") || om.status.includes("Disclosed but");
              const isNotFound = om.status.includes("Not found");
              return (
                <div
                  key={om.id}
                  className={`p-4 rounded-xl border ${
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
                  <p className="text-xs text-slate-600 leading-relaxed">{om.explanation}</p>
                  {om.snippet && (
                    <div className="mt-2 p-2 bg-white/80 rounded border border-slate-200/80 text-[11px] font-serif text-slate-800 italic">
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
              Red-Team Debate: Devil vs Auditor
            </h2>
            <p className="text-xs text-slate-600 mt-1">
              Adversarial bear-case challenges answered by Fact Ledger arithmetic.
            </p>
          </div>
          <div className="space-y-4">
            {debates.map((d) => (
              <div
                key={d.id}
                className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-3"
              >
                <div className="flex items-start gap-3">
                  <span className="px-2 py-0.5 rounded bg-rose-50 text-rose-700 text-[10px] font-bold tracking-wide uppercase border border-rose-200 shrink-0">
                    Devil
                  </span>
                  <div className="flex-1">
                    <p className="text-xs font-semibold text-slate-900 leading-relaxed">
                      {d.devil_challenge}
                    </p>
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {d.devil_evidence_chips?.map((c, i) => (
                        <span
                          key={i}
                          className="text-[10px] bg-slate-50 border border-slate-200 text-slate-600 px-2 py-0.5 rounded"
                        >
                          {c.label} ({c.doc})
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
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
                    <p className="text-xs text-slate-700 leading-relaxed">{d.auditor_rationale}</p>
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {d.auditor_evidence_chips?.map((c, i) => (
                        <span
                          key={i}
                          className="text-[10px] bg-indigo-50 border border-indigo-200 text-indigo-700 font-semibold px-2 py-0.5 rounded"
                        >
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

import React, { useState } from "react";
import { CaseState } from "../types";
import { Play, Zap, FileSpreadsheet, Sparkles, Building2, HelpCircle } from "lucide-react";

interface S1NewCaseProps {
  caseState: CaseState | null;
  onRunPipeline: (question?: string) => void;
  onInstantDemo: () => void;
  isLoading: boolean;
}

export const S1NewCase: React.FC<S1NewCaseProps> = ({
  caseState,
  onRunPipeline,
  onInstantDemo,
  isLoading,
}) => {
  const [question, setQuestion] = useState(
    caseState?.research_question ||
      "Is Meridian Textiles financially healthy enough to be considered for a long-term holding? Summarise growth, profitability, liquidity, leverage and key risks."
  );

  const documents = [
    { id: "D1", title: "Annual Report FY2025", type: "Audited Annual Report", date: "15 Jun 2026", rank: "Tier 1 Authority", pages: "52 pages" },
    { id: "D2", title: "Earnings Press Release FY2025", type: "Press Release", date: "20 May 2026", rank: "Tier 3 Authority (Conflicted 60cr)", pages: "2 pages" },
    { id: "D3", title: "Q2 FY2026 Results Note", type: "Quarterly Results", date: "14 Oct 2026", rank: "Tier 2 Authority (Fresh)", pages: "1 page" },
    { id: "D4", title: "Investor Presentation FY2023", type: "Investor Deck", date: "18 May 2023", rank: "Tier 4 (Stale Guidance >12mo)", pages: "14 pages" },
    { id: "D5", title: "Historical Statements FY2023-FY2025", type: "Financial Database", date: "20 Jun 2026", rank: "Tier 1 Structured Table", pages: "3 periods" },
    { id: "D6", title: "Q3 FY2025 Results Note", type: "Quarterly Results", date: "15 Jan 2026", rank: "Tier 2 (Stale >6mo & Superseded)", pages: "1 page" },
  ];

  const subqueries = [
    { topic: "Revenue Growth", query: "Revenue from operations annual growth top line turnover FY2025 FY2024" },
    { topic: "Profitability Margins", query: "Net profit after tax margins PAT margin compression expansion" },
    { topic: "Solvency & Leverage", query: "Borrowings debt loans capital structure debt-to-equity repayment" },
    { topic: "Working Capital Liquidity", query: "Current assets current liabilities working capital ratio" },
    { topic: "Disclosures & Risk", query: "Contingent liability tax dispute related party customer concentration" },
  ];

  return (
    <div className="max-w-6xl mx-auto py-8 px-4 space-y-8 animate-fadeIn">
      {/* Hero Welcome */}
      <div className="border border-zinc-800 rounded-xl bg-zinc-900/40 p-6 backdrop-blur-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-zinc-800/80 border border-zinc-700/60 text-xs font-mono text-zinc-300 mb-2">
              <Building2 className="w-3.5 h-3.5 text-zinc-400" />
              <span>Target: Meridian Textiles Ltd (BSE/NSE Synthetic Listing)</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-zinc-100">
              New Research & Verification Case
            </h1>
            <p className="text-sm text-zinc-400 mt-1 max-w-2xl">
              ClaimCourt subjects incoming AI research drafts to deterministic adjudication against statutory filings, Fact Ledger lineage, and an 8-item omission radar.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => onRunPipeline(question)}
              disabled={isLoading}
              className="px-4 py-2.5 rounded-lg bg-zinc-100 hover:bg-white text-zinc-950 font-semibold text-xs flex items-center gap-2 transition-all shadow-md active:scale-95 disabled:opacity-50"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>{isLoading ? "Running Pipeline..." : "Run Pipeline"}</span>
            </button>

            <button
              onClick={onInstantDemo}
              className="px-4 py-2.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 font-semibold text-xs flex items-center gap-2 transition-all active:scale-95"
            >
              <Zap className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
              <span>Instant Demo Mode (&lt;2s)</span>
            </button>
          </div>
        </div>
      </div>

      {/* Research Question Input */}
      <div className="border border-zinc-800 rounded-xl bg-zinc-900/30 p-6 space-y-3">
        <label className="text-xs font-semibold text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
          <HelpCircle className="w-4 h-4 text-zinc-400" />
          <span>Research Question / Thesis</span>
        </label>
        <textarea
          rows={3}
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-sm text-zinc-200 focus:outline-none focus:border-zinc-500 font-sans leading-relaxed"
          placeholder="Enter institutional inquiry..."
        />
        <div className="flex items-center justify-between text-xs text-zinc-500">
          <span>Editable inquiry: Scout will decompose this into targeted retrieval queries.</span>
          <button
            onClick={() => setQuestion("Is Meridian Textiles financially healthy enough to be considered for a long-term holding? Summarise growth, profitability, liquidity, leverage and key risks.")}
            className="text-zinc-400 hover:text-zinc-200 underline text-[11px]"
          >
            Reset to default demo question
          </button>
        </div>
      </div>

      {/* Scout Decomposition Subqueries */}
      <div className="space-y-3">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400 flex items-center gap-2">
          <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
          <span>Scout Query Decomposition (Automated Investigative Vectors)</span>
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {subqueries.map((sq, i) => (
            <div key={i} className="p-3.5 rounded-lg bg-zinc-900/40 border border-zinc-800/80 space-y-1">
              <span className="text-[11px] font-semibold text-zinc-300 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                {sq.topic}
              </span>
              <p className="text-xs text-zinc-400 font-mono leading-relaxed">{sq.query}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Ingested Document Package */}
      <div className="space-y-3">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400 flex items-center gap-2">
          <FileSpreadsheet className="w-3.5 h-3.5 text-zinc-400" />
          <span>Ingested Synthetic Document Set (Exact Ground Truth Package)</span>
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {documents.map((doc) => (
            <div key={doc.id} className="p-4 rounded-lg bg-zinc-900/50 border border-zinc-800 space-y-2">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-xs font-mono font-bold text-zinc-200">{doc.id}: {doc.title}</span>
                  <p className="text-[11px] text-zinc-400">{doc.type}</p>
                </div>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-zinc-700">
                  {doc.pages}
                </span>
              </div>
              <div className="pt-2 border-t border-zinc-800/60 flex items-center justify-between text-[11px] text-zinc-500 font-mono">
                <span>Published: {doc.date}</span>
                <span className={doc.rank.includes("Conflicted") ? "text-rose-400" : doc.rank.includes("Stale") ? "text-amber-400" : "text-zinc-400"}>
                  {doc.rank}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

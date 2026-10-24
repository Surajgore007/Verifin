import React, { useState } from "react";
import { CaseState } from "../types";
import { Network, Sparkles, Scale, ArrowRight, Zap, RefreshCw } from "lucide-react";

interface S4GraphProps {
  caseState: CaseState | null;
  onSwitchAuthority: (docId: string) => void;
}

export const S4Graph: React.FC<S4GraphProps> = ({ caseState, onSwitchAuthority }) => {
  const [pulse, setPulse] = useState(false);
  const currentAuthority = caseState?.authoritative_rev_doc || "D1";

  const metrics = caseState?.metrics || [];
  const growthMetric = metrics.find((m) => m.name === "revenue_growth_yoy")?.value ?? (currentAuthority === "D1" ? 12.0 : 18.0);
  const marginMetric = metrics.find((m) => m.name === "net_margin" && m.period === "FY2025")?.value ?? (currentAuthority === "D1" ? 6.43 : 6.10);
  const currentRatio = metrics.find((m) => m.name === "current_ratio" && m.period === "FY2025")?.value ?? 0.90;
  const debtToEquity = metrics.find((m) => m.name === "debt_to_equity" && m.period === "FY2025")?.value ?? 0.81;

  const handleToggle = (docId: string) => {
    setPulse(true);
    onSwitchAuthority(docId);
    setTimeout(() => setPulse(false), 800);
  };

  return (
    <div className="max-w-7xl mx-auto py-6 px-4 space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between p-5 rounded-xl bg-zinc-900/60 border border-zinc-800 gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Network className="w-5 h-5 text-zinc-100" />
            <h2 className="text-lg font-bold text-zinc-100">Deterministic Financial Dependency Graph</h2>
          </div>
          <p className="text-xs text-zinc-400 mt-1 max-w-2xl">
            Trace how raw filing facts flow into mathematical formulas, qualitative thresholds, downstream claims, and final report conclusions.
          </p>
        </div>

        {/* Live Authority Switcher */}
        <div className="flex items-center gap-3 bg-zinc-950 p-2 rounded-xl border border-zinc-800">
          <div className="text-right">
            <span className="text-[10px] uppercase font-mono text-zinc-400 block font-semibold">Authoritative Source</span>
            <span className="text-xs font-bold text-zinc-200">{currentAuthority === "D1" ? "D1: Annual Report" : "D2: Press Release"}</span>
          </div>
          <button
            onClick={() => handleToggle(currentAuthority === "D1" ? "D2" : "D1")}
            className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-100 border border-zinc-700 text-xs font-semibold flex items-center gap-1.5 transition-all active:scale-95 shadow-sm"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${pulse ? "animate-spin" : ""}`} />
            <span>Switch to {currentAuthority === "D1" ? "D2 (1,180 cr)" : "D1 (1,120 cr)"}</span>
          </button>
        </div>
      </div>

      {/* Graph Visualizer Canvas */}
      <div className="p-8 rounded-2xl bg-zinc-950 border border-zinc-800/80 dot-grid relative min-h-[480px] overflow-x-auto">
        
        {/* Tier Columns Header */}
        <div className="grid grid-cols-4 gap-6 mb-8 text-[11px] font-mono uppercase tracking-wider text-zinc-500 font-semibold border-b border-zinc-800 pb-3">
          <div>1. Fact Ledger (Filing Truth)</div>
          <div>2. Deterministic Quant Metrics</div>
          <div>3. Qualitative Thresholds</div>
          <div>4. Report Conclusion / Verdict</div>
        </div>

        {/* Directed Flow Rows */}
        <div className="space-y-8">
          
          {/* FLOW 1: REVENUE GROWTH & CONFLICT */}
          <div className="grid grid-cols-4 gap-6 items-center relative">
            {/* Fact Nodes */}
            <div className="space-y-2">
              <div
                onClick={() => handleToggle("D1")}
                className={`p-3 rounded-xl border text-xs cursor-pointer transition-all ${
                  currentAuthority === "D1"
                    ? "bg-zinc-900 border-emerald-500 text-zinc-100 ring-2 ring-emerald-500/20 shadow-lg"
                    : "bg-zinc-900/40 border-zinc-800 text-zinc-400 hover:border-zinc-700"
                }`}
              >
                <div className="flex justify-between items-center text-[10px] font-mono text-zinc-400 mb-0.5">
                  <span>D1: Annual Report p.32</span>
                  {currentAuthority === "D1" && <span className="text-emerald-400 font-bold">SELECTED</span>}
                </div>
                <div className="font-bold text-sm">Revenue FY25: 1,120 cr</div>
                <div className="text-[10px] text-zinc-500">Audited Statutory Statements</div>
              </div>

              <div
                onClick={() => handleToggle("D2")}
                className={`p-3 rounded-xl border text-xs cursor-pointer transition-all ${
                  currentAuthority === "D2"
                    ? "bg-zinc-900 border-rose-500 text-zinc-100 ring-2 ring-rose-500/20 shadow-lg"
                    : "bg-zinc-900/40 border-zinc-800 text-zinc-400 hover:border-zinc-700"
                }`}
              >
                <div className="flex justify-between items-center text-[10px] font-mono text-zinc-400 mb-0.5">
                  <span>D2: Press Release p.1</span>
                  {currentAuthority === "D2" && <span className="text-rose-400 font-bold">SELECTED</span>}
                </div>
                <div className="font-bold text-sm">Revenue FY25: 1,180 cr</div>
                <div className="text-[10px] text-zinc-500">Unaudited Media Release</div>
              </div>
            </div>

            {/* Quant Metric Node */}
            <div className={`p-4 rounded-xl bg-zinc-900 border transition-all ${
              pulse ? "ring-2 ring-amber-400 scale-105" : "border-zinc-800"
            }`}>
              <span className="text-[10px] font-mono text-zinc-400 uppercase block mb-1">
                Formula: ((Rev25 - Rev24) / Rev24) * 100
              </span>
              <div className="text-xl font-bold font-mono text-zinc-100 tabular-nums">
                {growthMetric.toFixed(1)}% YoY
              </div>
              <div className="text-[11px] text-zinc-400 mt-1">
                Net Margin: <strong className="text-zinc-200">{marginMetric.toFixed(2)}%</strong>
              </div>
            </div>

            {/* Rules Threshold Node */}
            <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800 space-y-1">
              <span className="text-[10px] font-mono text-zinc-400 uppercase block">rules.yaml boundary</span>
              <div className="text-sm font-semibold text-zinc-200">
                Strong: &gt; 15.0%
              </div>
              <div className="text-xs text-zinc-400">
                Moderate: 5.0% – 15.0%
              </div>
            </div>

            {/* Downstream Conclusion Node */}
            <div className={`p-4 rounded-xl border transition-all ${
              growthMetric > 15.0
                ? "bg-emerald-950/20 border-emerald-500/50 text-emerald-300"
                : "bg-amber-950/20 border-amber-500/50 text-amber-300"
            }`}>
              <span className="text-[10px] font-mono uppercase block mb-0.5">Adjudicated Verdict</span>
              <div className="text-base font-bold">
                {growthMetric > 15.0 ? "Strong Growth" : "Moderate Growth (12%)"}
              </div>
              <div className="text-[11px] text-zinc-400 mt-1">
                Claim C1: {currentAuthority === "D1" ? "Contradicted (12%)" : "Supported (18%)"}
              </div>
            </div>
          </div>

          {/* FLOW 2: LIQUIDITY CURRENT RATIO */}
          <div className="grid grid-cols-4 gap-6 items-center">
            {/* Fact Nodes */}
            <div className="p-3 rounded-xl bg-zinc-900/60 border border-zinc-800 text-xs">
              <div className="text-[10px] font-mono text-zinc-400 mb-0.5">D1: Balance Sheet p.35</div>
              <div className="font-bold text-sm">Assets: 540 cr</div>
              <div className="font-bold text-sm">Liabilities: 600 cr</div>
            </div>

            {/* Quant Metric Node */}
            <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800">
              <span className="text-[10px] font-mono text-zinc-400 uppercase block mb-1">
                Formula: Assets / Liabilities
              </span>
              <div className="text-xl font-bold font-mono text-zinc-100 tabular-nums">
                CR = {currentRatio.toFixed(2)}
              </div>
            </div>

            {/* Rules Threshold Node */}
            <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800 space-y-1">
              <span className="text-[10px] font-mono text-zinc-400 uppercase block">rules.yaml boundary</span>
              <div className="text-sm font-semibold text-zinc-200">
                Strong: &ge; 1.20
              </div>
              <div className="text-xs text-rose-400">
                Fails threshold (&lt; 1.0)
              </div>
            </div>

            {/* Downstream Conclusion Node */}
            <div className="p-4 rounded-xl bg-rose-950/20 border border-rose-500/50 text-rose-300">
              <span className="text-[10px] font-mono uppercase block mb-0.5">Claim C4 Verdict</span>
              <div className="text-base font-bold">Contradicted</div>
              <div className="text-[11px] text-zinc-400 mt-1">
                "Liquidity is strong" refuted by 0.90 ratio
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Materiality Plain-Language Impact Panel */}
      <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800 flex items-start gap-3">
        <Sparkles className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
        <div className="text-xs space-y-1">
          <span className="font-bold text-zinc-200 uppercase tracking-wide">
            Live Dependency Lineage Insight
          </span>
          <p className="text-zinc-400 leading-relaxed">
            Resolving the 60 cr revenue conflict in favor of <strong>Audited Annual Report D1 (1,120 cr)</strong> reduces calculated growth from 18.0% to <strong>12.0%</strong>, recalculates net margin from 6.10% to <strong>6.43%</strong>, and flips the qualitative growth conclusion from <em>Strong</em> to <em>Moderate</em> across the graph, claims list, and final report.
          </p>
        </div>
      </div>
    </div>
  );
};

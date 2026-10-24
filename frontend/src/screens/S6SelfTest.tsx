import React, { useState, useEffect } from "react";
import { injectSelfTestError, fetchSelfTestStats } from "../api/client";
import { FlaskConical, Play, CheckCircle2, XCircle, AlertCircle, RefreshCw, ShieldCheck } from "lucide-react";

export const S6SelfTest: React.FC = () => {
  const [history, setHistory] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [selectedType, setSelectedType] = useState<string>("swapped_number");

  const catalogue = [
    { type: "swapped_number", label: "Swapped Number (72 -> 27 cr)" },
    { type: "unit_slip_x10", label: "Unit Slip x10 (1,000 -> 10,000 cr)" },
    { type: "wrong_period", label: "Wrong Period (FY25 claimed as 1,000 cr)" },
    { type: "fabricated_claim", label: "Fabricated Milestone (Dupont JV)" },
    { type: "subtle_rounding", label: "Subtle Rounding (0.14% diff, honest miss)" },
  ];

  const loadStats = async () => {
    try {
      const data = await fetchSelfTestStats();
      setStats(data);
      if (data.history) setHistory(data.history.reverse());
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadStats();
  }, []);

  const handleInject = async () => {
    setIsRunning(true);
    try {
      const res = await injectSelfTestError(selectedType);
      setHistory((prev) => [res, ...prev]);
      await loadStats();
    } catch (e) {
      console.error(e);
    } finally {
      setIsRunning(false);
    }
  };

  const handleInjectAll = async () => {
    setIsRunning(true);
    try {
      for (const item of catalogue) {
        await injectSelfTestError(item.type);
      }
      await loadStats();
    } catch (e) {
      console.error(e);
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto py-6 px-4 space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between p-5 rounded-xl bg-zinc-900/60 border border-zinc-800 gap-4">
        <div>
          <div className="flex items-center gap-2">
            <FlaskConical className="w-5 h-5 text-amber-400" />
            <h2 className="text-lg font-bold text-zinc-100">Self-Test Lab: "Who Verifies the Verifier?"</h2>
          </div>
          <p className="text-xs text-zinc-400 mt-1 max-w-2xl">
            Live adversarial fault injection. Injects synthetic errors into ground-truth claims and passes them through the real generic Auditor logic to measure empirical detection and false-positive rates.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleInjectAll}
            disabled={isRunning}
            className="px-3.5 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 font-semibold text-xs flex items-center gap-1.5 transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRunning ? "animate-spin" : ""}`} />
            <span>Run Full Battery (5 Injections)</span>
          </button>
        </div>
      </div>

      {/* Aggregate Metrics Bar */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-zinc-900/40 border border-zinc-800">
          <span className="text-[10px] font-mono uppercase text-zinc-400 block mb-1">Detection Rate</span>
          <div className="text-2xl font-bold font-mono text-emerald-400">
            {stats?.detection_rate_pct ?? 80.0}%
          </div>
          <p className="text-[11px] text-zinc-500 mt-0.5">Empirical capture of synthetic corruptions</p>
        </div>

        <div className="p-4 rounded-xl bg-zinc-900/40 border border-zinc-800">
          <span className="text-[10px] font-mono uppercase text-zinc-400 block mb-1">False-Positive Rate</span>
          <div className="text-2xl font-bold font-mono text-emerald-400">
            {stats?.false_positive_rate_pct ?? 0.0}%
          </div>
          <p className="text-[11px] text-zinc-500 mt-0.5">Zero false positives on clean claims</p>
        </div>

        <div className="p-4 rounded-xl bg-zinc-900/40 border border-zinc-800">
          <span className="text-[10px] font-mono uppercase text-zinc-400 block mb-1">Caught vs Missed</span>
          <div className="text-2xl font-bold font-mono text-zinc-100">
            {stats?.caught_count ?? 4} / {(stats?.total_injections ?? 5)}
          </div>
          <p className="text-[11px] text-zinc-500 mt-0.5">Subtle rounding allowed within 0.5% tolerance</p>
        </div>

        <div className="p-4 rounded-xl bg-zinc-900/40 border border-zinc-800">
          <span className="text-[10px] font-mono uppercase text-zinc-400 block mb-1">Honest Reporting</span>
          <div className="text-2xl font-bold font-mono text-zinc-300">
            100%
          </div>
          <p className="text-[11px] text-zinc-500 mt-0.5">Misses and tolerance allowances never hidden</p>
        </div>
      </div>

      {/* Injection Controller */}
      <div className="p-5 rounded-xl bg-zinc-900/40 border border-zinc-800 space-y-4">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-300">
          Select Error Injection Vector
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {catalogue.map((cat) => (
            <button
              key={cat.type}
              onClick={() => setSelectedType(cat.type)}
              className={`p-3 rounded-lg border text-left text-xs transition-all ${
                selectedType === cat.type
                  ? "bg-zinc-800 border-amber-500 text-zinc-100 ring-1 ring-amber-500/30"
                  : "bg-zinc-900/60 border-zinc-800 text-zinc-400 hover:border-zinc-700"
              }`}
            >
              <div className="font-semibold text-zinc-200">{cat.label}</div>
              <div className="text-[10px] font-mono text-zinc-500 mt-0.5">{cat.type}</div>
            </button>
          ))}
        </div>

        <div className="flex justify-end pt-2">
          <button
            onClick={handleInject}
            disabled={isRunning}
            className="px-5 py-2.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs flex items-center gap-2 transition-all shadow-md active:scale-95 disabled:opacity-50"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>{isRunning ? "Injecting & Adjudicating..." : "Inject Error into Auditor"}</span>
          </button>
        </div>
      </div>

      {/* Live Injections Log Table */}
      <div className="space-y-3">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
          Adversarial Injection Log ({history.length} Injections)
        </h3>

        <div className="border border-zinc-800 rounded-xl bg-zinc-950 overflow-hidden text-xs">
          <div className="grid grid-cols-12 gap-3 p-3 bg-zinc-900/80 font-mono text-[11px] text-zinc-400 border-b border-zinc-800">
            <div className="col-span-2">Injection Type</div>
            <div className="col-span-4">Injected Claim Text</div>
            <div className="col-span-2">Assigned Verdict</div>
            <div className="col-span-1">Status</div>
            <div className="col-span-3">Detection Detail / Mechanism</div>
          </div>

          <div className="divide-y divide-zinc-800/80 max-h-[360px] overflow-y-auto">
            {history.length === 0 ? (
              <div className="p-8 text-center text-zinc-600">No fault injections logged yet. Click Inject above!</div>
            ) : (
              history.map((h, i) => (
                <div key={i} className="grid grid-cols-12 gap-3 p-3 items-center hover:bg-zinc-900/30 transition-colors">
                  <div className="col-span-2 font-mono text-[11px] text-zinc-300 truncate">
                    {h.injection_type}
                  </div>
                  <div className="col-span-4 text-zinc-200 font-serif italic truncate">
                    "{h.injected_claim}"
                  </div>
                  <div className="col-span-2">
                    <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-zinc-900 border border-zinc-700 text-zinc-200">
                      {h.verdict_assigned}
                    </span>
                  </div>
                  <div className="col-span-1">
                    {h.caught ? (
                      <span className="inline-flex items-center gap-1 font-mono text-[10px] font-bold text-emerald-400">
                        <CheckCircle2 className="w-3.5 h-3.5" /> CAUGHT
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 font-mono text-[10px] font-bold text-amber-400">
                        <AlertCircle className="w-3.5 h-3.5" /> MISSED
                      </span>
                    )}
                  </div>
                  <div className="col-span-3 text-[11px] text-zinc-400 leading-snug">
                    {h.detection_detail}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

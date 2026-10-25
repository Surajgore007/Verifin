import React, { useState } from "react";
import { ConfidenceRing } from "../ui/ConfidenceRing";
import {
  Download,
  FileSpreadsheet,
  FileText,
  FileCode,
  ShieldAlert,
  Zap,
  History,
  Clock,
  Cpu,
} from "lucide-react";

interface RunProvenance {
  run_id: string | null;
  timestamp: string | null;
  model: string | null;
  is_live: boolean;
  is_replay: boolean;
  duration_ms?: number;
}

interface TopBannerProps {
  confidence?: any;
  activeCompany: string;
  onExport: (format: "xlsx" | "docx" | "md") => void;
  onOpenReview: () => void;
  summaryStats?: {
    total_statements: number;
    verified_count: number;
    attention_count: number;
    conflicts_count: number;
    omissions_count: number;
  };
  runProvenance?: RunProvenance;
}

export const TopBanner: React.FC<TopBannerProps> = ({
  confidence,
  activeCompany,
  onExport,
  onOpenReview,
  summaryStats,
  runProvenance,
}) => {
  const [showExportMenu, setShowExportMenu] = useState(false);

  const hasRun = !!runProvenance?.run_id;
  const isReplay = runProvenance?.is_replay;
  const isLive = runProvenance?.is_live && !isReplay;

  return (
    <header className="sticky top-0 z-20 bg-white border-b border-slate-200">
      {/* Regulatory + Provenance Bar */}
      <div className="bg-slate-50 border-b border-slate-200/80 px-6 py-1 text-[11px] flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-1.5 font-medium text-slate-600">
          <ShieldAlert className="w-3.5 h-3.5 text-amber-500 shrink-0" />
          <span>Decision support only, not investment advice.</span>
        </div>

        {/* Provenance strip — always visible once a run exists */}
        {hasRun ? (
          <div className="flex items-center gap-3 font-mono text-[10px]">
            {/* Live vs Replay badge */}
            {isReplay ? (
              <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 border border-amber-300 text-amber-800 font-bold">
                <History className="w-2.5 h-2.5" />
                REPLAY
              </span>
            ) : (
              <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 border border-emerald-300 text-emerald-800 font-bold">
                <Zap className="w-2.5 h-2.5" />
                LIVE
              </span>
            )}

            {/* Run ID */}
            <span className="text-slate-500">
              Run <span className="text-slate-800 font-semibold">{runProvenance.run_id}</span>
            </span>

            {/* Timestamp */}
            {runProvenance.timestamp && (
              <span className="flex items-center gap-1 text-slate-500">
                <Clock className="w-2.5 h-2.5" />
                {new Date(runProvenance.timestamp).toLocaleTimeString()}
              </span>
            )}

            {/* Model */}
            {runProvenance.model && (
              <span className="flex items-center gap-1 text-slate-500">
                <Cpu className="w-2.5 h-2.5" />
                {runProvenance.model}
              </span>
            )}

            {/* Duration */}
            {runProvenance.duration_ms && (
              <span className="text-slate-400">{(runProvenance.duration_ms / 1000).toFixed(1)}s</span>
            )}
          </div>
        ) : (
          <div className="text-[10px] text-slate-400 font-mono italic">
            No run yet — submit a question to start
          </div>
        )}
      </div>

      {/* Main Bar */}
      <div className="px-6 py-2.5 flex items-center justify-between gap-4">
        {/* Left: Summary Pill */}
        <div className="flex items-center gap-3">
          {activeCompany && (summaryStats?.total_statements ?? 0) > 0 ? (
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm text-slate-900">{activeCompany}</span>
              <span className="text-xs text-slate-400">|</span>
              <span className="text-xs text-slate-600 font-medium">
                {summaryStats?.total_statements ?? 0} statements:
              </span>
              <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                {summaryStats?.verified_count ?? 0} verified
              </span>
              {(summaryStats?.attention_count ?? 0) > 0 && (
                <span className="text-xs font-semibold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
                  {summaryStats?.attention_count} flagged
                </span>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
              <span className="w-2 h-2 rounded-full bg-slate-300"></span>
              <span>Awaiting research — Enter a prompt or select a template to begin</span>
            </div>
          )}

          {activeCompany && (summaryStats?.total_statements ?? 0) > 0 && (summaryStats?.attention_count ?? 0) > 0 && (
            <button
              onClick={onOpenReview}
              className="ml-2 px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium rounded-lg shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              Review flagged items
            </button>
          )}
        </div>

        {/* Right: Confidence Ring and Export */}
        <div className="flex items-center gap-3">
          <ConfidenceRing confidence={confidence} />

          <div className="relative">
            <button
              onClick={() => setShowExportMenu(!showExportMenu)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50 text-xs font-medium text-slate-700 transition-colors shadow-xs cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              <span>Export</span>
            </button>

            {showExportMenu && (
              <div
                className="absolute right-0 top-full mt-1.5 w-48 bg-white border border-slate-200 rounded-xl shadow-lg z-50 py-1.5 text-xs"
                onMouseLeave={() => setShowExportMenu(false)}
              >
                <div className="px-3 py-1 text-[10px] uppercase font-semibold text-slate-400 tracking-wider">
                  Download Formats
                </div>
                <button
                  onClick={() => { onExport("xlsx"); setShowExportMenu(false); }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                  <div className="text-left">
                    <div className="font-medium">Excel (.xlsx)</div>
                    <div className="text-[10px] text-slate-400">Live formulas & ratio tie-out</div>
                  </div>
                </button>
                <button
                  onClick={() => { onExport("docx"); setShowExportMenu(false); }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  <FileText className="w-4 h-4 text-blue-600" />
                  <div className="text-left">
                    <div className="font-medium">Word Memo (.docx)</div>
                    <div className="text-[10px] text-slate-400">Executive research report</div>
                  </div>
                </button>
                <button
                  onClick={() => { onExport("md"); setShowExportMenu(false); }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  <FileCode className="w-4 h-4 text-indigo-600" />
                  <div className="text-left">
                    <div className="font-medium">Markdown (.md)</div>
                    <div className="text-[10px] text-slate-400">Clean GitHub-style table</div>
                  </div>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

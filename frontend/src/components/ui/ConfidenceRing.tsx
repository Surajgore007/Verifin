import React, { useState } from "react";
import { Info } from "lucide-react";

interface EvidenceConfidence {
  score: number;
  base_pct: number;
  band_label: string;
  band_color: string;
  penalties?: {
    conflicts: number;
    omissions: number;
    stale: number;
    total: number;
  };
  formula_definition?: string;
  explanation?: string;
}

interface ConfidenceRingProps {
  confidence?: EvidenceConfidence;
}

export const ConfidenceRing: React.FC<ConfidenceRingProps> = ({ confidence }) => {
  const [showTooltip, setShowTooltip] = useState(false);

  const score = confidence?.score ?? 0;
  const bandLabel = confidence?.band_label ?? (score < 20 ? "Low, do not rely" : score >= 80 ? "High Confidence" : "Moderate");
  
  // Palette for light theme
  const getColors = () => {
    if (score < 20) return { stroke: "#DC2626", text: "#DC2626", bg: "bg-rose-50" };
    if (score < 60) return { stroke: "#D97706", text: "#D97706", bg: "bg-amber-50" };
    return { stroke: "#059669", text: "#059669", bg: "bg-emerald-50" };
  };
  const colors = getColors();

  const radius = 18;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  return (
    <div
      className="relative flex items-center gap-2.5 px-3 py-1.5 rounded-lg bg-white border border-slate-200 shadow-xs cursor-pointer select-none hover:border-slate-300 transition-colors"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <div className="relative w-10 h-10 flex items-center justify-center">
        <svg className="w-10 h-10 transform -rotate-90">
          <circle
            cx="20"
            cy="20"
            r={radius}
            stroke="#E2E8F0"
            strokeWidth="3"
            fill="transparent"
          />
          <circle
            cx="20"
            cy="20"
            r={radius}
            stroke={colors.stroke}
            strokeWidth="3"
            fill="transparent"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            className="transition-all duration-700 ease-out"
          />
        </svg>
        <span className="absolute text-[11px] font-semibold tabular-nums text-slate-800">
          {score.toFixed(0)}%
        </span>
      </div>

      <div className="flex flex-col text-left">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Evidence Trust</span>
        <span className="text-xs font-semibold leading-tight" style={{ color: colors.text }}>
          {bandLabel}
        </span>
      </div>

      {showTooltip && (
        <div className="absolute right-0 top-full mt-2 w-72 p-3 bg-white border border-slate-200 rounded-xl shadow-lg z-50 text-left text-xs animate-in fade-in slide-in-from-top-1 duration-150">
          <div className="flex items-center gap-1.5 font-semibold text-slate-900 border-b border-slate-100 pb-2 mb-2">
            <Info className="w-3.5 h-3.5 text-indigo-600" />
            <span>Evidence Confidence Formula</span>
          </div>
          <p className="text-slate-600 font-mono text-[11px] bg-slate-50 p-1.5 rounded border border-slate-100 mb-2">
            Score = max(0, Base% - Penalties)
          </p>
          <div className="space-y-1.5 text-[11px]">
            <div className="flex justify-between text-slate-600">
              <span>Base Supported Claims:</span>
              <span className="font-semibold text-slate-900 tabular-nums">+{confidence?.base_pct ?? 0}%</span>
            </div>
            {confidence?.penalties && (
              <>
                <div className="flex justify-between text-rose-600">
                  <span>Conflict Penalty (-15/ea):</span>
                  <span className="font-semibold tabular-nums">-{confidence.penalties.conflicts}%</span>
                </div>
                <div className="flex justify-between text-rose-600">
                  <span>Omission Penalty (-10/ea):</span>
                  <span className="font-semibold tabular-nums">-{confidence.penalties.omissions}%</span>
                </div>
                <div className="flex justify-between text-amber-600">
                  <span>Stale Source Penalty (-5/ea):</span>
                  <span className="font-semibold tabular-nums">-{confidence.penalties.stale}%</span>
                </div>
              </>
            )}
            <div className="border-t border-slate-100 pt-1.5 flex justify-between font-semibold text-slate-900">
              <span>Final Verified Score:</span>
              <span className="tabular-nums" style={{ color: colors.text }}>{score.toFixed(1)}%</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

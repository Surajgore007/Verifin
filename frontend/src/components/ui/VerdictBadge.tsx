import React from "react";
import { CheckCircle2, XCircle, AlertTriangle, Clock, HelpCircle } from "lucide-react";

interface VerdictBadgeProps {
  verdict: string;
  className?: string;
  size?: "sm" | "md" | "lg";
}

export const VerdictBadge: React.FC<VerdictBadgeProps> = ({ verdict, className = "", size = "md" }) => {
  const getBadgeConfig = () => {
    const v = (verdict || "").toLowerCase();
    if (v.includes("verif") || v.includes("support")) {
      return {
        icon: CheckCircle2,
        bg: "bg-emerald-50 text-emerald-700 border-emerald-200",
        dot: "bg-emerald-600",
        label: "Verified"
      };
    } else if (v.includes("conflict") || v.includes("contradict")) {
      return {
        icon: XCircle,
        bg: "bg-rose-50 text-rose-700 border-rose-200",
        dot: "bg-rose-600",
        label: "Conflicts with source"
      };
    } else if (v.includes("unsupport") || v.includes("not support")) {
      return {
        icon: AlertTriangle,
        bg: "bg-amber-50 text-amber-800 border-amber-200",
        dot: "bg-amber-600",
        label: "Not supported"
      };
    } else if (v.includes("stale") || v.includes("outdated")) {
      return {
        icon: Clock,
        bg: "bg-slate-100 text-slate-700 border-slate-200",
        dot: "bg-slate-500",
        label: "Outdated"
      };
    } else {
      return {
        icon: HelpCircle,
        bg: "bg-purple-50 text-purple-700 border-purple-200",
        dot: "bg-purple-600",
        label: "Needs review"
      };
    }
  };

  const config = getBadgeConfig();
  const Icon = config.icon;

  const sizeClasses = {
    sm: "px-2 py-0.5 text-xs gap-1 font-medium",
    md: "px-2.5 py-0.5 text-xs gap-1.5 font-medium",
    lg: "px-3 py-1 text-sm gap-2 font-medium"
  };

  return (
    <span
      className={`inline-flex items-center rounded-full border shadow-xs transition-colors ${config.bg} ${sizeClasses[size]} ${className}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
      <span>{config.label}</span>
    </span>
  );
};

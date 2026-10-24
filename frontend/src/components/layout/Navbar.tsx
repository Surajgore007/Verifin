import React from "react";
import { ConfidenceRing } from "../ui/ConfidenceRing";
import { CaseState } from "../../types";
import { 
  Scale, 
  Workflow, 
  CheckSquare2, 
  Network, 
  Radar, 
  FlaskConical, 
  FileText,
  Sparkles,
  Command
} from "lucide-react";

interface NavbarProps {
  activeScreen: string;
  setActiveScreen: (s: string) => void;
  caseState: CaseState | null;
  onDraftToggle: (draftId: string) => void;
  onRefresh: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeScreen,
  setActiveScreen,
  caseState,
  onDraftToggle,
}) => {
  const screens = [
    { id: "S1", label: "New Case", icon: Scale },
    { id: "S2", label: "Pipeline", icon: Workflow },
    { id: "S3", label: "Review Workspace", icon: CheckSquare2 },
    { id: "S4", label: "Dependency Graph", icon: Network },
    { id: "S5", label: "Omission Radar", icon: Radar },
    { id: "S6", label: "Self-Test Lab", icon: FlaskConical },
    { id: "S7", label: "Final Report", icon: FileText },
  ];

  const verdicts = caseState?.verdicts || [];
  const supportedCount = verdicts.filter((v) => v.verdict === "Supported").length;
  const contradictedCount = verdicts.filter((v) => v.verdict === "Contradicted").length;
  const unsupportedCount = verdicts.filter((v) => v.verdict === "Unsupported").length;
  const staleCount = verdicts.filter((v) => v.verdict === "Stale").length;

  const activeDraft = caseState?.active_draft || "draft_a";

  return (
    <header className="sticky top-0 z-40 bg-zinc-950/90 backdrop-blur-md border-b border-zinc-800">
      {/* Permanent Responsible AI Banner */}
      <div className="bg-zinc-900/90 border-b border-zinc-800/80 px-4 py-1 text-center text-[11px] text-zinc-400 flex items-center justify-between">
        <span className="font-mono text-zinc-500">INNOVISE 2026 // AI/ML Track Round 2</span>
        <span className="font-medium text-zinc-300">
          ⚠️ Decision support only, not investment advice. Meridian Textiles Ltd is synthetic demonstration data.
        </span>
        <span className="font-mono text-zinc-500">Tagline: AI proposes. Evidence decides. Humans approve.</span>
      </div>

      {/* Main Header Bar */}
      <div className="max-w-7xl mx-auto px-4 py-2.5 flex items-center justify-between gap-4">
        {/* Brand & Case Identification */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-zinc-900 border border-zinc-700/80 flex items-center justify-center text-zinc-100 shadow-inner">
            <Scale className="w-5 h-5 text-zinc-100" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold tracking-tight text-base text-zinc-100">ClaimCourt</span>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-zinc-800 text-zinc-400 border border-zinc-700">
                v1.0 MVP
              </span>
            </div>
            <div className="text-xs text-zinc-400 flex items-center gap-1.5">
              <span className="font-medium text-zinc-300">Meridian Textiles Ltd</span>
              <span className="text-zinc-600">•</span>
              <span className="font-mono text-[11px] text-zinc-400">INR crore // As of 24 Oct 2026</span>
            </div>
          </div>
        </div>

        {/* Draft Mode Toggle */}
        <div className="flex items-center bg-zinc-900/80 border border-zinc-800 p-0.5 rounded-lg text-xs">
          <button
            onClick={() => onDraftToggle("draft_a")}
            className={`px-3 py-1 rounded-md font-medium transition-all ${
              activeDraft === "draft_a"
                ? "bg-zinc-800 text-zinc-100 shadow-sm border border-zinc-700/50"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            Controlled Test Draft
          </button>
          <button
            onClick={() => onDraftToggle("draft_b")}
            className={`px-3 py-1 rounded-md font-medium transition-all flex items-center gap-1.5 ${
              activeDraft === "draft_b"
                ? "bg-zinc-800 text-emerald-400 shadow-sm border border-emerald-500/30"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
            Live AI Draft
          </button>
        </div>

        {/* Verdict Count Pills */}
        <div className="hidden lg:flex items-center gap-1.5 text-xs font-mono">
          <div className="px-2.5 py-1 rounded-md bg-emerald-950/30 border border-emerald-500/30 text-emerald-400 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
            <span>{supportedCount} Supported</span>
          </div>
          <div className="px-2.5 py-1 rounded-md bg-rose-950/30 border border-rose-500/30 text-rose-400 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-400"></span>
            <span>{contradictedCount} Contradicted</span>
          </div>
          <div className="px-2.5 py-1 rounded-md bg-amber-950/30 border border-amber-500/30 text-amber-400 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
            <span>{unsupportedCount} Unsupported</span>
          </div>
          <div className="px-2.5 py-1 rounded-md bg-slate-900/60 border border-slate-700 text-slate-300 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
            <span>{staleCount} Stale</span>
          </div>
        </div>

        {/* Evidence Confidence Ring */}
        <ConfidenceRing confidence={caseState?.evidence_confidence} />
      </div>

      {/* Screen Navigation Tabs */}
      <div className="max-w-7xl mx-auto px-4 flex items-center justify-between border-t border-zinc-800/80">
        <nav className="flex space-x-1 py-1.5 overflow-x-auto scrollbar-none">
          {screens.map((s) => {
            const Icon = s.icon;
            const isActive = activeScreen === s.id;
            return (
              <button
                key={s.id}
                onClick={() => setActiveScreen(s.id)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium flex items-center gap-2 transition-colors whitespace-nowrap ${
                  isActive
                    ? "bg-zinc-800 text-zinc-100 border border-zinc-700/60 shadow-sm"
                    : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/60"
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? "text-zinc-100" : "text-zinc-400"}`} />
                <span>{s.id}: {s.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="hidden md:flex items-center gap-2 text-[11px] text-zinc-500 font-mono">
          <span className="px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-800 flex items-center gap-1">
            <Command className="w-3 h-3" /> 1-7: Switch Screen
          </span>
          <span className="px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-800">
            J/K: Flags
          </span>
        </div>
      </div>
    </header>
  );
};

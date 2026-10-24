import React, { useState } from "react";
import { CaseState, BusMessage } from "../types";
import { 
  Bot, 
  Cpu, 
  Terminal, 
  CheckCircle2, 
  ArrowRight, 
  Radio, 
  ChevronRight, 
  Filter,
  Flame,
  ShieldCheck,
  Search
} from "lucide-react";

interface S2PipelineProps {
  caseState: CaseState | null;
  busMessages: BusMessage[];
  onNavigateToReview: () => void;
}

export const S2Pipeline: React.FC<S2PipelineProps> = ({
  caseState,
  busMessages,
  onNavigateToReview,
}) => {
  const [selectedMessage, setSelectedMessage] = useState<BusMessage | null>(null);
  const [filterType, setFilterType] = useState<string>("ALL");

  const agents = [
    { name: "Scout", role: "Hybrid BM25 Retrieval & Query Decomposition", type: "Hybrid Code", isLLM: false, icon: Search },
    { name: "Quant", role: "Deterministic Arithmetic & Fact Lineage", type: "Deterministic Code", isLLM: false, icon: Cpu },
    { name: "Scribe", role: "Financial Draft Writer", type: "LLM-driven (Groq)", isLLM: true, icon: Bot },
    { name: "Extractor", role: "Schema-Constrained Claim Decomposition", type: "LLM-driven", isLLM: true, icon: Bot },
    { name: "Auditor", role: "Claim-Level Adjudication & Anti-Hallucination Guard", type: "Core Deterministic Verifier", isLLM: false, icon: ShieldCheck },
    { name: "Sentinel", role: "Omission Radar (8-Item Disclosure Scanner)", type: "Filing Scanner", isLLM: false, icon: Radio },
    { name: "Devil", role: "Red-Team Bear Case Debate Agent", type: "LLM-driven Adversary", isLLM: true, icon: Flame },
    { name: "Warden", role: "Evidence Confidence & Risk Register", type: "Deterministic Formula", isLLM: false, icon: Cpu },
    { name: "Editor", role: "Consolidated Report Composer", type: "Deterministic Assembly", isLLM: false, icon: Terminal },
  ];

  const filteredMessages = busMessages.filter((m) => {
    if (filterType === "ALL") return true;
    if (filterType === "LLM") return m.is_llm;
    if (filterType === "CODE") return !m.is_llm;
    return m.message_type === filterType;
  });

  return (
    <div className="max-w-7xl mx-auto py-6 px-4 space-y-6">
      {/* Top Status Banner */}
      <div className="flex items-center justify-between p-4 rounded-xl bg-zinc-900/60 border border-zinc-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
            <h2 className="text-base font-bold text-zinc-100">Multi-Agent Execution Timeline</h2>
          </div>
          <p className="text-xs text-zinc-400 mt-0.5">
            Real-time typed message bus streaming inter-agent communication, evidence requests, and debate challenges.
          </p>
        </div>

        <button
          onClick={onNavigateToReview}
          className="px-4 py-2 rounded-lg bg-zinc-100 hover:bg-white text-zinc-950 font-semibold text-xs flex items-center gap-1.5 transition-all shadow-md active:scale-95"
        >
          <span>Open Review Workspace</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Vertical Agent Architecture Timeline (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
              Pipeline Stage Architecture
            </h3>
            <span className="text-[11px] font-mono text-zinc-500">9 Active Modules</span>
          </div>

          <div className="space-y-2.5">
            {agents.map((ag, i) => {
              const Icon = ag.icon;
              return (
                <div
                  key={ag.name}
                  className="p-3 rounded-lg bg-zinc-900/40 border border-zinc-800/80 hover:border-zinc-700 transition-all flex items-start gap-3"
                >
                  <div className="w-7 h-7 rounded-md bg-zinc-800 border border-zinc-700 flex items-center justify-center text-zinc-200 mt-0.5 shrink-0">
                    <Icon className="w-3.5 h-3.5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold text-zinc-100">{ag.name}</span>
                      <span
                        className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${
                          ag.isLLM
                            ? "bg-purple-950/40 border-purple-500/30 text-purple-300"
                            : "bg-emerald-950/40 border-emerald-500/30 text-emerald-300"
                        }`}
                      >
                        {ag.type}
                      </span>
                    </div>
                    <p className="text-[11px] text-zinc-400 truncate mt-0.5">{ag.role}</p>
                  </div>
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-1" />
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Live Message Bus Feed (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
              <Terminal className="w-3.5 h-3.5 text-zinc-400" />
              <span>Typed Message Bus Log ({filteredMessages.length})</span>
            </h3>

            {/* Filter Pills */}
            <div className="flex items-center gap-1 text-[11px]">
              {["ALL", "EVIDENCE", "VERDICT", "CHALLENGE", "LLM", "CODE"].map((f) => (
                <button
                  key={f}
                  onClick={() => setFilterType(f)}
                  className={`px-2 py-0.5 rounded text-[10px] font-mono transition-colors ${
                    filterType === f
                      ? "bg-zinc-700 text-zinc-100"
                      : "bg-zinc-900 text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          <div className="h-[520px] overflow-y-auto space-y-2 p-3 bg-zinc-950 rounded-xl border border-zinc-800 font-mono text-xs">
            {filteredMessages.length === 0 ? (
              <div className="h-full flex items-center justify-center text-zinc-600">
                Waiting for pipeline bus events...
              </div>
            ) : (
              filteredMessages.map((msg) => (
                <div
                  key={msg.id}
                  onClick={() => setSelectedMessage(msg)}
                  className="p-2.5 rounded-lg bg-zinc-900/60 hover:bg-zinc-900 border border-zinc-800/80 hover:border-zinc-700 cursor-pointer transition-all space-y-1.5"
                >
                  <div className="flex items-center justify-between text-[11px] text-zinc-500">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-zinc-300">{msg.sender}</span>
                      <span>→</span>
                      <span className="text-zinc-400">{msg.recipient}</span>
                      <span
                        className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${
                          msg.message_type === "VERDICT"
                            ? "bg-emerald-950 text-emerald-400 border border-emerald-800"
                            : msg.message_type === "CHALLENGE"
                            ? "bg-rose-950 text-rose-400 border border-rose-800"
                            : "bg-zinc-800 text-zinc-400"
                        }`}
                      >
                        {msg.message_type}
                      </span>
                    </div>
                    <span className="text-[10px] text-zinc-600 tabular-nums">
                      {msg.timestamp.split("T")[1]?.slice(0, 8)}
                    </span>
                  </div>

                  <p className="text-zinc-300 font-sans text-xs leading-relaxed">{msg.summary}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Message Inspection Modal */}
      {selectedMessage && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 border border-zinc-700 rounded-xl max-w-lg w-full p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
              <span className="font-bold text-sm text-zinc-100">
                Bus Message: {selectedMessage.id}
              </span>
              <button
                onClick={() => setSelectedMessage(null)}
                className="text-zinc-400 hover:text-zinc-200 text-xs px-2 py-1 rounded bg-zinc-800"
              >
                Close
              </button>
            </div>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between text-zinc-400">
                <span>Sender / Recipient:</span>
                <span className="font-mono text-zinc-200">{selectedMessage.sender} → {selectedMessage.recipient}</span>
              </div>
              <div className="flex justify-between text-zinc-400">
                <span>Type:</span>
                <span className="font-mono text-zinc-200">{selectedMessage.message_type}</span>
              </div>
              <div>
                <span className="text-zinc-400 block mb-1">Payload JSON:</span>
                <pre className="p-3 rounded bg-zinc-950 border border-zinc-800 overflow-x-auto text-[11px] text-zinc-300 font-mono">
                  {JSON.stringify(selectedMessage.payload, null, 2)}
                </pre>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

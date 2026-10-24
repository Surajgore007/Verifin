import React, { useState } from "react";
import { X, ChevronDown, ChevronRight, Activity, Cpu, Bot, CheckCircle2 } from "lucide-react";

interface ActivityMessage {
  id?: string;
  sender: string;
  recipient: string;
  message_type: string;
  summary: string;
  payload?: any;
  timestamp?: string;
  is_llm?: boolean | number;
}

interface ActivityDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  messages: ActivityMessage[];
}

export const ActivityDrawer: React.FC<ActivityDrawerProps> = ({
  isOpen,
  onClose,
  messages
}) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/30 backdrop-blur-xs">
      <div className="w-full max-w-md bg-white h-full shadow-2xl border-l border-slate-200 flex flex-col animate-in slide-in-from-right duration-200">
        {/* Header */}
        <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-indigo-600" />
            <h3 className="text-sm font-bold text-slate-900">Multi-Agent Activity Drawer</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-400 hover:text-slate-600"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Message Step List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages.length === 0 ? (
            <div className="text-center text-slate-400 py-12 text-xs">
              No bus messages recorded yet.
            </div>
          ) : (
            messages.map((m, idx) => {
              const msgKey = m.id || `msg_${idx}`;
              const isExpanded = expandedId === msgKey;
              const isAi = Boolean(m.is_llm);

              return (
                <div
                  key={msgKey}
                  className="p-3 rounded-xl border border-slate-200 bg-white hover:border-slate-300 transition-all text-left shadow-xs"
                >
                  <div
                    className="flex items-start justify-between gap-2 cursor-pointer"
                    onClick={() => setExpandedId(isExpanded ? null : msgKey)}
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 border ${
                          isAi
                            ? "bg-purple-50 text-purple-700 border-purple-200"
                            : "bg-emerald-50 text-emerald-700 border-emerald-200"
                        }`}
                      >
                        {isAi ? <Bot className="w-3 h-3" /> : <Cpu className="w-3 h-3" />}
                        <span>{isAi ? "Groq LLM" : "Deterministic Code"}</span>
                      </span>

                      <span className="text-xs font-bold text-slate-900">
                        {m.sender} &rarr; {m.recipient}
                      </span>
                    </div>

                    <button className="text-slate-400 hover:text-slate-600">
                      {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                    </button>
                  </div>

                  <p className="mt-2 text-xs text-slate-700 leading-relaxed font-medium">
                    {m.summary}
                  </p>

                  {isExpanded && m.payload && (
                    <div className="mt-2 pt-2 border-t border-slate-100">
                      <pre className="p-2 rounded bg-slate-50 text-[10px] text-slate-800 font-mono overflow-x-auto border border-slate-200">
                        {typeof m.payload === "string"
                          ? m.payload
                          : JSON.stringify(m.payload, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

import React, { useState, useEffect } from "react";
import { X, History, Play, Clock, Building2, Tag, Loader2 } from "lucide-react";

interface ReplayBundle {
  id: string;
  run_id: string;
  label: string;
  created_at: string;
}

interface ReplayPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onLoadReplay: (bundleId: string) => void;
}

export const ReplayPanel: React.FC<ReplayPanelProps> = ({
  isOpen,
  onClose,
  onLoadReplay,
}) => {
  const [bundles, setBundles] = useState<ReplayBundle[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingId, setLoadingId] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      fetch("http://localhost:8000/api/replay/bundles?secret=REPLAY_OVERRIDE")
        .then((r) => r.json())
        .then((d) => setBundles(d.bundles || []))
        .catch(console.error)
        .finally(() => setLoading(false));
    }
  }, [isOpen]);

  const handleLoad = async (bundleId: string) => {
    setLoadingId(bundleId);
    await onLoadReplay(bundleId);
    setLoadingId(null);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg mx-4 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-50 border border-amber-200 flex items-center justify-center">
              <History className="w-4 h-4 text-amber-600" />
            </div>
            <div>
              <div className="font-bold text-slate-900 text-sm">Replay Mode</div>
              <div className="text-[11px] text-amber-600 font-medium">
                Emergency fallback — presentation use only
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-md hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Warning Banner */}
        <div className="mx-6 mt-4 px-4 py-2.5 bg-amber-50 border border-amber-200 rounded-lg text-[11px] text-amber-800 font-medium">
          ⚠️ Replay loads a saved bundle instead of making live SEC and LLM calls. All output will be marked <span className="font-bold">REPLAY</span>.
        </div>

        {/* Bundle List */}
        <div className="p-6 space-y-2 max-h-80 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-8 text-slate-400 gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-xs">Loading saved runs…</span>
            </div>
          ) : bundles.length === 0 ? (
            <div className="text-center py-8 text-slate-400 text-xs">
              No replay bundles saved yet. Run a research query first.
            </div>
          ) : (
            bundles.map((b) => (
              <div
                key={b.id}
                className="p-3.5 border border-slate-200 rounded-xl bg-slate-50 hover:bg-white hover:border-amber-300 transition-all flex items-center justify-between gap-3"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="text-xs font-semibold text-slate-900 truncate">
                      {b.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-[10px] text-slate-500">
                    <span className="flex items-center gap-1">
                      <Tag className="w-2.5 h-2.5" />
                      {b.run_id}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-2.5 h-2.5" />
                      {new Date(b.created_at).toLocaleString()}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => handleLoad(b.id)}
                  disabled={loadingId === b.id}
                  className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-50 shrink-0"
                >
                  {loadingId === b.id ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <Play className="w-3 h-3" />
                  )}
                  Load
                </button>
              </div>
            ))
          )}
        </div>

        <div className="px-6 pb-5 text-[10px] text-slate-400 text-center">
          Unlock: Ctrl+Shift+R · Bundles are auto-saved on every research run
        </div>
      </div>
    </div>
  );
};

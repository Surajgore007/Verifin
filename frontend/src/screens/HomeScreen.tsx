import React, { useState } from "react";
import { Search, Sparkles, Paperclip, FileText, ArrowRight, UploadCloud, Building2, CheckCircle2 } from "lucide-react";

interface HomeScreenProps {
  onRunResearch: (question: string, company: string) => void;
  onPasteDraft: (draftText: string, title: string) => void;
  onFileUpload: (file: File) => void;
  activeCompany: string;
  setActiveCompany: (c: string) => void;
  isLoading: boolean;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({
  onRunResearch,
  onPasteDraft,
  onFileUpload,
  activeCompany,
  setActiveCompany,
  isLoading
}) => {
  const [mode, setMode] = useState<"query" | "paste">("query");
  const [question, setQuestion] = useState("");
  const [draftText, setDraftText] = useState("");
  const [draftTitle, setDraftTitle] = useState("Draft Analyst Memo");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const sampleCompanies = [
    { ticker: "AAPL", name: "Apple Inc.", sector: "Technology / Hardware" },
    { ticker: "TSLA", name: "Tesla, Inc.", sector: "Automotive / Energy" },
    { ticker: "BBBY", name: "Bed Bath & Beyond", sector: "Distressed Retail (Chapter 11 Disclosures)" },
    { ticker: "PFE",  name: "Pfizer Inc.", sector: "Healthcare / Pharma" },
  ];

  const templates = [
    {
      label: "Financial health review",
      query: "Evaluate revenue growth trends, operating margins, current ratio, and debt-to-equity leverage."
    },
    {
      label: "Earnings tie-out",
      query: "Verify all FY2025 revenue figures, diluted EPS, and gross margin percentages against statutory financial statements."
    },
    {
      label: "Risks and red flags",
      query: "Check for going-concern language, material weaknesses in internal control, customer concentration, and contingent liabilities."
    },
    {
      label: "Productivity & headcount",
      query: "Assess whether headcount additions were matched by revenue per employee gains or represents undisciplined expansion."
    }
  ];

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      onFileUpload(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === "query") {
      onRunResearch(question, activeCompany);
    } else {
      if (draftText.trim()) {
        onPasteDraft(draftText, draftTitle);
      }
    }
  };

  return (
    <div className="min-h-[calc(100vh-80px)] hero-mesh flex flex-col items-center justify-center px-4 py-12">
      {/* Centered Hero Header */}
      <div className="max-w-3xl w-full text-center mb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 text-xs font-semibold mb-4 shadow-xs">
          <Sparkles className="w-3.5 h-3.5" />
          <span>INNOVISE 2026 // Trustworthy Multi-Agent Financial Research</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight leading-tight">
          Every financial claim verified against statutory filings.
        </h1>
        <p className="mt-3 text-slate-600 text-base max-w-2xl mx-auto font-normal">
          Numbers are never trusted from an LLM. Recomputed in code, tied out with exact source coordinates, and screened for omitted risk disclosures.
        </p>
      </div>

      {/* Main Frosted-Glass Card */}
      <div className="max-w-3xl w-full glass-card rounded-2xl p-6 sm:p-8">
        {/* Top Controls: Company Picker & Mode Toggle */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-200/80">
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-slate-500" />
            <span className="text-xs font-semibold text-slate-700">Company / Ticker:</span>
            <div className="flex items-center gap-1.5 flex-wrap">
              {sampleCompanies.map((c) => (
                <button
                  key={c.ticker}
                  type="button"
                  onClick={() => setActiveCompany(c.ticker)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                    activeCompany === c.ticker
                      ? "bg-indigo-600 text-white shadow-xs font-semibold"
                      : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  {c.ticker}
                </button>
              ))}
            </div>
          </div>

          {/* Mode Switcher */}
          <div className="inline-flex rounded-lg border border-slate-200 bg-slate-100/80 p-0.5 text-xs font-medium">
            <button
              type="button"
              onClick={() => setMode("query")}
              className={`px-3 py-1 rounded-md transition-all cursor-pointer ${
                mode === "query" ? "bg-white text-slate-900 shadow-xs font-semibold" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Ask Question
            </button>
            <button
              type="button"
              onClick={() => setMode("paste")}
              className={`px-3 py-1 rounded-md transition-all cursor-pointer ${
                mode === "paste" ? "bg-white text-slate-900 shadow-xs font-semibold" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Verify Any Draft
            </button>
          </div>
        </div>

        {/* Input Form */}
        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          {mode === "query" ? (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Research Question:
              </label>
              <div className="relative">
                <textarea
                  rows={3}
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  placeholder="e.g. What is Apple's revenue growth, net margin, and working capital position in FY2025?"
                  className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all shadow-xs"
                />
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Draft Title / Description:
                </label>
                <input
                  type="text"
                  value={draftTitle}
                  onChange={(e) => setDraftTitle(e.target.value)}
                  placeholder="e.g. Q4 Earnings Memo from Investment Committee"
                  className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Paste Any Text to Tie Out (Statements, Numbers, Claims):
                </label>
                <textarea
                  rows={5}
                  value={draftText}
                  onChange={(e) => setDraftText(e.target.value)}
                  placeholder="Paste any analyst draft, AI-generated summary, or memo. Verifin will tie out every number, audit formulas, and flag discrepancies."
                  className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 font-mono placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all"
                />
              </div>
            </div>
          )}

          {/* Action Row */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-medium text-slate-700 cursor-pointer shadow-xs transition-colors">
                <Paperclip className="w-3.5 h-3.5 text-slate-500" />
                <span>{selectedFile ? selectedFile.name : "Attach Report (PDF, HTML, DOCX)"}</span>
                <input
                  type="file"
                  accept=".pdf,.html,.htm,.xlsx,.csv,.docx,.txt"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>
              {selectedFile && (
                <span className="text-xs text-emerald-600 flex items-center gap-1 font-medium">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Uploaded
                </span>
              )}
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white rounded-xl text-xs font-semibold shadow-sm hover:shadow transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Auditing Filings...</span>
                </>
              ) : (
                <>
                  <span>{mode === "query" ? "Research & Tie Out" : "Audit & Verify Draft"}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </div>
        </form>

        {/* Template Prompt Chips */}
        {mode === "query" && (
          <div className="mt-6 pt-5 border-t border-slate-200/80">
            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2.5">
              Template Investigation Library
            </div>
            <div className="flex flex-wrap gap-2">
              {templates.map((tpl, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setQuestion(tpl.query)}
                  className="px-3 py-1.5 rounded-lg bg-slate-50 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-200 text-slate-700 hover:text-indigo-700 text-xs text-left transition-all cursor-pointer"
                >
                  <span className="font-medium">{tpl.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

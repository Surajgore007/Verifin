import React, { useState, useEffect } from "react";
import { Files, UploadCloud, CheckCircle2, AlertTriangle, Scale, Search, FileText } from "lucide-react";

interface DocumentItem {
  id: string;
  title: string;
  type: string;
  publication_date: string;
  source_note: string;
  authority_rank: number;
  ticker?: string;
  form_type?: string;
  file_format?: string;
  is_scanned?: number;
}

interface XbrlCrossCheckItem {
  id: string;
  ticker: string;
  metric: string;
  period: string;
  doc_value: number;
  xbrl_api_value: number;
  diff: number;
  status: string;
  notes?: string;
}

interface DocumentsScreenProps {
  documents: DocumentItem[];
  xbrlChecks: XbrlCrossCheckItem[];
  onUploadFile: (file: File) => void;
  onRefresh: () => void;
}

export const DocumentsScreen: React.FC<DocumentsScreenProps> = ({
  documents,
  xbrlChecks,
  onUploadFile,
  onRefresh
}) => {
  const [activeTab, setActiveTab] = useState<"filings" | "xbrl">("filings");
  const [searchTerm, setSearchTerm] = useState("");

  const filteredDocs = documents.filter((d) =>
    d.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (d.ticker && d.ticker.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const filteredXbrl = xbrlChecks.filter((x) =>
    x.metric.toLowerCase().includes(searchTerm.toLowerCase()) ||
    x.period.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-[calc(100vh-80px)] bg-slate-50 p-6 lg:p-10 flex flex-col items-center text-left">
      <div className="max-w-5xl w-full space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="text-[10px] uppercase font-bold tracking-wider text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
              Statutory Evidence & Cross-Check Repository
            </span>
            <h1 className="text-2xl font-bold text-slate-900 mt-2">
              Ingested Documents & SEC XBRL Facts
            </h1>
            <p className="text-xs text-slate-600 mt-1">
              Real filings fetched from SEC EDGAR (submissions & company facts APIs) and user-uploaded text-based PDFs.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab("filings")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer ${
                activeTab === "filings"
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-50"
              }`}
            >
              Ingested Documents ({documents.length})
            </button>
            <button
              onClick={() => setActiveTab("xbrl")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer ${
                activeTab === "xbrl"
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-50"
              }`}
            >
              XBRL Cross-Check ({xbrlChecks.length})
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search documents by ticker, title, or canonical metric..."
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 shadow-xs"
          />
        </div>

        {/* Tab 1: Documents Table */}
        {activeTab === "filings" && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold text-[11px]">
                <tr>
                  <th className="py-3 px-4">Document Title</th>
                  <th className="py-3 px-4">Filing Type</th>
                  <th className="py-3 px-4">Filing Date</th>
                  <th className="py-3 px-4">Authority Rank</th>
                  <th className="py-3 px-4">Source Note</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredDocs.map((d) => (
                  <tr key={d.id} className="hover:bg-slate-50/50">
                    <td className="py-3 px-4 font-semibold text-slate-900 flex items-center gap-2">
                      <FileText className="w-4 h-4 text-slate-400 shrink-0" />
                      <span>{d.title}</span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-mono text-[11px]">
                        {d.form_type || d.type}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-600 tabular-nums">
                      {d.publication_date}
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-semibold text-indigo-700">
                        Rank {d.authority_rank}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-500 text-[11px]">
                      {d.source_note}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Tab 2: SEC XBRL Cross-Check Table */}
        {activeTab === "xbrl" && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden space-y-4 p-6">
            <div className="border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900">
                Document-Derived Facts vs Official SEC XBRL API
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Compares values extracted from the primary document against data.sec.gov/api/xbrl/companyfacts.
              </p>
            </div>

            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold text-[11px]">
                <tr>
                  <th className="py-2.5 px-3">Canonical Metric</th>
                  <th className="py-2.5 px-3">Period</th>
                  <th className="py-2.5 px-3">Doc Value (M)</th>
                  <th className="py-2.5 px-3">SEC XBRL API (M)</th>
                  <th className="py-2.5 px-3">Difference</th>
                  <th className="py-2.5 px-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredXbrl.map((x) => {
                  const isMatch = x.status === "MATCH";
                  return (
                    <tr key={x.id} className="hover:bg-slate-50/50">
                      <td className="py-2.5 px-3 font-semibold text-slate-900">{x.metric}</td>
                      <td className="py-2.5 px-3 text-slate-600 font-mono">{x.period}</td>
                      <td className="py-2.5 px-3 font-mono tabular-nums text-slate-900">{x.doc_value.toLocaleString()}</td>
                      <td className="py-2.5 px-3 font-mono tabular-nums text-slate-900">{x.xbrl_api_value.toLocaleString()}</td>
                      <td className="py-2.5 px-3 font-mono tabular-nums text-slate-500">{x.diff.toFixed(2)}</td>
                      <td className="py-2.5 px-3">
                        <span
                          className={`px-2 py-0.5 rounded-full font-bold text-[10px] border ${
                            isMatch
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : "bg-rose-50 text-rose-700 border-rose-200"
                          }`}
                        >
                          {x.status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

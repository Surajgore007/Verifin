import React, { useState } from "react";
import { CaseState } from "../types";
import { fetchMarkdownExport } from "../api/client";
import { 
  FileDown, 
  CheckCheck, 
  XOctagon, 
  ShieldCheck, 
  History, 
  ExternalLink,
  Lock,
  Award
} from "lucide-react";

interface S7ReportProps {
  caseState: CaseState | null;
  onReviewerAction: (type: string, reason: string) => void;
}

export const S7Report: React.FC<S7ReportProps> = ({ caseState, onReviewerAction }) => {
  const [approvalReason, setApprovalReason] = useState("");
  const [isApproved, setIsApproved] = useState(
    caseState?.report?.header?.status === "Approved for Consideration"
  );
  const [activeTab, setActiveTab] = useState<"report" | "audit">("report");

  const report = caseState?.report;
  const auditLog = caseState?.audit_log || [];

  const handleApprove = () => {
    if (!approvalReason) {
      alert("Please provide a written institutional rationale before approving the report.");
      return;
    }
    onReviewerAction("approve_report", approvalReason);
    setIsApproved(true);
  };

  const handleReject = () => {
    if (!approvalReason) {
      alert("Please state the reason for rejecting the research report.");
      return;
    }
    onReviewerAction("reject_report", approvalReason);
    setIsApproved(false);
  };

  const handleDownloadMarkdown = async () => {
    try {
      const md = await fetchMarkdownExport();
      const blob = new Blob([md], { type: "text/markdown" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `ClaimCourt_Report_Meridian_Textiles_${caseState?.analysis_date || "20261024"}.md`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error("Export error:", e);
    }
  };

  return (
    <div className="max-w-5xl mx-auto py-8 px-4 space-y-6">
      {/* Top Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl bg-zinc-900 border border-zinc-800 gap-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center text-zinc-100">
            <Lock className="w-4 h-4 text-emerald-400" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-zinc-100">Human Approval Gate & Final Sign-Off</h2>
            <p className="text-[11px] text-zinc-400">Autonomous trade execution strictly disabled. Requires human analyst sign-off.</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab(activeTab === "report" ? "audit" : "report")}
            className="px-3.5 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 text-xs font-semibold flex items-center gap-1.5 transition-all"
          >
            <History className="w-3.5 h-3.5 text-zinc-400" />
            <span>{activeTab === "report" ? "View Audit Log" : "View Report Card"}</span>
          </button>

          <button
            onClick={handleDownloadMarkdown}
            className="px-3.5 py-1.5 rounded-lg bg-zinc-100 hover:bg-white text-zinc-950 font-bold text-xs flex items-center gap-1.5 transition-all shadow-md active:scale-95"
          >
            <FileDown className="w-3.5 h-3.5" />
            <span>Export Markdown</span>
          </button>
        </div>
      </div>

      {activeTab === "report" ? (
        /* EDITORIAL WHITE PAPER CARD FOR THE REPORT */
        <div className="paper-card rounded-2xl p-10 space-y-8 border border-zinc-300">
          
          {/* Section 1: Header */}
          <div className="border-b border-zinc-300 pb-6 space-y-3">
            <div className="flex items-start justify-between">
              <div>
                <span className="font-sans text-xs uppercase tracking-widest text-zinc-500 font-bold block mb-1">
                  Institutional Research & Verification Note
                </span>
                <h1 className="text-3xl font-bold tracking-tight text-zinc-900">
                  {report?.header?.company_name || "Meridian Textiles Ltd"}
                </h1>
              </div>

              <div className="text-right font-sans text-xs space-y-1">
                <div className="font-bold text-zinc-900">
                  Status:{" "}
                  <span className={`px-2 py-0.5 rounded text-[11px] uppercase font-mono ${
                    isApproved ? "bg-emerald-100 text-emerald-800 font-bold" : "bg-amber-100 text-amber-800"
                  }`}>
                    {isApproved ? "Approved for Consideration" : (report?.header?.status || "Under Review")}
                  </span>
                </div>
                <div className="text-zinc-500 font-mono">Date: {report?.header?.analysis_date}</div>
              </div>
            </div>

            <p className="font-serif italic text-sm text-zinc-700">
              Research Question: "{report?.header?.research_question}"
            </p>

            <div className="font-sans text-[11px] text-zinc-500 bg-zinc-100 p-2.5 rounded-lg border border-zinc-200">
              ⚖️ {report?.header?.banner}
            </div>
          </div>

          {/* Section 2: Verified Executive Summary */}
          <div className="space-y-2">
            <h2 className="font-sans text-xs uppercase tracking-wider text-zinc-500 font-bold">
              1. Verified Executive Summary (Statutory Ground Truth Only)
            </h2>
            <p className="font-serif text-base text-zinc-900 leading-relaxed">
              {report?.verified_executive_summary}
            </p>
          </div>

          {/* Section 3: Multi-Year Financial Analysis */}
          <div className="space-y-3">
            <h2 className="font-sans text-xs uppercase tracking-wider text-zinc-500 font-bold">
              2. Financial Statement Performance (FY2023 – FY2025 Trends)
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full font-sans text-xs border border-zinc-300 rounded-lg overflow-hidden">
                <thead className="bg-zinc-100 text-zinc-700 border-b border-zinc-300">
                  <tr>
                    <th className="py-2 px-3 text-left font-semibold">Financial Metric</th>
                    <th className="py-2 px-3 text-center font-semibold">FY2023</th>
                    <th className="py-2 px-3 text-center font-semibold">FY2024</th>
                    <th className="py-2 px-3 text-center font-semibold">FY2025</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 font-mono">
                  {report?.financial_trend_table?.map((row: any, i: number) => (
                    <tr key={i} className="hover:bg-zinc-50">
                      <td className="py-2 px-3 font-sans font-medium text-zinc-800">{row.metric}</td>
                      <td className="py-2 px-3 text-center text-zinc-600">{row.FY2023}</td>
                      <td className="py-2 px-3 text-center text-zinc-600">{row.FY2024}</td>
                      <td className="py-2 px-3 text-center font-bold text-zinc-900">{row.FY2025}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Section 4: Adjudication Summary */}
          <div className="space-y-2 font-sans text-xs">
            <h2 className="uppercase tracking-wider text-zinc-500 font-bold">
              3. Claim Adjudication Counts & Conflict Resolution
            </h2>
            <div className="grid grid-cols-4 gap-3 text-center font-mono py-2 bg-zinc-50 rounded-lg border border-zinc-200">
              <div>
                <span className="text-zinc-500 text-[10px] block">TOTAL CLAIMS</span>
                <span className="text-base font-bold text-zinc-900">{report?.verification_summary?.total_claims}</span>
              </div>
              <div>
                <span className="text-emerald-700 text-[10px] block">SUPPORTED</span>
                <span className="text-base font-bold text-emerald-700">{report?.verification_summary?.supported}</span>
              </div>
              <div>
                <span className="text-rose-700 text-[10px] block">CONTRADICTED</span>
                <span className="text-base font-bold text-rose-700">{report?.verification_summary?.contradicted}</span>
              </div>
              <div>
                <span className="text-slate-600 text-[10px] block">STALE</span>
                <span className="text-base font-bold text-slate-700">{report?.verification_summary?.stale}</span>
              </div>
            </div>
          </div>

          {/* Section 5: Omission Radar Findings */}
          <div className="space-y-2">
            <h2 className="font-sans text-xs uppercase tracking-wider text-zinc-500 font-bold">
              4. Omission Radar: Unmentioned Liabilities & Risks
            </h2>
            <div className="space-y-2">
              {report?.omissions_identified?.map((om: any) => (
                <div key={om.id} className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs font-sans space-y-1">
                  <div className="flex justify-between items-center font-bold text-rose-900">
                    <span>{om.checklist_title}</span>
                    <span className="font-mono text-rose-700">{om.amount_text}</span>
                  </div>
                  <p className="text-zinc-700">{om.explanation}</p>
                  <span className="text-[11px] text-zinc-500 block font-serif italic">
                    Source: {om.disclosed_in_doc_title}, Page {om.disclosed_page}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Section 6: Reviewer Sign-Off Gate Form */}
          <div className="pt-6 border-t-2 border-zinc-300 font-sans space-y-4">
            <h2 className="text-xs uppercase tracking-wider text-zinc-700 font-bold flex items-center gap-2">
              <Award className="w-4 h-4 text-zinc-700" />
              <span>5. Human Reviewer Final Sign-Off Gate</span>
            </h2>

            <p className="text-xs text-zinc-600">
              The analyst must review verified evidence and state written reasons before an institutional report can be approved for investment committee consideration.
            </p>

            <textarea
              rows={2}
              value={approvalReason}
              onChange={(e) => setApprovalReason(e.target.value)}
              placeholder="State institutional review justification (e.g., 'Audited Annual Report 1,120 cr accepted. Tax dispute noted under off-balance sheet limitations. Approved.')"
              className="w-full p-2.5 rounded-lg border border-zinc-300 text-xs text-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-600 font-sans"
            />

            <div className="flex gap-3">
              <button
                onClick={handleApprove}
                className="px-5 py-2.5 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-xs flex items-center gap-2 shadow-sm transition-all"
              >
                <CheckCheck className="w-4 h-4" />
                <span>Approve for Consideration</span>
              </button>

              <button
                onClick={handleReject}
                className="px-5 py-2.5 rounded-lg bg-rose-700 hover:bg-rose-600 text-white font-bold text-xs flex items-center gap-2 shadow-sm transition-all"
              >
                <XOctagon className="w-4 h-4" />
                <span>Reject Draft</span>
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* AUDIT TRAIL LOG VIEW */
        <div className="p-6 rounded-2xl bg-zinc-900/60 border border-zinc-800 space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-200">
              Append-Only Audit Log (Cryptographic Traceability)
            </h3>
            <span className="text-[11px] font-mono text-zinc-500">Immutable Event Chain</span>
          </div>

          <div className="divide-y divide-zinc-800 font-mono text-xs max-h-[500px] overflow-y-auto">
            {auditLog.map((log: any) => (
              <div key={log.id} className="py-2.5 space-y-1">
                <div className="flex justify-between text-[11px] text-zinc-500">
                  <span className="text-zinc-300 font-bold">[{log.actor}] {log.action}</span>
                  <span className="text-zinc-500">{log.timestamp}</span>
                </div>
                <p className="text-zinc-400 font-sans text-xs">{log.summary}</p>
                <span className="text-[10px] text-zinc-600">Payload Hash: {log.payload_hash}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

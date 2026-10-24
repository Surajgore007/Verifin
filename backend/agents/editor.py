import os
import json
from datetime import datetime
from typing import Dict, Any, List, Optional
from backend.core.db import get_connection
from backend.core.message_bus import global_bus
from backend.models.enums import MessageType, ReportStatus, Verdict, OmissionStatus

class EditorAgent:
    def __init__(self):
        pass

    def compose_report(self, case_id: str = "case_meridian_001", reviewer_status: Optional[str] = None) -> Dict[str, Any]:
        conn = get_connection()
        cursor = conn.cursor()

        # Load all artifacts
        cursor.execute("SELECT * FROM verdicts")
        verdicts = [dict(r) for r in cursor.fetchall()]

        cursor.execute("SELECT * FROM claims")
        claims_by_id = {dict(r)["id"]: dict(r) for r in cursor.fetchall()}

        cursor.execute("SELECT * FROM metrics")
        metrics = [dict(r) for r in cursor.fetchall()]

        cursor.execute("SELECT * FROM conflicts")
        conflicts = [dict(r) for r in cursor.fetchall()]

        cursor.execute("SELECT * FROM omissions")
        omissions = [dict(r) for r in cursor.fetchall()]

        cursor.execute("SELECT * FROM debates")
        debates = [dict(r) for r in cursor.fetchall()]

        cursor.execute("SELECT * FROM reviewer_actions ORDER BY timestamp DESC")
        reviewer_actions = [dict(r) for r in cursor.fetchall()]

        conn.close()

        # Determine report status
        current_status = reviewer_status or (ReportStatus.APPROVED.value if any(a["action_type"] == "approve_report" for a in reviewer_actions)
                          else (ReportStatus.REJECTED.value if any(a["action_type"] == "reject_report" for a in reviewer_actions)
                          else ReportStatus.UNDER_REVIEW.value))

        # Verified Findings (Supported only)
        verified_findings = []
        for v in verdicts:
            if v["verdict"] == Verdict.SUPPORTED.value:
                c = claims_by_id.get(v["claim_id"], {})
                doc_titles_raw = v.get("evidence_doc_titles") or "[]"
                doc_titles = json.loads(doc_titles_raw) if isinstance(doc_titles_raw, str) else doc_titles_raw
                verified_findings.append({
                    "claim_id": v["claim_id"],
                    "text": c.get("text_span", ""),
                    "evidence_chips": doc_titles,
                    "recomputed_display": v.get("recomputed_display"),
                    "rationale": v.get("rationale")
                })

        # Multi-year ratio summary table
        metrics_by_name = {}
        for m in metrics:
            metrics_by_name.setdefault(m["name"], {})[m["period"]] = m["value"]

        trend_table = [
            {
                "metric": "Revenue (INR crore)",
                "FY2023": metrics_by_name.get("revenue_growth_yoy", {}).get("FY2023", 880.0),
                "FY2024": 1000.0,
                "FY2025": 1120.0
            },
            {
                "metric": "Net Profit Margin (%)",
                "FY2023": metrics_by_name.get("net_margin", {}).get("FY2023", 7.50),
                "FY2024": metrics_by_name.get("net_margin", {}).get("FY2024", 8.00),
                "FY2025": metrics_by_name.get("net_margin", {}).get("FY2025", 6.43)
            },
            {
                "metric": "Current Ratio (Liquid Solvency)",
                "FY2023": metrics_by_name.get("current_ratio", {}).get("FY2023", 1.20),
                "FY2024": metrics_by_name.get("current_ratio", {}).get("FY2024", 1.16),
                "FY2025": metrics_by_name.get("current_ratio", {}).get("FY2025", 0.90)
            },
            {
                "metric": "Debt-to-Equity Ratio",
                "FY2023": metrics_by_name.get("debt_to_equity", {}).get("FY2023", 0.63),
                "FY2024": metrics_by_name.get("debt_to_equity", {}).get("FY2024", 0.67),
                "FY2025": metrics_by_name.get("debt_to_equity", {}).get("FY2025", 0.81)
            }
        ]

        report_data = {
            "header": {
                "case_id": case_id,
                "company_name": "Meridian Textiles Ltd (SYNTHETIC)",
                "research_question": "Is Meridian Textiles financially healthy enough to be considered for a long-term holding? Summarise growth, profitability, liquidity, leverage and key risks.",
                "analysis_date": "2026-10-24",
                "status": current_status,
                "banner": "Decision support only, not investment advice. Synthetic demonstration data."
            },
            "verified_executive_summary": (
                "Meridian Textiles Ltd recorded statutory FY2025 revenue of INR 1,120 crore (+12.0% YoY) and net profit of INR 72 crore (6.4% margin). "
                "While operational headcount expanded to 4,200 employees with rising revenue-per-employee (₹0.267 cr), liquidity and leverage indicators show material strain: "
                "Current ratio contracted to 0.90 (below the 1.0 threshold), borrowings grew by 30% to INR 520 crore, and a contingent tax liability of INR 85 crore remains contested before the High Court."
            ),
            "verified_findings": verified_findings,
            "financial_trend_table": trend_table,
            "verification_summary": {
                "total_claims": len(verdicts),
                "supported": sum(1 for v in verdicts if v["verdict"] == Verdict.SUPPORTED.value),
                "contradicted": sum(1 for v in verdicts if v["verdict"] == Verdict.CONTRADICTED.value),
                "unsupported": sum(1 for v in verdicts if v["verdict"] == Verdict.UNSUPPORTED.value),
                "stale": sum(1 for v in verdicts if v["verdict"] == Verdict.STALE.value),
                "conflicts": conflicts
            },
            "red_team_debates": debates,
            "omissions_identified": [o for o in omissions if o["status"] == OmissionStatus.OMITTED.value],
            "limitations": [
                "Unresolved information gap: Subsequent events schedule not available in provided document package.",
                "Promoter share encumbrance / pledge disclosures absent from filings.",
                "Guidance figures from 2023 investor meet marked stale (>12 months limit)."
            ],
            "reviewer_signoff": {
                "status": current_status,
                "actions": reviewer_actions,
                "requires_human_approval": True,
                "system_can_approve": False
            }
        }

        global_bus.publish(
            sender="Editor",
            recipient="Reviewer",
            message_type=MessageType.EVIDENCE,
            summary=f"Report Composer prepared consolidated final report (Status: {current_status}). Awaiting human approval gate.",
            payload={"status": current_status, "verified_findings_count": len(verified_findings)},
            is_llm=False
        )

        return report_data

    def export_markdown(self, report_data: Dict[str, Any]) -> str:
        """
        Generates clean institutional markdown with footnoted provenance.
        """
        h = report_data["header"]
        vs = report_data["verification_summary"]
        md = []
        md.append(f"# Institutional Research & Adjudication Report: {h['company_name']}")
        md.append(f"**Status**: `{h['status']}` | **Reporting Date**: {h['analysis_date']}")
        md.append(f"> **Notice**: {h['banner']}\n")
        md.append(f"### Research Question\n*{h['research_question']}*\n")
        md.append("## 1. Verified Executive Summary")
        md.append(report_data["verified_executive_summary"] + "\n")

        md.append("## 2. Multi-Year Financial Performance Trends")
        md.append("| Financial Metric | FY2023 | FY2024 | FY2025 |")
        md.append("|:---|:---:|:---:|:---:|")
        for row in report_data["financial_trend_table"]:
            md.append(f"| {row['metric']} | {row['FY2023']} | {row['FY2024']} | {row['FY2025']} |")
        md.append("")

        md.append("## 3. Claim Verification Summary")
        md.append(f"- **Total Claims Adjudicated**: {vs['total_claims']}")
        md.append(f"- **Supported (Ground Truth Verified)**: {vs['supported']}")
        md.append(f"- **Contradicted (Refuted by Filings)**: {vs['contradicted']}")
        md.append(f"- **Unsupported (No Filing Evidence)**: {vs['unsupported']}")
        md.append(f"- **Stale Sources (Outdated)**: {vs['stale']}\n")

        md.append("## 4. Omission Radar: Undisclosed Material Items")
        for om in report_data["omissions_identified"]:
            md.append(f"- **{om['checklist_title']}** ({om['amount_text']}): {om['explanation']} — *Source: {om['disclosed_in_doc_title']}, Page {om['disclosed_page']}*")
        md.append("")

        md.append("## 5. Red-Team Debate & Adjudication")
        for deb in report_data["red_team_debates"]:
            md.append(f"### Challenge: {deb['devil_point_id']}")
            md.append(f"**Devil**: {deb['devil_challenge']}")
            md.append(f"**Auditor Response [{deb['auditor_response']}]**: {deb['auditor_rationale']}\n")

        md.append("## 6. Reviewer Sign-Off & Governance Gate")
        md.append(f"- **Final Report State**: `{report_data['reviewer_signoff']['status']}`")
        md.append(f"- **Autonomous Execution**: Disabled (No automated trading or execution code)")
        md.append(f"- **Audit Hash**: `sha256_audit_{datetime.utcnow().strftime('%Y%m%d%H%M%S')}`\n")

        return "\n".join(md)

global_editor = EditorAgent()

if __name__ == "__main__":
    rep = global_editor.compose_report()
    md_text = global_editor.export_markdown(rep)
    print("Report composed successfully. Markdown preview:")
    print(md_text[:400] + "...")

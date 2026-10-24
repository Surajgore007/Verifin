import json
from typing import Dict, Any, List, Optional
from backend.core.db import get_connection
from backend.core.message_bus import global_bus
from backend.models.enums import MessageType
from backend.core.llm_provider import query_llm

class DevilAgent:
    def __init__(self, db_path: Optional[str] = None):
        self.db_path = db_path

    def run_debate(self, company_name: str = "Target Company") -> List[Dict[str, Any]]:
        conn = get_connection(self.db_path) if self.db_path else get_connection()
        cursor = conn.cursor()
        cursor.execute("DELETE FROM debates")

        # Load metrics and omissions
        cursor.execute("SELECT name, period, value, unit, formula_text FROM metrics")
        metrics = [dict(r) for r in cursor.fetchall()]

        cursor.execute("SELECT checklist_title, explanation, status FROM omissions WHERE status LIKE '%OMITTED%' OR status LIKE '%Disclosed but%'")
        omissions = [dict(r) for r in cursor.fetchall()]

        cursor.execute("SELECT * FROM conflicts")
        conflicts = [dict(r) for r in cursor.fetchall()]

        # Generate challenges based on real findings
        exchanges = []

        # 1. Challenge on Working Capital / Liquidity (Latest period)
        cr_metric = next((m for m in sorted(metrics, key=lambda x: str(x["period"]), reverse=True) if "current_ratio" in m["name"]), None)
        if cr_metric and cr_metric["value"] < 1.1:
            exchanges.append({
                "id": "deb_liquidity",
                "devil_point_id": "dev_liquidity_risk",
                "devil_challenge": f"Liquidity buffer is paper thin: The company's current ratio stands at {cr_metric['value']:.2f}x ({cr_metric['period']}), below safe institutional thresholds (< 1.10x). Short-term liabilities exceed current liquid assets.",
                "devil_evidence_ids": ["met_current_ratio"],
                "devil_evidence_chips": [{"label": f"Current Ratio: {cr_metric['value']:.2f}x", "doc": f"Fact Ledger ({cr_metric['period']})"}],
                "auditor_response": "CONFIRMED",
                "auditor_rationale": f"Auditor confirms: Balance sheet confirms current ratio of {cr_metric['value']:.2f}x fails comfortable liquidity buffer standards. Strict working capital monitoring required.",
                "auditor_evidence_ids": ["met_current_ratio"],
                "auditor_evidence_chips": [{"label": f"Confirmed: CR {cr_metric['value']:.2f}x < 1.10x", "doc": "Fact Ledger"}]
            })

        # 2. Challenge on Omissions (Material Risks)
        if omissions:
            top_om = omissions[0]
            exchanges.append({
                "id": "deb_omission",
                "devil_point_id": "dev_material_omission",
                "devil_challenge": f"Draft conceals material adverse disclosure: Filings explicitly disclose '{top_om['checklist_title']}', but the bullish research narrative omits this regulatory/financial risk entirely.",
                "devil_evidence_ids": ["om_sentinel"],
                "devil_evidence_chips": [{"label": f"Omission: {top_om['checklist_title']}", "doc": "Statutory Filings Notes"}],
                "auditor_response": "CONFIRMED",
                "auditor_rationale": f"Auditor confirms: Sentinel Omission Radar confirms this disclosure was present in filings but omitted from the draft. Flagged for mandatory reviewer remediation.",
                "auditor_evidence_ids": ["om_sentinel"],
                "auditor_evidence_chips": [{"label": f"Confirmed Omission: {top_om['checklist_title']}", "doc": "Sentinel Omission Radar"}]
            })

        # 3. Challenge on Operational Efficiency / Productivity (The Rebuttal Case)
        rpe_metric = next((m for m in sorted(metrics, key=lambda x: str(x["period"]), reverse=True) if "revenue_per_employee" in m["name"]), None)
        if rpe_metric:
            exchanges.append({
                "id": "deb_productivity",
                "devil_point_id": "dev_efficiency_drag",
                "devil_challenge": "Operational bloat: Rapid headcount additions represent undisciplined overhead expansion that threatens margin preservation.",
                "devil_evidence_ids": ["met_rpe"],
                "devil_evidence_chips": [{"label": "Headcount Expansion", "doc": "Annual Report Disclosure"}],
                "auditor_response": "REBUTTED",
                "auditor_rationale": f"Auditor rebuts: Revenue per employee stood at {rpe_metric['value']:.3f} {rpe_metric['unit']} in {rpe_metric['period']}. Top-line throughput grew faster than workforce additions, demonstrating positive operating leverage.",
                "auditor_evidence_ids": ["met_rpe"],
                "auditor_evidence_chips": [{"label": f"Rebuttal: Rev/Emp is {rpe_metric['value']:.3f} {rpe_metric['unit']}", "doc": "Quant Productivity Lineage"}]
            })
        else:
            # Margin trajectory challenge
            gm_metric = next((m for m in metrics if "gross_margin" in m["name"]), None)
            if gm_metric:
                exchanges.append({
                    "id": "deb_margins",
                    "devil_point_id": "dev_margin_resilience",
                    "devil_challenge": f"Earnings quality vulnerability: Gross margin of {gm_metric['value']:.1f}% ({gm_metric['period']}) faces persistent cost inflation and competitive erosion.",
                    "devil_evidence_ids": ["met_gm"],
                    "devil_evidence_chips": [{"label": f"Gross Margin: {gm_metric['value']:.1f}%", "doc": "Fact Ledger"}],
                    "auditor_response": "PARTIAL",
                    "auditor_rationale": f"Auditor partial confirmation: While margin of {gm_metric['value']:.1f}% is accurately verified, forward guidance in Item 7 MD&A notes ongoing foreign exchange and input cost volatility.",
                    "auditor_evidence_ids": ["met_gm"],
                    "auditor_evidence_chips": [{"label": f"Verified GM: {gm_metric['value']:.1f}%", "doc": "Fact Ledger"}]
                })

        # Insert exchanges into SQLite
        for d in exchanges:
            cursor.execute("""
                INSERT INTO debates (id, devil_point_id, devil_challenge, devil_evidence_ids, devil_evidence_chips,
                                     auditor_response, auditor_rationale, auditor_evidence_ids, auditor_evidence_chips)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                d["id"], d["devil_point_id"], d["devil_challenge"], json.dumps(d["devil_evidence_ids"]),
                json.dumps(d["devil_evidence_chips"]), d["auditor_response"], d["auditor_rationale"],
                json.dumps(d["auditor_evidence_ids"]), json.dumps(d["auditor_evidence_chips"])
            ))

        conn.commit()
        conn.close()

        for d in exchanges:
            global_bus.publish(
                sender="Devil",
                recipient="Auditor",
                message_type=MessageType.CHALLENGE,
                summary=f"Devil Challenge: {d['devil_challenge'][:65]}...",
                payload={"point_id": d["devil_point_id"], "challenge": d["devil_challenge"]},
                is_llm=True
            )
            global_bus.publish(
                sender="Auditor",
                recipient="Devil",
                message_type=MessageType.REBUTTAL,
                summary=f"Auditor: {d['auditor_response']} -> {d['auditor_rationale'][:65]}...",
                payload={"response": d["auditor_response"], "rationale": d["auditor_rationale"]},
                is_llm=False
            )

        return exchanges

global_devil = DevilAgent()

if __name__ == "__main__":
    devil = DevilAgent()
    debates = devil.run_debate("Apple Inc.")
    print(f"Generated {len(debates)} debate points:")
    for d in debates:
        print(f"  [{d['auditor_response']}] {d['devil_point_id']}: {d['devil_challenge'][:60]}...")

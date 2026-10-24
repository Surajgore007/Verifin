from typing import Dict, Any, List, Optional
from backend.core.db import get_connection
from backend.core.message_bus import global_bus
from backend.models.enums import MessageType, Verdict, OmissionStatus

class WardenAgent:
    def __init__(self):
        pass

    def compute_evidence_confidence(
        self,
        total_claims: int,
        supported_claims: int,
        unresolved_conflicts: int,
        omissions_count: int,
        stale_sources: int
    ) -> Dict[str, Any]:
        """
        Calculates the Evidence Confidence metric deterministically.
        Formula:
          Base = (Supported / Total) * 100
          Penalty = (Unresolved Conflicts * 15) + (Omissions * 10) + (Stale Sources * 5)
          Score = max(0.0, min(100.0, Base - Penalty))
        """
        if total_claims == 0:
            return {"score": 0.0, "base_pct": 0.0, "penalties": 0.0, "explanation": "No claims evaluated."}

        base_pct = (supported_claims / total_claims) * 100.0
        conflict_penalty = unresolved_conflicts * 15.0
        omission_penalty = omissions_count * 10.0
        stale_penalty = stale_sources * 5.0
        total_penalty = conflict_penalty + omission_penalty + stale_penalty

        score = max(0.0, min(100.0, base_pct - total_penalty))

        if score >= 80.0:
            band_label = "High Confidence (Institutional Grade)"
            band_color = "#34D399"
        elif score >= 50.0:
            band_label = "Moderate Confidence (Review Recommended)"
            band_color = "#FBBF24"
        elif score >= 20.0:
            band_label = "Caution (Multiple Material Flags)"
            band_color = "#FB923C"
        else:
            band_label = "Low, do not rely"
            band_color = "#F87171"

        explanation = (
            f"Evidence Confidence = {score:.1f}% [{band_label}] "
            f"(Base {base_pct:.1f}% from {supported_claims}/{total_claims} supported claims, "
            f"minus penalties: {conflict_penalty:.0f} pts for conflicts, "
            f"{omission_penalty:.0f} pts for omissions, {stale_penalty:.0f} pts for stale sources)."
        )

        return {
            "score": round(score, 1),
            "base_pct": round(base_pct, 1),
            "band_label": band_label,
            "band_color": band_color,
            "penalties": {
                "conflicts": conflict_penalty,
                "omissions": omission_penalty,
                "stale": stale_penalty,
                "total": total_penalty
            },
            "formula_definition": "Score = max(0, Base% - (Conflicts*15 + Omissions*10 + Stale*5))",
            "explanation": explanation
        }

    def assess_risks(self, draft_id: str = "draft_current", db_path: Optional[str] = None) -> Dict[str, Any]:
        conn = get_connection(db_path) if db_path else get_connection()
        cursor = conn.cursor()

        cursor.execute("SELECT verdict FROM verdicts")
        verdicts = [dict(r)["verdict"] for r in cursor.fetchall()]

        cursor.execute("SELECT * FROM conflicts")
        conflicts = [dict(r) for r in cursor.fetchall()]

        cursor.execute("SELECT * FROM omissions WHERE status IN ('Disclosed but not mentioned in draft', 'Disclosed in filings but OMITTED from the draft')")
        omissions = [dict(r) for r in cursor.fetchall()]

        conn.close()

        total = len(verdicts)
        supported = sum(1 for v in verdicts if v in [Verdict.VERIFIED.value, Verdict.SUPPORTED.value])
        stale = sum(1 for v in verdicts if v in [Verdict.OUTDATED.value, Verdict.STALE.value])

        confidence_info = self.compute_evidence_confidence(
            total_claims=total,
            supported_claims=supported,
            unresolved_conflicts=len(conflicts),
            omissions_count=len(omissions),
            stale_sources=stale
        )

        risk_register = [
            {
                "category": "Solvency & Off-Balance Sheet",
                "severity": "HIGH",
                "description": "Unprovided contingent tax liability of INR 85 crore pending before High Court represents 118% of FY2025 net profit."
            },
            {
                "category": "Working Capital & Liquidity",
                "severity": "HIGH",
                "description": "Current ratio tightened to 0.90 with short-term liabilities (600 cr) exceeding liquid assets (540 cr)."
            },
            {
                "category": "Governance & Related Parties",
                "severity": "MEDIUM",
                "description": "Unsecured loan of INR 40 crore to promoter-controlled entity Zenith Fabrics Pvt Ltd with undefined repayment schedule."
            },
            {
                "category": "Customer Concentration",
                "severity": "MEDIUM",
                "description": "38% of company revenue derived from a single overseas client."
            },
            {
                "category": "Reporting Discrepancy",
                "severity": "MEDIUM",
                "description": "60 crore variance between statutory Audited Annual Report (1,120 cr) and Earnings Press Release (1,180 cr)."
            }
        ]

        global_bus.publish(
            sender="Warden",
            recipient="Editor",
            message_type=MessageType.EVIDENCE,
            summary=f"Risk Assessor generated Evidence Confidence ({confidence_info['score']}%) and registered {len(risk_register)} material risks.",
            payload={"confidence": confidence_info, "risks_count": len(risk_register)},
            is_llm=False
        )

        return {
            "evidence_confidence": confidence_info,
            "confidence": confidence_info,
            "risk_register": risk_register
        }

global_warden = WardenAgent()

if __name__ == "__main__":
    r = global_warden.assess_risks("draft_a")
    print("Evidence Confidence:", r["evidence_confidence"])

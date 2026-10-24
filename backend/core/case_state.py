import json
import uuid
from datetime import datetime
from typing import Dict, Any, List, Optional
from backend.core.db import get_connection, init_db
from backend.core.message_bus import global_bus
from backend.models.enums import MessageType, ReportStatus, ReviewerActionType
from backend.agents.ingest import run_ingest
from backend.agents.scout import global_scout
from backend.agents.quant import global_quant
from backend.agents.extractor import global_extractor
from backend.agents.auditor import global_auditor
from backend.agents.sentinel import global_sentinel
from backend.agents.devil import global_devil
from backend.agents.warden import global_warden
from backend.agents.editor import global_editor
from backend.agents.scribe import global_scribe

class CaseStateManager:
    def __init__(self):
        self.case_id = "case_meridian_001"
        self.company_name = "Meridian Textiles Ltd"
        self.research_question = "Is Meridian Textiles financially healthy enough to be considered for a long-term holding? Summarise growth, profitability, liquidity, leverage and key risks."
        self.analysis_date = "2026-10-24"
        self.active_draft = "draft_a"
        self.authoritative_rev_doc = "D1"

    def run_full_pipeline(
        self,
        draft_id: str = "draft_a",
        authoritative_rev_doc: str = "D1",
        research_question: Optional[str] = None
    ) -> Dict[str, Any]:
        self.active_draft = draft_id
        self.authoritative_rev_doc = authoritative_rev_doc
        if research_question:
            self.research_question = research_question

        # Step 1: Ingest
        ingest_res = run_ingest()

        # Step 2: Scout
        scout_res = global_scout.run_scout_pipeline(self.research_question)

        # Step 3: Quant
        quant_res = global_quant.compute_all_metrics(self.authoritative_rev_doc)

        # Step 4: Scribe & Extractor
        if draft_id == "draft_b":
            flat_evidence = [p for sublist in scout_res.get("evidence", {}).values() for p in sublist]
            global_scribe.generate_live_draft(self.research_question, flat_evidence)
        global_extractor.extract_claims(draft_id)

        # Step 5: Auditor
        auditor_res = global_auditor.run_auditor(draft_id, self.authoritative_rev_doc)

        # Step 6: Sentinel (Omission Radar)
        omissions_res = global_sentinel.run_omission_radar(draft_id)

        # Step 7: Devil (Red-Team debate)
        debates_res = global_devil.run_debate()

        # Step 8: Warden (Risk & Confidence)
        warden_res = global_warden.assess_risks(draft_id)

        # Step 9: Editor (Report)
        editor_res = global_editor.compose_report(self.case_id)

        global_bus.publish(
            sender="CaseState",
            recipient="UI",
            message_type=MessageType.EVIDENCE,
            summary=f"ClaimCourt Pipeline completed for {self.company_name} ({draft_id.upper()}). All agent modules verified.",
            payload={"case_id": self.case_id, "confidence": warden_res["evidence_confidence"]["score"]},
            is_llm=False
        )

        return {
            "case_id": self.case_id,
            "company_name": self.company_name,
            "research_question": self.research_question,
            "analysis_date": self.analysis_date,
            "active_draft": self.active_draft,
            "authoritative_rev_doc": self.authoritative_rev_doc,
            "ingest": ingest_res,
            "scout": scout_res,
            "quant": quant_res,
            "auditor": auditor_res,
            "sentinel": omissions_res,
            "devil": debates_res,
            "warden": warden_res,
            "editor": editor_res
        }

    def switch_authority(self, chosen_doc_id: str) -> Dict[str, Any]:
        """
        Switches the authoritative source for the revenue conflict (D1 vs D2).
        Live recomputes Quant metrics, Auditor verdicts, conflict status, and Evidence Confidence.
        """
        self.authoritative_rev_doc = chosen_doc_id
        quant_res = global_quant.compute_all_metrics(chosen_doc_id)
        auditor_res = global_auditor.run_auditor(self.active_draft, chosen_doc_id)
        warden_res = global_warden.assess_risks(self.active_draft)
        report_res = global_editor.compose_report(self.case_id)

        # Record action in audit log
        conn = get_connection()
        cursor = conn.cursor()
        audit_id = f"aud_{uuid.uuid4().hex[:8]}"
        cursor.execute(
            """
            INSERT INTO audit_log (id, timestamp, actor, action, payload_hash, summary)
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            (
                audit_id,
                datetime.utcnow().isoformat() + "Z",
                "Reviewer",
                "SWITCH_AUTHORITY",
                chosen_doc_id,
                f"Authority set to {chosen_doc_id}. Growth recomputed to {quant_res['summary']['growth_fy25']}%, Net margin to {quant_res['summary']['net_margin_fy25']}%."
            )
        )
        conn.commit()
        conn.close()

        global_bus.publish(
            sender="CaseState",
            recipient="UI",
            message_type=MessageType.FLAG,
            summary=f"Authoritative revenue source updated to {chosen_doc_id}. Growth is now {quant_res['summary']['growth_fy25']}% ({quant_res['summary']['growth_conclusion']}).",
            payload={"chosen_source": chosen_doc_id, "growth": quant_res["summary"]["growth_fy25"], "margin": quant_res["summary"]["net_margin_fy25"]},
            is_llm=False
        )

        return {
            "chosen_source": chosen_doc_id,
            "quant": quant_res,
            "auditor": auditor_res,
            "warden": warden_res,
            "report": report_res
        }

    def record_reviewer_action(
        self,
        action_type: str,
        reason: str,
        flag_id: Optional[str] = None,
        claim_id: Optional[str] = None,
        reviewer_name: str = "Senior Financial Analyst"
    ) -> Dict[str, Any]:
        action_id = f"act_{uuid.uuid4().hex[:8]}"
        ts = datetime.utcnow().isoformat() + "Z"

        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute(
            """
            INSERT INTO reviewer_actions (id, flag_id, claim_id, action_type, reason, reviewer, timestamp)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            (action_id, flag_id, claim_id, action_type, reason, reviewer_name, ts)
        )

        # Update flag status if applicable
        if flag_id:
            cursor.execute("UPDATE flags SET status = 'resolved' WHERE id = ?", (flag_id,))

        cursor.execute(
            """
            INSERT INTO audit_log (id, timestamp, actor, action, payload_hash, summary)
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            (f"aud_{action_id}", ts, reviewer_name, action_type.upper(), action_id, f"{action_type}: {reason}")
        )
        conn.commit()
        conn.close()

        global_bus.publish(
            sender="Reviewer",
            recipient="AuditLog",
            message_type=MessageType.FLAG,
            summary=f"Human Reviewer performed [{action_type}]: {reason}",
            payload={"action_id": action_id, "action_type": action_type, "reason": reason},
            is_llm=False
        )

        return {"status": "success", "action_id": action_id, "timestamp": ts}

global_case_state = CaseStateManager()

if __name__ == "__main__":
    res = global_case_state.run_full_pipeline("draft_a", "D1")
    print("\nCase State Pipeline Completed:")
    print("  Claims:", res["auditor"]["counts"])
    print("  Confidence:", res["warden"]["evidence_confidence"]["score"], "%")

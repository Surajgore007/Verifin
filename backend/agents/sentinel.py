import os
import re
import json
from typing import Dict, Any, List, Optional
from backend.core.db import get_connection
from backend.core.message_bus import global_bus
from backend.models.enums import MessageType

CHECKLIST_SPECS = [
    {
        "id": "going_concern",
        "title": "Going-Concern Language",
        "keywords": ["going concern", "substantial doubt", "liquidity shortfall", "working capital deficit", "ability to continue"],
        "sections": ["Item 1A. Risk Factors", "Item 7. MD&A", "Note: Going Concern", "General / Overview"],
        "severity": "HIGH",
        "desc": "Substantial doubt or warnings regarding the ability to continue as a going concern"
    },
    {
        "id": "material_weakness",
        "title": "Material Weakness in Internal Control",
        "keywords": ["material weakness", "internal control over financial reporting", "ineffective", "remediation plan", "deficiencies in internal control"],
        "sections": ["Item 9A. Controls and Procedures", "Item 1A. Risk Factors"],
        "severity": "HIGH",
        "desc": "Adverse findings or material weaknesses identified in financial reporting controls"
    },
    {
        "id": "legal_proceedings",
        "title": "Legal Proceedings & Contingent Liabilities",
        "keywords": ["legal proceeding", "litigation", "contingencies", "contingent", "regulatory inquiry", "subpoena", "tax dispute", "lawsuit", "arbitration"],
        "sections": ["Item 3. Legal Proceedings", "Note: Commitments and Contingencies", "Item 1A. Risk Factors"],
        "severity": "HIGH",
        "desc": "Pending lawsuits, material regulatory investigations, or contingent liabilities"
    },
    {
        "id": "related_party",
        "title": "Related Party Transactions",
        "keywords": ["related party", "related parties", "promoter", "affiliate", "executive loan", "inter-corporate deposit", "director interest"],
        "sections": ["Note: Related Party Transactions", "Item 13. Certain Relationships"],
        "severity": "MEDIUM",
        "desc": "Non-arms-length transactions or loans involving executives, promoters, or affiliates"
    },
    {
        "id": "customer_concentration",
        "title": "Customer / Segment Concentration",
        "keywords": ["customer concentration", "single customer", "major customer", "concentration of credit", "accounted for 10%", "accounted for 20%", "accounted for 30%"],
        "sections": ["Note: Customer/Credit Concentration", "Item 1. Business", "Item 1A. Risk Factors"],
        "severity": "HIGH",
        "desc": "Over-dependence on a single customer or supplier exceeding 10% of total revenue"
    },
    {
        "id": "debt_covenants",
        "title": "Debt Maturities & Restrictive Covenants",
        "keywords": ["debt covenant", "covenants", "credit facility", "maturity profile", "event of default", "repayment schedule", "senior notes"],
        "sections": ["Note: Debt and Financing", "Item 7. MD&A"],
        "severity": "MEDIUM",
        "desc": "Upcoming debt refinancings, liquidity walls, or restrictive financial covenants"
    },
    {
        "id": "restatements",
        "title": "Restatements & Accounting Changes",
        "keywords": ["restatement", "restated", "accounting change", "retrospective revision", "correction of error", "change in estimate"],
        "sections": ["Item 8. Financial Statements", "General / Overview"],
        "severity": "HIGH",
        "desc": "Restatement of prior periods or material changes in accounting policies"
    },
    {
        "id": "subsequent_events",
        "title": "Subsequent Events",
        "keywords": ["subsequent event", "events after the reporting period", "subsequent to year end", "subsequent to the end of the fiscal year"],
        "sections": ["Note: Subsequent Events", "Item 8. Financial Statements"],
        "severity": "MEDIUM",
        "desc": "Material acquisitions, financing actions, or adverse developments post period-end"
    },
    {
        "id": "commitments",
        "title": "Off-Balance Sheet & Purchase Commitments",
        "keywords": ["purchase commitment", "unconditional purchase", "off-balance sheet", "contractual obligation", "capital commitment"],
        "sections": ["Note: Commitments and Contingencies", "Item 7. MD&A"],
        "severity": "LOW",
        "desc": "Unrecorded liabilities, long-term supply take-or-pay agreements, or capital commitments"
    },
    {
        "id": "auditor_opinion",
        "title": "Auditor Opinion Type",
        "keywords": ["report of independent", "unqualified opinion", "qualified opinion", "adverse opinion", "disclaimer of opinion", "audit report", "pwc", "deloitte", "ey", "kpmg"],
        "sections": ["Item 8. Financial Statements", "General / Overview"],
        "severity": "HIGH",
        "desc": "Independent auditor's report type and any explanatory paragraphs or modifications"
    }
]

class SentinelAgent:
    def __init__(self, db_path: Optional[str] = None):
        self.db_path = db_path

    def run_omission_radar(self, draft_text: str = "", draft_id: str = "draft_current") -> List[Dict[str, Any]]:
        conn = get_connection(self.db_path) if self.db_path else get_connection()
        cursor = conn.cursor()

        cursor.execute("SELECT id, doc_id, doc_title, page, section, text FROM passages")
        passages = [dict(r) for r in cursor.fetchall()]

        cursor.execute("DELETE FROM omissions")

        # If draft_text not provided, try loading from claims
        if not draft_text:
            cursor.execute("SELECT text_span FROM claims WHERE draft_id = ?", (draft_id,))
            claim_rows = cursor.fetchall()
            draft_text = " ".join(r["text_span"] for r in claim_rows)

        draft_lower = draft_text.lower()
        results = []

        for spec in CHECKLIST_SPECS:
            cid = spec["id"]
            title = spec["title"]
            keywords = spec["keywords"]
            target_sections = spec["sections"]

            # 1. Search for disclosure in ingested filings
            matched_passage = None
            for p in passages:
                text_lower = p["text"].lower()
                sec = p.get("section", "")
                # Check keyword match
                if any(kw in text_lower for kw in keywords):
                    matched_passage = p
                    break

            if matched_passage:
                # Check if draft mentions this topic
                is_addressed = any(kw in draft_lower for kw in keywords[:3])
                status = "Addressed" if is_addressed else "Disclosed but not mentioned in draft"
                snippet = matched_passage["text"][:160] + "..."

                # Extract potential amounts mentioned
                amt_match = re.search(r"(\$?\d[\d,]*\.?\d*\s*(?:billion|million|crore|cr|%)?)", matched_passage["text"])
                amt_str = amt_match.group() if amt_match else "Material"

                explanation = (
                    f"Disclosed in {matched_passage['doc_title']} ({matched_passage.get('section', 'Notes')}): \"{snippet}\". "
                    + ("Draft explicitly addresses this disclosure." if is_addressed else "The draft FAILS to mention this disclosure, omitting material context.")
                )

                om_id = f"om_{cid}"
                cursor.execute("""
                    INSERT INTO omissions (id, checklist_id, checklist_title, status, disclosed_in_doc_id,
                                           disclosed_in_doc_title, disclosed_page, disclosed_section,
                                           passage_id, highlight_text, amount_text, severity, explanation)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    om_id, cid, title, status, matched_passage["doc_id"], matched_passage["doc_title"],
                    matched_passage.get("page", 1), matched_passage.get("section", "Disclosure Note"),
                    matched_passage["id"], snippet, amt_str, spec["severity"], explanation
                ))

                results.append({
                    "id": om_id,
                    "checklist_id": cid,
                    "checklist_title": title,
                    "status": status,
                    "disclosed_in": matched_passage["doc_title"],
                    "page": matched_passage.get("page", 1),
                    "section": matched_passage.get("section", "Disclosure Note"),
                    "severity": spec["severity"],
                    "snippet": snippet,
                    "explanation": explanation
                })
            else:
                status = "Not found in provided documents"
                om_id = f"om_{cid}"
                explanation = f"No disclosure found in provided documents regarding {title.lower()}."
                cursor.execute("""
                    INSERT INTO omissions (id, checklist_id, checklist_title, status, disclosed_in_doc_id,
                                           disclosed_in_doc_title, disclosed_page, disclosed_section,
                                           passage_id, highlight_text, amount_text, severity, explanation)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    om_id, cid, title, status, None, None, None, None, None, None, None, "LOW", explanation
                ))

                results.append({
                    "id": om_id,
                    "checklist_id": cid,
                    "checklist_title": title,
                    "status": status,
                    "severity": "LOW",
                    "explanation": explanation
                })

        conn.commit()
        conn.close()

        omitted_count = sum(1 for r in results if r["status"] == "Disclosed but not mentioned in draft")
        global_bus.publish(
            sender="Sentinel",
            recipient="Warden",
            message_type=MessageType.FLAG,
            summary=f"Omission Radar executed across 10 checklist categories. Found {omitted_count} material omissions in draft.",
            payload={"checklist_count": len(results), "omitted_count": omitted_count},
            is_llm=False
        )

        return results

global_sentinel = SentinelAgent()

if __name__ == "__main__":
    sentinel = SentinelAgent()
    res = sentinel.run_omission_radar()
    print(f"Omission Radar evaluated {len(res)} checklist items:")
    for r in res:
        print(f"  [{r['status']}] {r['checklist_title']}")

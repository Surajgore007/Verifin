import re
import json
from typing import List, Dict, Any, Optional
from backend.core.db import get_connection
from backend.core.message_bus import global_bus
from backend.models.enums import MessageType
from backend.core.llm_provider import query_llm

CANONICAL_METRICS = [
    "revenue", "gross_profit", "operating_income", "net_income", "eps",
    "total_assets", "total_liabilities", "equity", "current_assets", "current_liabilities",
    "cash", "total_debt", "operating_cash_flow", "capex", "free_cash_flow",
    "gross_margin", "operating_margin", "net_margin", "current_ratio", "debt_to_equity",
    "revenue_growth", "net_income_growth", "revenue_per_employee", "headcount"
]

class ExtractorAgent:
    def __init__(self, db_path: Optional[str] = None):
        self.db_path = db_path

    def extract_claims(self, draft_text: str, draft_id: str = "draft_current") -> List[Dict[str, Any]]:
        """
        Extracts atomic verifiable claims from any financial draft using schema-constrained LLM,
        with deterministic regex sentence parsing fallback.
        """
        prompt = f"""You are a senior financial research tie-out auditor.
Deconstruct the following financial draft into atomic verifiable claims. Each sentence or distinct assertion should be an individual claim.
Identify:
1. sentence_index (integer starting at 0)
2. text_span (the exact sentence or assertion)
3. claim_type ("financial_metric", "trend", "risk_disclosure", "accounting_note", "strategic")
4. metric (canonical metric like revenue, net_income, gross_margin, net_margin, current_ratio, debt_to_equity, revenue_growth, headcount, or null if qualitative)
5. period (e.g. "FY2025", "FY2024", "Q4 2025", or null)
6. asserted_value (e.g. "$416.2B", "26.9%", "6.1%", "$7.46", "38%", or null)
7. stated_precision ("approximate" for phrases like 'about', 'roughly', 'approx'; "standard" for normal 1-2 decimal figures; "exact" for multi-decimal figures)
8. source_citation_text (any cited document, page, or footnote like "10-K", "p. 42", "Item 8", or null)

DRAFT TEXT:
\"\"\"
{draft_text}
\"\"\"

Respond with ONLY a valid JSON array of claim objects matching this schema. No markdown prose around it."""

        claims = []
        try:
            resp = query_llm(prompt, temperature=0.1)
            clean = resp.strip()
            if "```json" in clean:
                clean = clean.split("```json")[1].split("```")[0].strip()
            elif "```" in clean:
                clean = clean.split("```")[1].split("```")[0].strip()
            parsed = json.loads(clean)
            if isinstance(parsed, list) and len(parsed) > 0:
                for idx, c in enumerate(parsed):
                    claims.append({
                        "id": f"claim_{draft_id}_{idx+1}",
                        "draft_id": draft_id,
                        "sentence_index": c.get("sentence_index", idx),
                        "text_span": c.get("text_span", "").strip(),
                        "claim_type": c.get("claim_type", "financial_metric"),
                        "metric": c.get("metric"),
                        "period": c.get("period"),
                        "asserted_value": str(c.get("asserted_value")) if c.get("asserted_value") is not None else None,
                        "stated_precision": c.get("stated_precision", "standard"),
                        "source_citation_text": c.get("source_citation_text")
                    })
        except Exception:
            pass

        # Deterministic regex sentence parsing fallback if LLM returned nothing
        if not claims:
            # Split text into sentences
            sentences = [s.strip() for s in re.split(r"(?<=[.!?])\s+", draft_text) if len(s.strip()) > 15]
            for idx, s in enumerate(sentences):
                # Detect metric
                s_lower = s.lower()
                detected_metric = None
                for m in CANONICAL_METRICS:
                    if m.replace("_", " ") in s_lower or m in s_lower:
                        detected_metric = m
                        break
                if not detected_metric:
                    if "sales" in s_lower or "turnover" in s_lower:
                        detected_metric = "revenue"
                    elif "profit" in s_lower or "pat" in s_lower or "earnings" in s_lower:
                        detected_metric = "net_income"
                    elif "margin" in s_lower:
                        detected_metric = "net_margin"

                # Detect period
                period_match = re.search(r"\b(FY\s*20\d\d|Q[1-4]\s*20\d\d|20\d\d)\b", s, re.IGNORECASE)
                period_str = period_match.group().replace(" ", "").upper() if period_match else None

                # Detect asserted value
                val_match = re.search(r"(\$?\d[\d,]*\.?\d*\s*(?:billion|million|crore|cr|lakh|%)?|\b\d+\.?\d*%)", s, re.IGNORECASE)
                val_str = val_match.group() if val_match else None

                # Detect precision
                stated_prec = "standard"
                if any(w in s_lower for w in ["about", "approx", "roughly", "nearly", "around"]):
                    stated_prec = "approximate"
                elif val_str and "." in val_str and len(val_str.split(".")[1]) >= 2:
                    stated_prec = "exact"

                claims.append({
                    "id": f"claim_{draft_id}_{idx+1}",
                    "draft_id": draft_id,
                    "sentence_index": idx,
                    "text_span": s,
                    "claim_type": "financial_metric" if detected_metric else "narrative",
                    "metric": detected_metric,
                    "period": period_str,
                    "asserted_value": val_str,
                    "stated_precision": stated_prec,
                    "source_citation_text": None
                })

        # Save extracted claims to SQLite
        conn = get_connection(self.db_path) if self.db_path else get_connection()
        cursor = conn.cursor()
        cursor.execute("DELETE FROM claims WHERE draft_id = ?", (draft_id,))
        for c in claims:
            cursor.execute("""
                INSERT INTO claims (id, draft_id, text_span, claim_type, metric, period, asserted_value, sentence_index, source_citation_text, stated_precision)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                c["id"], c["draft_id"], c["text_span"], c["claim_type"], c["metric"],
                c["period"], c["asserted_value"], c["sentence_index"], c["source_citation_text"],
                c["stated_precision"]
            ))
        conn.commit()
        conn.close()

        global_bus.publish(
            sender="Extractor",
            recipient="Auditor",
            message_type=MessageType.CLAIM_SET,
            summary=f"Extracted {len(claims)} atomic claims from draft '{draft_id}'",
            payload={"claims_count": len(claims), "draft_id": draft_id},
            is_llm=True
        )

        return claims

global_extractor = ExtractorAgent()

if __name__ == "__main__":
    extractor = ExtractorAgent()
    sample = "Apple Inc. reported total revenue of $416.2 billion in FY2025, reflecting solid growth. Gross margin reached about 46.9%, while net profit margin expanded to 26.9%. Diluted earnings per share rose to $7.46."
    res = extractor.extract_claims(sample)
    print(f"Extracted {len(res)} claims:")
    for c in res:
        print(f"  [{c['id']}] {c['metric']} ({c['period']}): asserted='{c['asserted_value']}' (precision: {c['stated_precision']}) -> \"{c['text_span']}\"")

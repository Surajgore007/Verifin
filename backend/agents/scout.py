import re
import json
from typing import List, Dict, Any, Optional
from rank_bm25 import BM25Okapi
from backend.core.db import get_connection
from backend.core.message_bus import global_bus
from backend.models.enums import MessageType
from backend.core.llm_provider import query_llm

def tokenize(text: str) -> List[str]:
    return [w.lower() for w in re.findall(r"\w+", text)]

class ScoutAgent:
    def __init__(self, db_path: Optional[str] = None):
        self.db_path = db_path
        self._load_corpus()

    def _load_corpus(self):
        conn = get_connection(self.db_path) if self.db_path else get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT id, doc_id, doc_title, page, section, text, date, bbox FROM passages")
        rows = cursor.fetchall()
        conn.close()

        self.passages = []
        for r in rows:
            d = dict(r)
            if d.get("bbox") and isinstance(d["bbox"], str):
                try:
                    d["bbox"] = json.loads(d["bbox"])
                except Exception:
                    pass
            self.passages.append(d)

        if self.passages:
            self.tokenized_corpus = [tokenize(p["text"]) for p in self.passages]
            self.bm25 = BM25Okapi(self.tokenized_corpus)
        else:
            self.tokenized_corpus = []
            self.bm25 = None

    def generate_subqueries(self, main_question: str) -> List[Dict[str, str]]:
        """
        Decomposes main research question into structured financial sub-queries using Groq LLM
        with robust deterministic fallback.
        """
        prompt = f"""You are an institutional financial analyst. Decompose the following research question into 4 targeted search sub-queries to retrieve relevant facts from SEC filings (10-K, 10-Q, 8-K) and financial tables.
Research Question: "{main_question}"

Respond with ONLY a valid JSON array of objects with keys: "topic", "subquery", "description".
Example:
[
  {{"topic": "revenue_growth", "subquery": "total revenue net sales year over year growth trajectory", "description": "Top-line revenue expansion"}},
  {{"topic": "profitability", "subquery": "operating income net margin profit after tax compression", "description": "Operating earnings and margin quality"}},
  {{"topic": "liquidity", "subquery": "current assets current liabilities working capital ratio debt", "description": "Solvency and short-term liquidity"}},
  {{"topic": "disclosures_risks", "subquery": "going concern litigation contingencies related party concentration", "description": "Material risk factors and accounting notes"}}
]"""
        try:
            resp = query_llm(prompt, temperature=0.1)
            clean = resp.strip()
            if "```json" in clean:
                clean = clean.split("```json")[1].split("```")[0].strip()
            elif "```" in clean:
                clean = clean.split("```")[1].split("```")[0].strip()
            parsed = json.loads(clean)
            if isinstance(parsed, list) and len(parsed) >= 2:
                return parsed
        except Exception:
            pass

        # Deterministic fallback
        return [
            {
                "topic": "revenue_growth",
                "subquery": "revenue from operations annual growth top line turnover FY2025 FY2024",
                "description": "Historical top-line expansion and sales trajectory"
            },
            {
                "topic": "profitability",
                "subquery": "net income operating income gross profit margins EPS",
                "description": "Operating earnings quality and bottom-line margin trends"
            },
            {
                "topic": "liquidity",
                "subquery": "current assets current liabilities working capital cash marketable securities",
                "description": "Short-term solvency and working capital coverage"
            },
            {
                "topic": "risks_disclosures",
                "subquery": "going concern litigation tax dispute debt covenants customer concentration notes",
                "description": "Disclosures, governance and risk factors"
            }
        ]

    def retrieve(self, query: str, top_k: int = 5) -> List[Dict[str, Any]]:
        self._load_corpus()
        if not self.passages or not self.bm25:
            return []

        q_tokens = tokenize(query)
        scores = self.bm25.get_scores(q_tokens)

        # Section-aware scoring boost
        q_lower = query.lower()
        for idx, p in enumerate(self.passages):
            sec = p.get("section", "").lower()
            if any(k in q_lower for k in ["risk", "litigation", "dispute", "contingency", "going concern"]):
                if any(k in sec for k in ["risk", "legal", "contingenc", "going concern", "note"]):
                    scores[idx] *= 1.4
            elif any(k in q_lower for k in ["revenue", "margin", "profit", "income", "asset", "liability"]):
                if any(k in sec for k in ["financial statement", "md&a", "item 8", "item 7"]):
                    scores[idx] *= 1.3

        ranked_indices = sorted(range(len(scores)), key=lambda i: scores[i], reverse=True)
        results = []
        for idx in ranked_indices[:top_k]:
            p = self.passages[idx].copy()
            p["score"] = round(float(scores[idx]), 3)
            results.append(p)
        return results

    def run_scout_pipeline(self, research_question: str) -> Dict[str, Any]:
        subqueries = self.generate_subqueries(research_question)
        retrieved_by_topic = {}

        global_bus.publish(
            sender="Scout",
            recipient="CaseState",
            message_type=MessageType.REQUEST,
            summary=f"Decomposed question into {len(subqueries)} investigative sub-queries",
            payload={"subqueries": subqueries},
            is_llm=True
        )

        for sq in subqueries:
            topic = sq["topic"]
            hits = self.retrieve(sq["subquery"], top_k=3)
            retrieved_by_topic[topic] = hits

            first_hit = hits[0] if hits else None
            top_source = f"{first_hit['doc_title']} (p. {first_hit['page']})" if first_hit else "None"
            global_bus.publish(
                sender="Scout",
                recipient="Auditor",
                message_type=MessageType.EVIDENCE,
                summary=f"Retrieved {len(hits)} passages for {topic}: {sq['subquery'][:45]}... (Top hit: {top_source})",
                payload={
                    "topic": topic,
                    "subquery": sq["subquery"],
                    "hits_count": len(hits),
                    "top_evidence_id": first_hit["id"] if first_hit else None,
                    "top_evidence_snippet": first_hit["text"][:160] + "..." if first_hit else ""
                },
                referenced_ids=[h["id"] for h in hits],
                is_llm=False
            )

        return {
            "status": "success",
            "subqueries": subqueries,
            "retrieved_evidence": retrieved_by_topic
        }

global_scout = ScoutAgent()

if __name__ == "__main__":
    scout = ScoutAgent()
    res = scout.run_scout_pipeline("Analyze Apple's revenue trajectory, margins, and liquidity risks")
    print("Scout execution complete. Subqueries:", len(res["subqueries"]))

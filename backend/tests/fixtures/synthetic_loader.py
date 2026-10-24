import os
import json
import sqlite3
from typing import Dict, Any, Optional
from backend.core.db import get_connection, init_db

FIXTURES_DIR = os.path.dirname(__file__)
MERIDIAN_DIR = os.path.join(FIXTURES_DIR, "synthetic_meridian", "documents")

def load_synthetic_test_pack(db_path: Optional[str] = None):
    """
    Ingests the synthetic Meridian pack with known ground truth for automated regression testing.
    """
    init_db(db_path) if db_path else init_db()
    conn = get_connection(db_path)
    cursor = conn.cursor()

    cursor.execute("DELETE FROM passages")
    cursor.execute("DELETE FROM table_cells")
    cursor.execute("DELETE FROM facts")
    cursor.execute("DELETE FROM documents")

    doc_files = sorted([f for f in os.listdir(MERIDIAN_DIR) if f.endswith(".json")])
    for filename in doc_files:
        filepath = os.path.join(MERIDIAN_DIR, filename)
        with open(filepath, "r", encoding="utf-8") as f:
            data = json.load(f)

        meta = data["meta"]
        cursor.execute(
            """
            INSERT INTO documents (id, title, type, publication_date, source_note, authority_rank)
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            (meta["id"], meta["title"], meta["type"], meta["publication_date"], meta.get("source_note", ""), meta.get("authority_rank", 3))
        )

        for p in data.get("passages", []):
            text = p["text"]
            cursor.execute(
                """
                INSERT INTO passages (id, doc_id, doc_title, page, section, text, char_start, char_end, date)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (p["id"], meta["id"], meta["title"], p["page"], p["section"], text, 0, len(text), meta["publication_date"])
            )

        for table in data.get("tables", []):
            table_name = table["table_name"]
            page = table["page"]
            for row in table.get("rows", []):
                row_label = row["row_label"]
                for cell in row.get("cells", []):
                    cell_id = cell["id"]
                    col_label = cell["column_label"]
                    raw_val = cell["raw_value"]
                    unit = cell.get("unit", "INR crore")
                    period = cell.get("period", col_label)
                    parsed_val = cell.get("parsed_value")
                    if parsed_val is None:
                        clean = str(raw_val).replace(",", "").replace("%", "").strip()
                        try:
                            parsed_val = float(clean)
                        except Exception:
                            parsed_val = 0.0

                    cursor.execute(
                        """
                        INSERT INTO table_cells (id, doc_id, page, table_name, row_label, column_label, raw_value, parsed_value, unit, period)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                        """,
                        (cell_id, meta["id"], page, table_name, row_label, col_label, raw_val, parsed_val, unit, period)
                    )

                    metric_key = None
                    lbl = row_label.lower()
                    if "revenue" in lbl:
                        metric_key = "revenue"
                    elif "net profit" in lbl or "pat" in lbl:
                        metric_key = "net_profit"
                    elif "borrowing" in lbl or "debt" in lbl:
                        metric_key = "borrowings"
                    elif "equity" in lbl:
                        metric_key = "equity"
                    elif "current asset" in lbl:
                        metric_key = "current_assets"
                    elif "current liabilit" in lbl:
                        metric_key = "current_liabilities"
                    elif "operating" in lbl and "cash" in lbl:
                        metric_key = "operating_cash_flow"
                    elif "capex" in lbl:
                        metric_key = "capex"
                    elif "headcount" in lbl:
                        metric_key = "headcount"

                    if metric_key:
                        fact_id = f"fact_{cell_id}"
                        is_auth = 1 if meta.get("authority_rank") == 1 else 0
                        cursor.execute(
                            """
                            INSERT INTO facts (id, metric, canonical_metric, value, unit, period, doc_id, doc_title, cell_id, passage_id, page, section, as_of_date, is_authoritative)
                            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                            """,
                            (fact_id, metric_key, metric_key, parsed_val, unit, period, meta["id"], meta["title"], cell_id, None, page, f"{table_name} - {row_label}", meta["publication_date"], is_auth)
                        )

    # Load drafts and claims from draft_fixture.json
    draft_file = os.path.join(FIXTURES_DIR, "synthetic_meridian", "draft_fixture.json")
    if os.path.exists(draft_file):
        with open(draft_file, "r", encoding="utf-8") as f:
            draft_data = json.load(f)

        cursor.execute("DELETE FROM drafts")
        cursor.execute("DELETE FROM claims")

        cursor.execute(
            """
            INSERT INTO drafts (id, company_name, research_question, full_text, created_at)
            VALUES (?, ?, ?, ?, ?)
            """,
            (draft_data.get("draft_id", "draft_a"), draft_data.get("company_name", "Meridian"),
             draft_data.get("research_question", ""), draft_data.get("full_text", ""), "2026-10-24T00:00:00Z")
        )

        for c in draft_data.get("claims", []):
            for d_id in ["draft_a", "draft_current"]:
                cursor.execute(
                    """
                    INSERT INTO claims (id, draft_id, text_span, claim_type, metric, period, asserted_value, sentence_index, source_citation_text, stated_precision)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    (f"{c['id']}_{d_id}" if d_id != "draft_a" else c["id"],
                     d_id, c["text_span"], c["claim_type"], c.get("metric"),
                     c.get("period"), c.get("asserted_value"), c.get("sentence_index", 1),
                     c.get("source_citation_text", ""), "standard")
                )

    conn.commit()
    conn.close()

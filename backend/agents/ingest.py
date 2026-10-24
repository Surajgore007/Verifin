import os
import re
import json
from typing import Dict, Any, List, Optional
from backend.core.db import get_connection, init_db
from backend.core.message_bus import global_bus
from backend.models.enums import MessageType
from backend.core.edgar import get_cik_for_ticker, get_recent_filings, fetch_filing_document
from backend.core.parser import parse_html_filing, parse_pdf_document, map_row_label_to_metric
from backend.core.xbrl_verifier import verify_facts_against_sec_xbrl
from backend.tests.fixtures.synthetic_loader import load_synthetic_test_pack

def normalize_unit(raw_text: str, default_unit: str = "INR crore") -> tuple[float, str]:
    """
    Normalizes numeric strings and units deterministically.
    Returns (normalized_value, normalized_unit).
    """
    if isinstance(raw_text, (int, float)):
        return float(raw_text), default_unit

    cleaned = raw_text.replace(",", "").strip()
    match = re.search(r"[-+]?\d*\.?\d+", cleaned)
    if not match:
        raise ValueError(f"Could not extract numeric value from '{raw_text}'")

    val = float(match.group())
    lower = raw_text.lower()

    if "lakh" in lower:
        return round(val / 100.0, 4), "INR crore"
    elif "million" in lower:
        return round(val * 0.1, 4), "INR crore"
    elif "billion" in lower:
        return round(val * 100.0, 4), "INR crore"
    elif "%" in raw_text or "percent" in lower:
        return val, "%"
    elif "employee" in lower:
        return val, "employees"
    else:
        return val, default_unit

def run_ingest(db_path: Optional[str] = None):
    """Alias for loading test pack during automated test runs"""
    return load_synthetic_test_pack(db_path)

def ingest_sec_filing(ticker: str, form_type: str = "10-K", db_path: Optional[str] = None) -> Dict[str, Any]:
    """
    Fetches and ingests a real SEC EDGAR filing for any ticker.
    Parses iXBRL / HTML into passages, tables, and Fact Ledger.
    """
    init_db()
    conn = get_connection(db_path) if db_path else get_connection()
    cursor = conn.cursor()

    cik = get_cik_for_ticker(ticker)
    if not cik:
        return {"status": "error", "message": f"Ticker '{ticker}' not found in SEC EDGAR directory."}

    filings = get_recent_filings(cik, [form_type])
    if not filings:
        return {"status": "error", "message": f"No recent {form_type} filings found for {ticker} (CIK {cik})."}

    filing = filings[0]
    acc_num = filing["accession_number"]
    primary_doc = filing["primary_document"]
    filing_date = filing["filing_date"]

    # Fetch document content (cached on disk)
    html_text = fetch_filing_document(cik, acc_num, primary_doc)

    doc_id = f"doc_{ticker.lower()}_{form_type.lower()}_{acc_num.replace('-', '')[:8]}"
    doc_title = f"{ticker.upper()} Form {form_type} ({filing_date})"

    # Clean existing data for this doc_id
    cursor.execute("DELETE FROM passages WHERE doc_id = ?", (doc_id,))
    cursor.execute("DELETE FROM table_cells WHERE doc_id = ?", (doc_id,))
    cursor.execute("DELETE FROM facts WHERE doc_id = ?", (doc_id,))
    cursor.execute("DELETE FROM documents WHERE id = ?", (doc_id,))

    cursor.execute("""
        INSERT INTO documents (id, title, type, publication_date, source_note, authority_rank, ticker, cik, form_type, accession_number, file_format)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        doc_id,
        doc_title,
        f"SEC {form_type} Filing",
        filing_date,
        f"Official SEC EDGAR Accession {acc_num}",
        1 if form_type == "10-K" else 2,
        ticker.upper(),
        cik,
        form_type,
        acc_num,
        "ixbrl"
    ))

    # Parse HTML / iXBRL
    parsed = parse_html_filing(html_text, doc_id, doc_title)

    # Insert passages
    for p in parsed["passages"]:
        cursor.execute("""
            INSERT INTO passages (id, doc_id, doc_title, page, section, text, char_start, char_end, date)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (p["id"], doc_id, doc_title, p["page"], p["section"], p["text"], p["char_start"], p["char_end"], filing_date))

    # Insert table cells
    for c in parsed["table_cells"]:
        cursor.execute("""
            INSERT INTO table_cells (id, doc_id, page, table_name, row_label, column_label, raw_value, parsed_value, unit, period)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (c["id"], doc_id, c["page"], c["table_name"], c["row_label"], c["column_label"], c["raw_value"], c["parsed_value"], c["unit"], c["period"]))

    # Insert facts into Fact Ledger
    for f in parsed["facts"]:
        cursor.execute("""
            INSERT INTO facts (id, metric, canonical_metric, value, unit, period, doc_id, doc_title, cell_id, passage_id, page, section, as_of_date, xbrl_tag, extraction_method, confidence, is_authoritative)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            f["id"],
            f["metric"],
            f["canonical_metric"],
            f["value"],
            f["unit"],
            f["period"],
            doc_id,
            doc_title,
            f["cell_id"],
            f["passage_id"],
            f["page"],
            f["section"],
            filing_date,
            f["xbrl_tag"],
            f["extraction_method"],
            f["confidence"],
            1
        ))

    conn.commit()
    conn.close()

    # Perform XBRL cross-check
    xbrl_results = verify_facts_against_sec_xbrl(cik, ticker, db_path)

    summary = f"Ingested {doc_title}: {len(parsed['passages'])} passages, {len(parsed['table_cells'])} table cells, {len(parsed['facts'])} facts. SEC XBRL cross-check match rate: {xbrl_results.get('match_rate', 0)}%."
    global_bus.publish(
        sender="Ingest",
        recipient="Scout",
        message_type=MessageType.EVIDENCE,
        summary=summary,
        payload={
            "ticker": ticker.upper(),
            "doc_id": doc_id,
            "passages": len(parsed["passages"]),
            "table_cells": len(parsed["table_cells"]),
            "facts": len(parsed["facts"]),
            "xbrl_match_rate": xbrl_results.get("match_rate")
        },
        is_llm=False
    )

    return {
        "status": "success",
        "doc_id": doc_id,
        "title": doc_title,
        "passages_count": len(parsed["passages"]),
        "table_cells_count": len(parsed["table_cells"]),
        "facts_count": len(parsed["facts"]),
        "xbrl_match_rate": xbrl_results.get("match_rate")
    }

def ingest_uploaded_file(file_path: str, title: Optional[str] = None, db_path: Optional[str] = None) -> Dict[str, Any]:
    """
    Parses any uploaded PDF, HTML, TXT, or DOCX file into the Fact Ledger and passage store.
    """
    init_db()
    conn = get_connection(db_path) if db_path else get_connection()
    cursor = conn.cursor()

    filename = os.path.basename(file_path)
    doc_id = f"upload_{re.sub(r'[^a-zA-Z0-9_]', '_', filename)[:20]}"
    doc_title = title or filename
    ext = os.path.splitext(filename)[-1].lower()

    if ext == ".pdf":
        parsed = parse_pdf_document(file_path, doc_id, doc_title)
        if parsed.get("is_scanned"):
            return {
                "status": "rejected",
                "error": "scanned document, not supported",
                "message": "The PDF does not contain selectable digital text. Scanned images are not supported."
            }

        cursor.execute("""
            INSERT OR REPLACE INTO documents (id, title, type, publication_date, source_note, authority_rank, file_path, file_format)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """, (doc_id, doc_title, "Uploaded PDF", "Current", f"Uploaded file: {filename}", 2, file_path, "pdf"))

        for p in parsed["passages"]:
            bbox_json = json.dumps(p.get("bbox")) if p.get("bbox") else None
            cursor.execute("""
                INSERT INTO passages (id, doc_id, doc_title, page, section, text, char_start, char_end, date, bbox)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (p["id"], doc_id, doc_title, p["page"], p["section"], p["text"], p["char_start"], p["char_end"], "", bbox_json))

        for c in parsed["table_cells"]:
            cursor.execute("""
                INSERT INTO table_cells (id, doc_id, page, table_name, row_label, column_label, raw_value, parsed_value, unit, period)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (c["id"], doc_id, c["page"], c["table_name"], c["row_label"], c["column_label"], c["raw_value"], c["parsed_value"], c["unit"], c["period"]))

        for f in parsed["facts"]:
            cursor.execute("""
                INSERT INTO facts (id, metric, canonical_metric, value, unit, period, doc_id, doc_title, cell_id, passage_id, page, section, as_of_date, xbrl_tag, extraction_method, confidence, is_authoritative)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                f["id"], f["metric"], f["canonical_metric"], f["value"], f["unit"], f["period"],
                doc_id, doc_title, f["cell_id"], f["passage_id"], f["page"], f["section"], "",
                f.get("xbrl_tag"), f.get("extraction_method", "pdf_table"), f.get("confidence", 0.9), 1
            ))

        conn.commit()
        conn.close()

        return {
            "status": "success",
            "doc_id": doc_id,
            "title": doc_title,
            "passages_count": len(parsed["passages"]),
            "table_cells_count": len(parsed["table_cells"]),
            "facts_count": len(parsed["facts"])
        }

    elif ext in [".htm", ".html"]:
        with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
            html_text = f.read()
        parsed = parse_html_filing(html_text, doc_id, doc_title)

        cursor.execute("""
            INSERT OR REPLACE INTO documents (id, title, type, publication_date, source_note, authority_rank, file_path, file_format)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """, (doc_id, doc_title, "Uploaded HTML", "Current", f"Uploaded file: {filename}", 2, file_path, "html"))

        for p in parsed["passages"]:
            cursor.execute("""
                INSERT INTO passages (id, doc_id, doc_title, page, section, text, char_start, char_end, date)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (p["id"], doc_id, doc_title, p["page"], p["section"], p["text"], p["char_start"], p["char_end"], ""))

        for c in parsed["table_cells"]:
            cursor.execute("""
                INSERT INTO table_cells (id, doc_id, page, table_name, row_label, column_label, raw_value, parsed_value, unit, period)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (c["id"], doc_id, c["page"], c["table_name"], c["row_label"], c["column_label"], c["raw_value"], c["parsed_value"], c["unit"], c["period"]))

        for f in parsed["facts"]:
            cursor.execute("""
                INSERT INTO facts (id, metric, canonical_metric, value, unit, period, doc_id, doc_title, cell_id, passage_id, page, section, as_of_date, xbrl_tag, extraction_method, confidence, is_authoritative)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                f["id"], f["metric"], f["canonical_metric"], f["value"], f["unit"], f["period"],
                doc_id, doc_title, f["cell_id"], f["passage_id"], f["page"], f["section"], "",
                f.get("xbrl_tag"), f.get("extraction_method", "table"), f.get("confidence", 0.95), 1
            ))

        conn.commit()
        conn.close()

        return {
            "status": "success",
            "doc_id": doc_id,
            "title": doc_title,
            "passages_count": len(parsed["passages"]),
            "table_cells_count": len(parsed["table_cells"]),
            "facts_count": len(parsed["facts"])
        }

    else:
        # Fallback for plain text
        with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
            text = f.read()

        cursor.execute("""
            INSERT OR REPLACE INTO documents (id, title, type, publication_date, source_note, authority_rank, file_path, file_format)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """, (doc_id, doc_title, "Uploaded Text", "Current", f"Uploaded file: {filename}", 3, file_path, "txt"))

        paragraphs = [p.strip() for p in text.split("\n\n") if len(p.strip()) > 30]
        char_offset = 0
        for idx, p in enumerate(paragraphs):
            cursor.execute("""
                INSERT INTO passages (id, doc_id, doc_title, page, section, text, char_start, char_end, date)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (f"p_{doc_id}_{idx}", doc_id, doc_title, 1, "Uploaded Text", p, char_offset, char_offset + len(p), ""))
            char_offset += len(p) + 2

        conn.commit()
        conn.close()

        return {
            "status": "success",
            "doc_id": doc_id,
            "title": doc_title,
            "passages_count": len(paragraphs),
            "table_cells_count": 0,
            "facts_count": 0
        }

if __name__ == "__main__":
    res = ingest_sec_filing("AAPL", "10-K")
    print("Ingest result for AAPL 10-K:", res)

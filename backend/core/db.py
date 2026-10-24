import sqlite3
import json
import os
from typing import Optional, Dict, Any, List

DB_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), "verifin.db")

def get_connection(db_path: Optional[str] = None) -> sqlite3.Connection:
    target_path = db_path if db_path is not None else DB_PATH
    conn = sqlite3.connect(target_path, timeout=30.0)
    conn.execute("PRAGMA journal_mode=WAL;")
    conn.row_factory = sqlite3.Row
    return conn

def init_db(db_path: str = DB_PATH):
    os.makedirs(os.path.dirname(db_path), exist_ok=True)
    conn = get_connection(db_path)
    cursor = conn.cursor()

    cursor.executescript("""
    CREATE TABLE IF NOT EXISTS documents (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        type TEXT NOT NULL,
        publication_date TEXT NOT NULL,
        source_note TEXT,
        authority_rank INTEGER DEFAULT 3,
        ticker TEXT,
        cik TEXT,
        form_type TEXT,
        accession_number TEXT,
        file_path TEXT,
        file_format TEXT DEFAULT 'html',
        is_scanned INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS passages (
        id TEXT PRIMARY KEY,
        doc_id TEXT NOT NULL,
        doc_title TEXT NOT NULL,
        page INTEGER NOT NULL,
        section TEXT NOT NULL,
        text TEXT NOT NULL,
        char_start INTEGER NOT NULL,
        char_end INTEGER NOT NULL,
        date TEXT NOT NULL,
        bbox TEXT, -- JSON [x0, y0, x1, y1] for PDF visual highlighting
        FOREIGN KEY(doc_id) REFERENCES documents(id)
    );

    CREATE TABLE IF NOT EXISTS table_cells (
        id TEXT PRIMARY KEY,
        doc_id TEXT NOT NULL,
        page INTEGER NOT NULL,
        table_name TEXT NOT NULL,
        row_label TEXT NOT NULL,
        column_label TEXT NOT NULL,
        raw_value TEXT NOT NULL,
        parsed_value REAL,
        unit TEXT DEFAULT 'USD million',
        period TEXT NOT NULL,
        xbrl_tag TEXT,
        bbox TEXT,
        FOREIGN KEY(doc_id) REFERENCES documents(id)
    );

    CREATE TABLE IF NOT EXISTS facts (
        id TEXT PRIMARY KEY,
        metric TEXT NOT NULL,
        canonical_metric TEXT,
        value REAL NOT NULL,
        unit TEXT NOT NULL,
        period TEXT NOT NULL,
        period_type TEXT DEFAULT 'annual', -- 'annual', 'quarterly', 'point_in_time'
        doc_id TEXT NOT NULL,
        doc_title TEXT NOT NULL,
        cell_id TEXT,
        passage_id TEXT,
        page INTEGER NOT NULL,
        section TEXT NOT NULL,
        as_of_date TEXT NOT NULL,
        xbrl_tag TEXT,
        bbox TEXT,
        extraction_method TEXT DEFAULT 'deterministic_table', -- 'xbrl', 'table', 'pdf_text', 'fuzzy'
        confidence REAL DEFAULT 1.0,
        is_authoritative INTEGER DEFAULT 1,
        FOREIGN KEY(doc_id) REFERENCES documents(id)
    );

    CREATE TABLE IF NOT EXISTS metrics (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        display_name TEXT NOT NULL,
        period TEXT NOT NULL,
        value REAL NOT NULL,
        unit TEXT NOT NULL,
        formula_text TEXT NOT NULL,
        input_fact_ids TEXT NOT NULL, -- JSON array
        input_values TEXT NOT NULL    -- JSON dict
    );

    CREATE TABLE IF NOT EXISTS drafts (
        id TEXT PRIMARY KEY,
        company_name TEXT NOT NULL,
        research_question TEXT,
        full_text TEXT NOT NULL,
        created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS claims (
        id TEXT PRIMARY KEY,
        draft_id TEXT NOT NULL DEFAULT 'draft_current',
        text_span TEXT NOT NULL,
        claim_type TEXT NOT NULL,
        metric TEXT,
        period TEXT,
        asserted_value TEXT,
        sentence_index INTEGER NOT NULL,
        source_citation_text TEXT,
        stated_precision TEXT DEFAULT 'standard' -- 'exact', 'standard', 'approximate'
    );

    CREATE TABLE IF NOT EXISTS verdicts (
        id TEXT PRIMARY KEY,
        claim_id TEXT NOT NULL,
        verdict TEXT NOT NULL, -- 'VERIFIED', 'CONFLICT', 'UNSUPPORTED', 'OUTDATED', 'NEEDS_REVIEW'
        recomputed_value REAL,
        recomputed_display TEXT,
        tolerance_passed INTEGER,
        evidence_fact_ids TEXT,     -- JSON array
        evidence_passage_ids TEXT,  -- JSON array
        evidence_doc_titles TEXT,   -- JSON array
        quote TEXT,
        quote_matched INTEGER,
        confidence_score REAL DEFAULT 1.0,
        rationale TEXT NOT NULL,
        method TEXT NOT NULL,
        highlight_bbox TEXT,        -- JSON bbox for UI source viewer
        page_number INTEGER,
        doc_id TEXT,
        FOREIGN KEY(claim_id) REFERENCES claims(id)
    );

    CREATE TABLE IF NOT EXISTS conflicts (
        id TEXT PRIMARY KEY,
        metric TEXT NOT NULL,
        period TEXT NOT NULL,
        fact_a_id TEXT NOT NULL,
        fact_b_id TEXT NOT NULL,
        source_a_title TEXT NOT NULL,
        source_b_title TEXT NOT NULL,
        source_a_date TEXT NOT NULL,
        source_b_date TEXT NOT NULL,
        value_a REAL NOT NULL,
        value_b REAL NOT NULL,
        difference REAL NOT NULL,
        suggested_authoritative_fact_id TEXT NOT NULL,
        chosen_authoritative_fact_id TEXT NOT NULL,
        impact_description TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS omissions (
        id TEXT PRIMARY KEY,
        checklist_id TEXT NOT NULL,
        checklist_title TEXT NOT NULL,
        status TEXT NOT NULL, -- 'addressed', 'disclosed_not_in_draft', 'not_found'
        disclosed_in_doc_id TEXT,
        disclosed_in_doc_title TEXT,
        disclosed_page INTEGER,
        disclosed_section TEXT,
        passage_id TEXT,
        highlight_text TEXT,
        amount_text TEXT,
        severity TEXT NOT NULL, -- 'HIGH', 'MEDIUM', 'LOW'
        explanation TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS flags (
        id TEXT PRIMARY KEY,
        kind TEXT NOT NULL,
        ref_id TEXT NOT NULL,
        title TEXT NOT NULL,
        materiality_score REAL NOT NULL,
        impact_text TEXT NOT NULL,
        status TEXT DEFAULT 'open',
        severity TEXT NOT NULL,
        is_top_3 INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS reviewer_actions (
        id TEXT PRIMARY KEY,
        flag_id TEXT,
        claim_id TEXT,
        action_type TEXT NOT NULL,
        reason TEXT NOT NULL,
        reviewer TEXT NOT NULL,
        timestamp TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS selftest_runs (
        id TEXT PRIMARY KEY,
        injection_type TEXT NOT NULL,
        original_claim TEXT NOT NULL,
        injected_claim TEXT NOT NULL,
        caught INTEGER NOT NULL,
        verdict_assigned TEXT,
        detection_detail TEXT NOT NULL,
        timestamp TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS audit_log (
        id TEXT PRIMARY KEY,
        timestamp TEXT NOT NULL,
        actor TEXT NOT NULL,
        action TEXT NOT NULL,
        payload_hash TEXT NOT NULL,
        summary TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS bus_messages (
        id TEXT PRIMARY KEY,
        timestamp TEXT NOT NULL,
        sender TEXT NOT NULL,
        recipient TEXT NOT NULL,
        message_type TEXT NOT NULL,
        summary TEXT NOT NULL,
        payload TEXT NOT NULL,
        referenced_ids TEXT,
        is_llm INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS debates (
        id TEXT PRIMARY KEY,
        devil_point_id TEXT NOT NULL,
        devil_challenge TEXT NOT NULL,
        devil_evidence_ids TEXT NOT NULL,
        devil_evidence_chips TEXT NOT NULL,
        auditor_response TEXT NOT NULL,
        auditor_rationale TEXT NOT NULL,
        auditor_evidence_ids TEXT NOT NULL,
        auditor_evidence_chips TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS xbrl_cross_checks (
        id TEXT PRIMARY KEY,
        ticker TEXT NOT NULL,
        metric TEXT NOT NULL,
        period TEXT NOT NULL,
        doc_value REAL NOT NULL,
        xbrl_api_value REAL NOT NULL,
        diff REAL NOT NULL,
        status TEXT NOT NULL, -- 'MATCH', 'DISCREPANCY', 'UNAVAILABLE'
        notes TEXT
    );

    CREATE TABLE IF NOT EXISTS benchmark_results (
        id TEXT PRIMARY KEY,
        benchmark_name TEXT NOT NULL, -- 'FinQA_subset', 'FinDVer_subset'
        sample_size INTEGER NOT NULL,
        accuracy REAL NOT NULL,
        abstention_rate REAL NOT NULL,
        false_positive_rate REAL NOT NULL,
        notes TEXT NOT NULL,
        timestamp TEXT NOT NULL
    );
    """)

    conn.commit()
    conn.close()

if __name__ == "__main__":
    init_db()
    print("Verifin database initialized successfully.")

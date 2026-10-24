import os
import json
import asyncio
from typing import Dict, Any, Optional, List
from fastapi import FastAPI, Query, HTTPException, Request, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, PlainTextResponse, FileResponse
from pydantic import BaseModel

from backend.core.db import get_connection, init_db
from backend.core.message_bus import global_bus
from backend.core.edgar import COMMON_TICKERS, get_cik_for_ticker
from backend.agents.ingest import ingest_sec_filing, ingest_uploaded_file
from backend.agents.scout import ScoutAgent
from backend.agents.quant import QuantAgent
from backend.agents.extractor import ExtractorAgent
from backend.agents.auditor import AuditorAgent
from backend.agents.sentinel import SentinelAgent
from backend.agents.devil import DevilAgent
from backend.agents.warden import WardenAgent
from backend.agents.scribe import global_scribe
from backend.agents.selftest import global_selftest
from backend.core.evaluation import run_benchmark_evaluation
from backend.core.exporter import export_xlsx, export_docx, export_markdown

app = FastAPI(
    title="Verifin API",
    description="Verifin: Trustworthy Multi-Agent Financial Research and Decision Support",
    version="2.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global instances
scout_agent = ScoutAgent()
quant_agent = QuantAgent()
extractor_agent = ExtractorAgent()
auditor_agent = AuditorAgent()
sentinel_agent = SentinelAgent()
devil_agent = DevilAgent()
warden_agent = WardenAgent()

active_company = "AAPL"
active_draft_title = "Apple Inc. FY2025 Financial Review & Tie-Out"
active_draft_text = ""

@app.on_event("startup")
async def startup_event():
    global active_company, active_draft_text
    init_db()
    # Check if documents exist in DB; if not, ingest AAPL
    conn = get_connection()
    c = conn.cursor()
    c.execute("SELECT COUNT(*) as cnt FROM documents")
    cnt = c.fetchone()["cnt"]
    conn.close()

    if cnt == 0:
        try:
            ingest_sec_filing("AAPL", "10-K")
            quant_agent.compute_all_metrics()
        except Exception as e:
            print(f"Startup ingest notice: {e}")

    # Set default research draft
    active_draft_text = (
        "Apple Inc. reported total revenue of $416.2 billion in FY2025 [1], reflecting solid top-line execution. "
        "Gross margin reached about 46.9% [2], supported by high-margin Services growth. "
        "Net profit margin expanded to 26.9% [2], delivering diluted earnings per share of $7.46 [1]. "
        "Operating cash flow reached $111.5 billion [1], enabling continuous share repurchases despite working capital liabilities."
    )
    extractor_agent.extract_claims(active_draft_text, "draft_current")
    quant_agent.compute_all_metrics()
    auditor_agent.run_auditor("draft_current")
    sentinel_agent.run_omission_radar(active_draft_text, "draft_current")
    devil_agent.run_debate(active_company)

@app.get("/api/health")
def health_check():
    return {
        "status": "healthy",
        "system": "Verifin",
        "version": "2.0.0",
        "active_company": active_company,
        "offline_ready": True,
        "notice": "Decision support only, not investment advice."
    }

@app.get("/api/company/search")
def search_company(q: str = ""):
    q_upper = q.upper().strip()
    results = []
    for ticker, info in COMMON_TICKERS.items():
        if not q or q_upper in ticker or q_upper in info["name"].upper():
            results.append({
                "ticker": ticker,
                "name": info["name"],
                "sector": info["sector"],
                "cik": info["cik"]
            })
    return {"results": results}

class IngestCompanyRequest(BaseModel):
    ticker: str
    form_type: str = "10-K"

@app.post("/api/company/ingest")
def ingest_company(req: IngestCompanyRequest):
    global active_company
    active_company = req.ticker.upper()
    res = ingest_sec_filing(active_company, req.form_type)
    quant_agent.compute_all_metrics()
    return res

@app.post("/api/documents/upload")
async def upload_document(file: UploadFile = File(...), title: Optional[str] = Form(None)):
    os.makedirs("uploads", exist_ok=True)
    temp_path = os.path.join("uploads", file.filename)
    with open(temp_path, "wb") as f:
        content = await file.read()
        f.write(content)

    res = ingest_uploaded_file(temp_path, title or file.filename)
    if res.get("status") == "success":
        quant_agent.compute_all_metrics()
    return res

@app.get("/api/documents")
def get_documents():
    conn = get_connection()
    c = conn.cursor()
    c.execute("SELECT id, title, type, publication_date, source_note, authority_rank, ticker, form_type, file_format, is_scanned FROM documents")
    docs = [dict(r) for r in c.fetchall()]
    conn.close()
    return {"documents": docs}

@app.get("/api/documents/{doc_id}/passages")
def get_doc_passages(doc_id: str, limit: int = 50):
    conn = get_connection()
    c = conn.cursor()
    c.execute("SELECT id, doc_title, page, section, text, bbox FROM passages WHERE doc_id = ? ORDER BY page, char_start LIMIT ?", (doc_id, limit))
    passages = []
    for r in c.fetchall():
        d = dict(r)
        if d.get("bbox") and isinstance(d["bbox"], str):
            try:
                d["bbox"] = json.loads(d["bbox"])
            except Exception:
                pass
        passages.append(d)
    conn.close()
    return {"doc_id": doc_id, "passages": passages}

class ResearchQueryRequest(BaseModel):
    question: str
    company_name: Optional[str] = None

@app.post("/api/research/query")
def run_research_query(req: ResearchQueryRequest):
    global active_company, active_draft_text, active_draft_title
    comp = req.company_name or active_company
    scout_res = scout_agent.run_scout_pipeline(req.question)

    conn = get_connection()
    c = conn.cursor()
    c.execute("SELECT * FROM metrics LIMIT 10")
    metrics = [dict(r) for r in c.fetchall()]
    conn.close()

    # Flatten top passages for Scribe
    all_hits = []
    for topic, hits in scout_res.get("retrieved_evidence", {}).items():
        all_hits.extend(hits)

    # Scribe writes grounded memo
    draft_res = global_scribe.generate_research_draft(req.question, comp, all_hits, metrics)
    active_draft_title = draft_res.get("title", f"{comp} Research Memo")
    active_draft_text = draft_res.get("full_text", "")

    # Tie-out the draft
    extractor_agent.extract_claims(active_draft_text, "draft_current")
    quant_agent.compute_all_metrics()
    auditor_res = auditor_agent.run_auditor("draft_current")
    sentinel_agent.run_omission_radar(active_draft_text, "draft_current")
    devil_agent.run_debate(comp)

    return {
        "status": "success",
        "company": comp,
        "question": req.question,
        "draft": draft_res,
        "tieout_summary": {
            "total_claims": auditor_res.get("total_claims"),
            "verified": auditor_res.get("verified_count"),
            "attention": auditor_res.get("attention_count")
        }
    }

class PasteDraftRequest(BaseModel):
    draft_text: str
    title: Optional[str] = "Pasted Analyst Draft"

@app.post("/api/draft/paste")
def tie_out_pasted_draft(req: PasteDraftRequest):
    global active_draft_text, active_draft_title
    active_draft_text = req.draft_text
    active_draft_title = req.title or "Pasted Analyst Draft"

    extractor_agent.extract_claims(active_draft_text, "draft_current")
    quant_agent.compute_all_metrics()
    auditor_res = auditor_agent.run_auditor("draft_current")
    sentinel_agent.run_omission_radar(active_draft_text, "draft_current")
    devil_agent.run_debate(active_company)

    return {
        "status": "success",
        "title": active_draft_title,
        "text": active_draft_text,
        "tieout": auditor_res
    }

@app.get("/api/case/current")
def get_current_case():
    conn = get_connection()
    c = conn.cursor()

    c.execute("SELECT * FROM claims WHERE draft_id = 'draft_current' ORDER BY sentence_index")
    claims = [dict(r) for r in c.fetchall()]

    c.execute("""
        SELECT v.*, c.text_span as claim_text, c.metric, c.period, c.asserted_value, c.stated_precision
        FROM verdicts v
        JOIN claims c ON v.claim_id = c.id
        ORDER BY c.sentence_index
    """)
    verdicts = []
    for r in c.fetchall():
        d = dict(r)
        if d.get("highlight_bbox") and isinstance(d["highlight_bbox"], str):
            try:
                d["highlight_bbox"] = json.loads(d["highlight_bbox"])
            except Exception:
                pass
        verdicts.append(d)

    c.execute("SELECT * FROM metrics")
    metrics = [dict(r) for r in c.fetchall()]

    c.execute("SELECT * FROM conflicts")
    conflicts = [dict(r) for r in c.fetchall()]

    c.execute("SELECT * FROM omissions")
    omissions = [dict(r) for r in c.fetchall()]

    c.execute("SELECT * FROM flags ORDER BY is_top_3 DESC, materiality_score DESC")
    flags = [dict(r) for r in c.fetchall()]

    c.execute("SELECT * FROM debates")
    debates = []
    for r in c.fetchall():
        d = dict(r)
        d["devil_evidence_chips"] = json.loads(d["devil_evidence_chips"])
        d["auditor_evidence_chips"] = json.loads(d["auditor_evidence_chips"])
        debates.append(d)

    c.execute("SELECT * FROM xbrl_cross_checks")
    xbrl_checks = [dict(r) for r in c.fetchall()]

    conn.close()

    risk_info = warden_agent.assess_risks("draft_current")

    return {
        "company": active_company,
        "draft_title": active_draft_title,
        "draft_text": active_draft_text,
        "claims": claims,
        "verdicts": verdicts,
        "metrics": metrics,
        "conflicts": conflicts,
        "omissions": omissions,
        "flags": flags,
        "debates": debates,
        "xbrl_checks": xbrl_checks,
        "confidence": risk_info.get("confidence") or risk_info.get("evidence_confidence", {"score": 85.0, "band_label": "High"}),
        "summary": {
            "total_statements": len(claims),
            "verified_count": sum(1 for v in verdicts if v["verdict"] in ["Verified", "Supported"]),
            "attention_count": sum(1 for v in verdicts if v["verdict"] not in ["Verified", "Supported"]),
            "conflicts_count": len(conflicts),
            "omissions_count": sum(1 for o in omissions if "OMITTED" in o["status"] or "Disclosed but" in o["status"])
        }
    }

class SwitchAuthorityRequest(BaseModel):
    conflict_id: str
    chosen_fact_id: str

@app.post("/api/authority/switch")
def switch_authority(req: SwitchAuthorityRequest):
    conn = get_connection()
    c = conn.cursor()
    c.execute("UPDATE conflicts SET chosen_authoritative_fact_id = ? WHERE id = ?", (req.chosen_fact_id, req.conflict_id))
    conn.commit()
    conn.close()

    # Recompute metrics downstream
    quant_agent.compute_all_metrics({req.conflict_id: req.chosen_fact_id})
    auditor_agent.run_auditor("draft_current")
    return {"status": "success", "chosen_fact_id": req.chosen_fact_id}

class ReviewerActionRequest(BaseModel):
    action_type: str # 'accept', 'edit_claim', 'dismiss', 'choose_authority'
    reason: str
    flag_id: Optional[str] = None
    claim_id: Optional[str] = None
    reviewer: str = "Institutional Analyst"

@app.post("/api/flags/action")
def take_reviewer_action(req: ReviewerActionRequest):
    conn = get_connection()
    c = conn.cursor()
    action_id = f"act_{len(req.reason)}_{req.action_type}"
    c.execute("""
        INSERT INTO reviewer_actions (id, flag_id, claim_id, action_type, reason, reviewer, timestamp)
        VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
    """, (action_id, req.flag_id, req.claim_id, req.action_type, req.reason, req.reviewer))
    if req.flag_id:
        c.execute("UPDATE flags SET status = 'resolved' WHERE id = ?", (req.flag_id,))
    conn.commit()
    conn.close()
    return {"status": "success", "action_id": action_id}

@app.get("/api/benchmarks")
def get_benchmarks():
    return run_benchmark_evaluation()

@app.post("/api/selftest/inject")
def run_selftest(injection_type: Optional[str] = Query(None)):
    return global_selftest.run_injection(injection_type)

@app.get("/api/selftest/stats")
def get_selftest_stats():
    return global_selftest.get_aggregate_stats()

@app.get("/api/export/{fmt}")
def export_report(fmt: str):
    conn = get_connection()
    c = conn.cursor()
    c.execute("SELECT * FROM metrics")
    metrics = [dict(r) for r in c.fetchall()]
    c.execute("""
        SELECT v.*, c.text_span as statement
        FROM verdicts v
        JOIN claims c ON v.claim_id = c.id
    """)
    verdicts = [dict(r) for r in c.fetchall()]
    c.execute("SELECT * FROM omissions")
    omissions = [dict(r) for r in c.fetchall()]
    conn.close()

    fmt_clean = fmt.lower()
    if fmt_clean == "xlsx":
        path = export_xlsx(active_company, metrics, verdicts)
        return FileResponse(path, filename=f"{active_company}_tie_out.xlsx", media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
    elif fmt_clean == "docx":
        path = export_docx(active_company, active_draft_title, active_draft_text, verdicts, omissions)
        return FileResponse(path, filename=f"{active_company}_memo.docx", media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document")
    elif fmt_clean == "markdown" or fmt_clean == "md":
        path = export_markdown(active_company, active_draft_title, active_draft_text, verdicts, omissions)
        return FileResponse(path, filename=f"{active_company}_report.md", media_type="text/markdown")
    else:
        raise HTTPException(status_code=400, detail="Supported export formats: xlsx, docx, md")

@app.get("/api/stream/events")
async def stream_events(request: Request):
    """
    SSE stream delivering typed multi-agent message bus activity in real-time.
    """
    async def event_generator():
        queue = asyncio.Queue()
        global_bus.add_subscriber(queue)
        try:
            # Yield initial connection message
            yield "data: {\"type\": \"CONNECTION_ACK\", \"summary\": \"Connected to Verifin Multi-Agent Message Bus\"}\n\n"
            while True:
                if await request.is_disconnected():
                    break
                try:
                    msg = await asyncio.wait_for(queue.get(), timeout=15.0)
                    yield f"data: {json.dumps(msg.model_dump())}\n\n"
                except asyncio.TimeoutError:
                    yield ": keep-alive\n\n"
        finally:
            global_bus.remove_subscriber(queue)

    return StreamingResponse(event_generator(), media_type="text/event-stream")

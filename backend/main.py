import os
import json
import uuid
import time
import asyncio
from datetime import datetime, timezone
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
active_run_id: Optional[str] = None

# --------------------------------------------------------------------------
# Provenance helpers
# --------------------------------------------------------------------------

def _now_utc() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")

def _new_run_id() -> str:
    ts = datetime.now(timezone.utc).strftime("%Y%m%d-%H%M%S")
    short = str(uuid.uuid4())[:8].upper()
    return f"VFN-{ts}-{short}"

def _record_run(
    run_id: str,
    company: str,
    question: Optional[str],
    model_name: str,
    duration_ms: int,
    claims_count: int,
    verified_count: int,
    attention_count: int,
    confidence_score: float,
    confidence_band: str,
    edgar_live: bool = True,
    llm_live: bool = True,
    is_replay: bool = False,
    replay_source_id: Optional[str] = None,
):
    conn = get_connection()
    c = conn.cursor()
    c.execute("""
        INSERT OR REPLACE INTO run_records
        (id, timestamp, company, question, model_name, edgar_live, llm_live,
         duration_ms, claims_count, verified_count, attention_count,
         confidence_score, confidence_band, is_replay, replay_source_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        run_id, _now_utc(), company, question, model_name,
        1 if edgar_live else 0, 1 if llm_live else 0,
        duration_ms, claims_count, verified_count, attention_count,
        confidence_score, confidence_band,
        1 if is_replay else 0, replay_source_id
    ))
    conn.commit()
    conn.close()

def _save_replay_bundle(run_id: str, label: str, payload: dict):
    """Serialise the full case snapshot as a replay bundle."""
    conn = get_connection()
    c = conn.cursor()
    bundle_id = f"rb_{run_id}"
    c.execute("""
        INSERT OR REPLACE INTO replay_bundles (id, run_id, label, created_at, bundle_json)
        VALUES (?, ?, ?, ?, ?)
    """, (bundle_id, run_id, label, _now_utc(), json.dumps(payload)))
    conn.commit()
    conn.close()

def _load_current_case_snapshot() -> dict:
    """Capture the complete current case state for replay bundle."""
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
    return {
        "claims": claims,
        "verdicts": verdicts,
        "metrics": metrics,
        "conflicts": conflicts,
        "omissions": omissions,
        "flags": flags,
        "debates": debates,
        "xbrl_checks": xbrl_checks,
    }

# --------------------------------------------------------------------------

@app.on_event("startup")
async def startup_event():
    global active_company, active_draft_text
    init_db()
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

    # Default draft for cold-start — gets overwritten on first real run
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
        "active_run_id": active_run_id,
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
    global active_company, active_draft_text, active_draft_title, active_run_id

    comp = req.company_name or active_company
    run_id = _new_run_id()
    active_run_id = run_id
    t0 = time.time()

    scout_res = scout_agent.run_scout_pipeline(req.question)

    conn = get_connection()
    c = conn.cursor()
    c.execute("SELECT * FROM metrics LIMIT 10")
    metrics = [dict(r) for r in c.fetchall()]
    conn.close()

    all_hits = []
    for topic, hits in scout_res.get("retrieved_evidence", {}).items():
        all_hits.extend(hits)

    draft_res = global_scribe.generate_research_draft(req.question, comp, all_hits, metrics)
    active_draft_title = draft_res.get("title", f"{comp} Research Memo")
    active_draft_text = draft_res.get("full_text", "")

    extractor_agent.extract_claims(active_draft_text, "draft_current")
    quant_agent.compute_all_metrics()
    auditor_res = auditor_agent.run_auditor("draft_current")
    sentinel_agent.run_omission_radar(active_draft_text, "draft_current")
    devil_agent.run_debate(comp)

    risk_info = warden_agent.assess_risks("draft_current")
    conf = risk_info.get("confidence") or risk_info.get("evidence_confidence", {})
    conf_score = conf.get("score", 85.0) if isinstance(conf, dict) else 85.0
    conf_band = conf.get("band_label", "High") if isinstance(conf, dict) else "High"

    total_verified = auditor_res.get("verified_count", 0)
    total_attention = auditor_res.get("attention_count", 0)
    total_claims = auditor_res.get("total_claims", 0)
    duration_ms = int((time.time() - t0) * 1000)

    _record_run(
        run_id=run_id,
        company=comp,
        question=req.question,
        model_name="groq/llama-3.3-70b-versatile",
        duration_ms=duration_ms,
        claims_count=total_claims,
        verified_count=total_verified,
        attention_count=total_attention,
        confidence_score=conf_score,
        confidence_band=conf_band,
        edgar_live=True,
        llm_live=True,
    )

    # Auto-save replay bundle
    snapshot = _load_current_case_snapshot()
    snapshot.update({
        "run_id": run_id,
        "company": comp,
        "draft_title": active_draft_title,
        "draft_text": active_draft_text,
        "question": req.question,
    })
    _save_replay_bundle(run_id, f"{comp} — {active_draft_title}", snapshot)

    return {
        "status": "success",
        "run_id": run_id,
        "company": comp,
        "question": req.question,
        "draft": draft_res,
        "tieout_summary": {
            "total_claims": total_claims,
            "verified": total_verified,
            "attention": total_attention
        }
    }

class PasteDraftRequest(BaseModel):
    draft_text: str
    title: Optional[str] = "Pasted Analyst Draft"

@app.post("/api/draft/paste")
def tie_out_pasted_draft(req: PasteDraftRequest):
    global active_draft_text, active_draft_title, active_run_id

    run_id = _new_run_id()
    active_run_id = run_id
    t0 = time.time()

    active_draft_text = req.draft_text
    active_draft_title = req.title or "Pasted Analyst Draft"

    extractor_agent.extract_claims(active_draft_text, "draft_current")
    quant_agent.compute_all_metrics()
    auditor_res = auditor_agent.run_auditor("draft_current")
    sentinel_agent.run_omission_radar(active_draft_text, "draft_current")
    devil_agent.run_debate(active_company)

    risk_info = warden_agent.assess_risks("draft_current")
    conf = risk_info.get("confidence") or risk_info.get("evidence_confidence", {})
    conf_score = conf.get("score", 85.0) if isinstance(conf, dict) else 85.0
    conf_band = conf.get("band_label", "High") if isinstance(conf, dict) else "High"
    duration_ms = int((time.time() - t0) * 1000)

    _record_run(
        run_id=run_id,
        company=active_company,
        question=f"[Paste] {active_draft_title}",
        model_name="deterministic",
        duration_ms=duration_ms,
        claims_count=auditor_res.get("total_claims", 0),
        verified_count=auditor_res.get("verified_count", 0),
        attention_count=auditor_res.get("attention_count", 0),
        confidence_score=conf_score,
        confidence_band=conf_band,
        edgar_live=True,
        llm_live=False,
    )

    snapshot = _load_current_case_snapshot()
    snapshot.update({
        "run_id": run_id,
        "company": active_company,
        "draft_title": active_draft_title,
        "draft_text": active_draft_text,
    })
    _save_replay_bundle(run_id, f"{active_company} — {active_draft_title}", snapshot)

    return {
        "status": "success",
        "run_id": run_id,
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
        "run_id": active_run_id,
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

# --------------------------------------------------------------------------
# Run history & replay
# --------------------------------------------------------------------------

@app.get("/api/runs")
def list_runs(limit: int = 20):
    """Return recent run records (provenance log)."""
    conn = get_connection()
    c = conn.cursor()
    c.execute("""
        SELECT r.*, b.id as bundle_id
        FROM run_records r
        LEFT JOIN replay_bundles b ON b.run_id = r.id
        ORDER BY r.timestamp DESC
        LIMIT ?
    """, (limit,))
    runs = [dict(row) for row in c.fetchall()]
    conn.close()
    return {"runs": runs}

@app.get("/api/runs/{run_id}")
def get_run(run_id: str):
    conn = get_connection()
    c = conn.cursor()
    c.execute("SELECT * FROM run_records WHERE id = ?", (run_id,))
    row = c.fetchone()
    conn.close()
    if not row:
        raise HTTPException(status_code=404, detail="Run not found")
    return dict(row)

# Hidden replay endpoint — accessible via Ctrl+Shift+R in UI or ?secret=REPLAY_OVERRIDE
@app.get("/api/replay/bundles")
def list_replay_bundles(secret: str = Query(default="")):
    if secret != "REPLAY_OVERRIDE":
        raise HTTPException(status_code=403, detail="Forbidden")
    conn = get_connection()
    c = conn.cursor()
    c.execute("SELECT id, run_id, label, created_at FROM replay_bundles ORDER BY created_at DESC")
    bundles = [dict(r) for r in c.fetchall()]
    conn.close()
    return {"bundles": bundles}

@app.post("/api/replay/load/{bundle_id}")
def load_replay_bundle(bundle_id: str, secret: str = Query(default="")):
    """Load a saved replay bundle as the active case (hidden emergency fallback)."""
    global active_company, active_draft_title, active_draft_text, active_run_id

    if secret != "REPLAY_OVERRIDE":
        raise HTTPException(status_code=403, detail="Forbidden")

    conn = get_connection()
    c = conn.cursor()
    c.execute("SELECT * FROM replay_bundles WHERE id = ?", (bundle_id,))
    row = c.fetchone()
    conn.close()
    if not row:
        raise HTTPException(status_code=404, detail="Replay bundle not found")

    bundle = json.loads(row["bundle_json"])
    active_company = bundle.get("company", active_company)
    active_draft_title = bundle.get("draft_title", active_draft_title)
    active_draft_text = bundle.get("draft_text", active_draft_text)

    # Generate a replay run ID
    replay_run_id = _new_run_id()
    active_run_id = replay_run_id
    _record_run(
        run_id=replay_run_id,
        company=active_company,
        question=bundle.get("question"),
        model_name="replay",
        duration_ms=0,
        claims_count=len(bundle.get("claims", [])),
        verified_count=0,
        attention_count=0,
        confidence_score=0,
        confidence_band="Replay",
        edgar_live=False,
        llm_live=False,
        is_replay=True,
        replay_source_id=bundle.get("run_id"),
    )

    return {
        "status": "replay_loaded",
        "replay_run_id": replay_run_id,
        "source_run_id": bundle.get("run_id"),
        "company": active_company,
        "label": row["label"],
    }

# --------------------------------------------------------------------------

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

    quant_agent.compute_all_metrics({req.conflict_id: req.chosen_fact_id})
    auditor_agent.run_auditor("draft_current")
    return {"status": "success", "chosen_fact_id": req.chosen_fact_id}

class ReviewerActionRequest(BaseModel):
    action_type: str
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
    """SSE stream delivering typed multi-agent message bus activity in real-time."""
    async def event_generator():
        queue = asyncio.Queue()
        global_bus.add_subscriber(queue)
        try:
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

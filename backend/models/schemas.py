from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field
from datetime import datetime
from backend.models.enums import ClaimType, Verdict, MessageType, FlagSeverity, OmissionStatus, ReportStatus, ReviewerActionType

class DocumentMeta(BaseModel):
    id: str
    title: str
    type: str # e.g. "Annual Report", "Press Release", "Quarterly Results", "Investor Presentation"
    publication_date: str # YYYY-MM-DD
    source_note: Optional[str] = None
    authority_rank: int = 3 # 1 is highest

class Passage(BaseModel):
    id: str
    doc_id: str
    doc_title: str
    page: int
    section: str
    text: str
    char_start: int
    char_end: int
    date: str

class TableCell(BaseModel):
    id: str
    doc_id: str
    page: int
    table_name: str
    row_label: str
    column_label: str
    raw_value: str
    parsed_value: Optional[float] = None
    unit: str = "INR crore"
    period: str # e.g. "FY2025"

class Fact(BaseModel):
    id: str
    metric: str # e.g. "revenue", "net_profit", "borrowings", "current_assets", "current_liabilities"
    value: float
    unit: str = "INR crore"
    period: str # e.g. "FY2024", "FY2025", "Q2_FY2026", "Q3_FY2025"
    doc_id: str
    doc_title: str
    cell_id: Optional[str] = None
    passage_id: Optional[str] = None
    page: int
    section: str
    as_of_date: str
    is_authoritative: bool = True

class Metric(BaseModel):
    id: str
    name: str # e.g. "revenue_growth_yoy", "net_margin", "current_ratio", "debt_to_equity"
    display_name: str
    period: str
    value: float
    unit: str
    formula_text: str
    input_fact_ids: List[str]
    input_values: Dict[str, float]

class Claim(BaseModel):
    id: str
    draft_id: str = "draft_a" # "draft_a" (controlled) or "draft_b" (live)
    text_span: str
    claim_type: ClaimType
    metric: Optional[str] = None
    period: Optional[str] = None
    asserted_value: Optional[str] = None
    sentence_index: int
    source_citation_text: Optional[str] = None

class VerdictDetail(BaseModel):
    id: str
    claim_id: str
    verdict: Verdict
    recomputed_value: Optional[float] = None
    recomputed_display: Optional[str] = None
    tolerance_passed: Optional[bool] = None
    evidence_fact_ids: List[str] = Field(default_factory=list)
    evidence_passage_ids: List[str] = Field(default_factory=list)
    evidence_doc_titles: List[str] = Field(default_factory=list)
    quote: Optional[str] = None
    quote_matched: Optional[bool] = None
    confidence_score: float = 1.0
    rationale: str
    method: str # "deterministic_recompute", "entailment_quote_match", "staleness_check", "unsupported"

class Conflict(BaseModel):
    id: str
    metric: str
    period: str
    fact_a_id: str
    fact_b_id: str
    source_a_title: str
    source_b_title: str
    source_a_date: str
    source_b_date: str
    value_a: float
    value_b: float
    difference: float
    suggested_authoritative_fact_id: str
    chosen_authoritative_fact_id: str
    impact_description: str

class OmissionItem(BaseModel):
    id: str
    checklist_id: str
    checklist_title: str
    status: OmissionStatus
    disclosed_in_doc_id: Optional[str] = None
    disclosed_in_doc_title: Optional[str] = None
    disclosed_page: Optional[int] = None
    disclosed_section: Optional[str] = None
    passage_id: Optional[str] = None
    highlight_text: Optional[str] = None
    amount_text: Optional[str] = None
    severity: FlagSeverity = FlagSeverity.OMISSION
    explanation: str

class MaterialityFlag(BaseModel):
    id: str
    kind: str # "conflict", "omission", "contradiction", "stale", "unsupported", "rebutted_devil"
    ref_id: str # id of claim, conflict, or omission
    title: str
    materiality_score: float # 0 - 100
    impact_text: str
    status: str = "open" # "open", "resolved", "overridden"
    severity: FlagSeverity
    is_top_3: bool = False

class ReviewerAction(BaseModel):
    id: str
    flag_id: Optional[str] = None
    claim_id: Optional[str] = None
    action_type: ReviewerActionType
    reason: str
    reviewer: str = "Senior Financial Analyst"
    timestamp: str

class SelfTestRun(BaseModel):
    id: str
    injection_type: str
    original_claim: str
    injected_claim: str
    caught: bool
    verdict_assigned: Optional[str] = None
    detection_detail: str
    timestamp: str

class AuditLogEntry(BaseModel):
    id: str
    timestamp: str
    actor: str # e.g. "Ingest", "Scout", "Quant", "Auditor", "Sentinel", "Devil", "Human Reviewer"
    action: str
    payload_hash: str
    summary: str

class BusMessage(BaseModel):
    id: str
    timestamp: str
    sender: str
    recipient: str
    message_type: MessageType
    summary: str
    payload: Dict[str, Any] = Field(default_factory=dict)
    referenced_ids: List[str] = Field(default_factory=list)
    is_llm: bool = False

class DebateExchange(BaseModel):
    id: str
    devil_point_id: str
    devil_challenge: str
    devil_evidence_ids: List[str]
    devil_evidence_chips: List[Dict[str, str]]
    auditor_response: str # "CONFIRMED", "REBUTTED", "PARTIAL"
    auditor_rationale: str
    auditor_evidence_ids: List[str]
    auditor_evidence_chips: List[Dict[str, str]]

class CaseStateSummary(BaseModel):
    case_id: str
    company_name: str
    research_question: str
    analysis_date: str
    status: ReportStatus
    evidence_confidence_score: float # 0 - 100
    claims_count: int
    supported_count: int
    contradicted_count: int
    unsupported_count: int
    stale_count: int
    needs_review_count: int
    active_draft: str = "draft_a" # "draft_a" or "draft_b"

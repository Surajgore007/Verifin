export type Verdict = "Supported" | "Contradicted" | "Unsupported" | "Stale" | "Needs Review";

export type ClaimType = "numeric" | "directional" | "qualitative" | "forward_looking" | "existence";

export type MessageType = "REQUEST" | "EVIDENCE" | "CLAIM_SET" | "VERDICT" | "CHALLENGE" | "REBUTTAL" | "FLAG";

export interface Claim {
  id: string;
  draft_id: string;
  text_span: string;
  claim_type: ClaimType;
  metric?: string;
  period?: string;
  asserted_value?: string;
  sentence_index: number;
  source_citation_text?: string;
}

export interface VerdictDetail {
  id: string;
  claim_id: string;
  verdict: Verdict;
  recomputed_value?: number;
  recomputed_display?: string;
  tolerance_passed?: boolean;
  evidence_fact_ids?: string;
  evidence_passage_ids?: string;
  evidence_doc_titles?: string;
  quote?: string;
  quote_matched?: boolean;
  confidence_score: number;
  rationale: string;
  method: string;
}

export interface Metric {
  id: string;
  name: string;
  display_name: string;
  period: string;
  value: number;
  unit: string;
  formula_text: string;
  input_fact_ids: string;
  input_values: string;
}

export interface Conflict {
  id: string;
  metric: string;
  period: string;
  fact_a_id: string;
  fact_b_id: string;
  source_a_title: string;
  source_b_title: string;
  source_a_date: string;
  source_b_date: string;
  value_a: number;
  value_b: number;
  difference: number;
  suggested_authoritative_fact_id: string;
  chosen_authoritative_fact_id: string;
  impact_description: string;
}

export interface OmissionItem {
  id: string;
  checklist_id: string;
  checklist_title: string;
  status: "Disclosed in filings and addressed" | "Disclosed in filings but OMITTED from the draft" | "Not found in provided filings";
  disclosed_in_doc_id?: string;
  disclosed_in_doc_title?: string;
  disclosed_page?: number;
  disclosed_section?: string;
  passage_id?: string;
  highlight_text?: string;
  amount_text?: string;
  severity: string;
  explanation: string;
}

export interface MaterialityFlag {
  id: string;
  kind: string;
  ref_id: string;
  title: string;
  materiality_score: number;
  impact_text: string;
  status: string;
  severity: string;
  is_top_3: boolean;
}

export interface DebateExchange {
  id: string;
  devil_point_id: string;
  devil_challenge: string;
  devil_evidence_ids: string;
  devil_evidence_chips: string;
  auditor_response: "CONFIRMED" | "REBUTTED" | "PARTIAL";
  auditor_rationale: string;
  auditor_evidence_ids: string;
  auditor_evidence_chips: string;
}

export interface ReviewerAction {
  id: string;
  flag_id?: string;
  claim_id?: string;
  action_type: string;
  reason: string;
  reviewer: string;
  timestamp: string;
}

export interface EvidenceConfidence {
  score: number;
  base_pct: number;
  band_label: string;
  band_color: string;
  penalties: {
    conflicts: number;
    omissions: number;
    stale: number;
    total: number;
  };
  formula_definition: string;
  explanation: string;
}

export interface BusMessage {
  id: string;
  timestamp: string;
  sender: string;
  recipient: string;
  message_type: MessageType;
  summary: string;
  payload: Record<string, any>;
  referenced_ids: string[];
  is_llm: boolean;
}

export interface CaseState {
  case_id: string;
  company_name: string;
  research_question: string;
  analysis_date: string;
  active_draft: string;
  authoritative_rev_doc: string;
  claims: Claim[];
  verdicts: VerdictDetail[];
  metrics: Metric[];
  conflicts: Conflict[];
  omissions: OmissionItem[];
  flags: MaterialityFlag[];
  debates: DebateExchange[];
  reviewer_actions: ReviewerAction[];
  audit_log: any[];
  evidence_confidence: EvidenceConfidence;
  risk_register: Array<{ category: string; severity: string; description: string }>;
  report: any;
}

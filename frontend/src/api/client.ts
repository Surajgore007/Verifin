import { CaseState, MaterialityFlag } from "../types";

export const API_BASE = "";

export async function fetchCurrentCase(): Promise<CaseState> {
  const res = await fetch(`${API_BASE}/api/case/current`);
  if (!res.ok) throw new Error("Failed to load active case state");
  return res.json();
}

export async function runPipeline(draft_id: string = "draft_a", authoritative_source: string = "D1", question?: string): Promise<any> {
  const res = await fetch(`${API_BASE}/api/pipeline/run`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ draft_id, authoritative_source, research_question: question })
  });
  if (!res.ok) throw new Error("Failed to run pipeline");
  return res.json();
}

export async function switchAuthority(chosen_doc_id: string): Promise<any> {
  const res = await fetch(`${API_BASE}/api/case/switch-authority`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chosen_doc_id })
  });
  if (!res.ok) throw new Error("Failed to switch authoritative source");
  return res.json();
}

export async function recordReviewerAction(action_type: string, reason: string, flag_id?: string, claim_id?: string): Promise<any> {
  const res = await fetch(`${API_BASE}/api/reviewer/action`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action_type, reason, flag_id, claim_id })
  });
  if (!res.ok) throw new Error("Failed to record reviewer action");
  return res.json();
}

export async function fetchDocuments(): Promise<any[]> {
  const res = await fetch(`${API_BASE}/api/documents`);
  if (!res.ok) throw new Error("Failed to fetch documents");
  return res.json();
}

export async function fetchDocumentDetails(doc_id: string): Promise<any> {
  const res = await fetch(`${API_BASE}/api/documents/${doc_id}`);
  if (!res.ok) throw new Error("Failed to fetch document details");
  return res.json();
}

export async function injectSelfTestError(injection_type?: string, seed?: number): Promise<any> {
  const res = await fetch(`${API_BASE}/api/selftest/inject`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ injection_type, seed })
  });
  if (!res.ok) throw new Error("Failed to inject self-test error");
  return res.json();
}

export async function fetchSelfTestStats(): Promise<any> {
  const res = await fetch(`${API_BASE}/api/selftest/stats`);
  if (!res.ok) throw new Error("Failed to fetch self-test statistics");
  return res.json();
}

export async function fetchMarkdownExport(): Promise<string> {
  const res = await fetch(`${API_BASE}/api/report/export`);
  if (!res.ok) throw new Error("Failed to fetch markdown export");
  return res.text();
}

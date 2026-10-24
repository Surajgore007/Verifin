=====================================================================
MASTER BUILD PROMPT: "CLAIMCOURT"
Trustworthy Multi-Agent Financial Research and Decision Support
=====================================================================

You are a senior full-stack engineer, AI systems architect and product designer.
You will build a working, demo-ready MVP in roughly 12 hours of effort for a
hackathon final. Read this entire prompt before doing anything. First reply
with a 10-line summary of your understanding and a phased plan. Then build one
phase at a time and stop at each checkpoint for my confirmation.

---------------------------------------------------------------
1. CONTEXT: WHAT THE HACKATHON WANTS
---------------------------------------------------------------
Event: INNOVISE 2026 (Digital VJTI, Mumbai), AI/ML track, Round 2.
Deliverables: working MVP, final PPT, GitHub repo (with README). Pitch is
7 minutes plus 3 minutes of Q&A to a judge panel.
Judging: problem understanding, innovation and originality, technical depth
and feasibility, quality of the working prototype, and presentation plus
the ability to defend technical decisions in Q&A.
Reliability beats ambition. A smaller system that works flawlessly on stage
beats a large one that is flaky. Everything the judges will see must run
offline and be repeatable.

---------------------------------------------------------------
2. THE PROBLEM STATEMENT (PS 1)
---------------------------------------------------------------
"Trustworthy Multi-Agent Financial Research and Decision Support System."
A financial analyst evaluating a listed company must read filings, earnings
reports and statements that may conflict, be outdated, or be summarized by
AI with unsupported claims, wrong calculations or misleading conclusions.
Build a system that:
 1. Financial Research: retrieves information from filings, earnings
    reports and statements, keeping source details and publication dates.
 2. Financial Analysis: computes ratios, trends and period comparisons.
 3. Evidence Verification: checks that important claims are supported by
    retrieved sources, finds contradictions, flags unsupported statements.
 4. Risk and Uncertainty Assessment: identifies business and financial
    risks, missing information, outdated sources and limitations.
 5. Controlled Decision Support: produces a consolidated report with
    evidence-backed findings, risks and clearly stated uncertainties. It
    may suggest considerations for humans, but must NEVER execute
    transactions or make consequential decisions autonomously.
 6. Human Review and Feedback: the analyst can inspect evidence, review
    flags, correct errors, and approve or reject the final report.
Mandatory MVP items: document retrieval with source access; financial
analysis; a multi-agent (or modular) workflow; evidence and reliability
checks; risk assessment and report generation; a human review interface.
The demo MUST show, end to end, a research query with evidence retrieval,
financial analysis, at least one deliberately planted inconsistency or
unsupported claim that the system catches, and a reviewable final report.
Responsible-AI principles to reflect (NIST AI RMF GenAI Profile): evidence-
backed outputs, transparency about uncertainty, human oversight, auditability.

---------------------------------------------------------------
3. THE SOLUTION IN ONE PARAGRAPH
---------------------------------------------------------------
ClaimCourt puts every claim in an AI-written research draft "on trial".
Numbers are never trusted from an LLM: they come from a structured Fact
Ledger and are recomputed by deterministic code. Each claim gets a verdict
(Supported, Contradicted, Unsupported, Stale, or Needs Review) with the
exact highlighted source sentence or table cell. A Dependency Graph shows how
any disputed figure flows into ratios, conclusions and the report, and a
Materiality engine ranks flags by how much they move the conclusion, so the
human reviews the top 3 first, not 40. An Omission Radar finds what the
draft never said (hidden risks). A Self-Test mode injects random errors into a
clean report live and shows the verifier's detection rate, answering "who
verifies the verifier?". A human analyst makes the final approve/reject call.
Tagline: "AI proposes. Evidence decides. Humans approve."
Positioning rule: never claim "first ever" or "no one else does this".
Say "our focus is claim-level adjudication, omission detection and
provable reliability".

---------------------------------------------------------------
4. TECH STACK (all free / open source)
---------------------------------------------------------------
Backend: Python 3.11, FastAPI, Pydantic models, SQLite (single file), 
  pandas for numeric work, rank_bm25 plus sentence-transformers (small model,
  e.g. all-MiniLM) for hybrid retrieval, RapidFuzz for fuzzy matching.
LLM access: a provider abstraction with one interface and swappable
  backends: a free-tier API (Gemini or Groq) and local Ollama as fallback.
  Every LLM call must request structured JSON output, be validated against a
  schema, retry once on invalid output, and be CACHED to disk keyed by prompt
  hash. Ship a pre-warmed cache so the full demo runs with no internet.
Frontend: React with Vite and TypeScript, Tailwind CSS, Framer Motion for
  animation, React Flow for the dependency graph, Recharts or visx for charts,
  Lucide icons. Fonts bundled locally (no CDN).
Documents: SYNTHETIC filings that we author ourselves, stored as structured
  JSON/HTML (with a rendered PDF copy for show). The in-app document viewer
  renders from the structured form, so highlights are exact (see section 8).
Optional extra: one real SEC EDGAR 10-K excerpt loaded as a "real-world
  sanity" example (not used for the planted-error demo). Optionally
  evaluate the numeric verifier on a few FinQA items for credibility.
Orchestration: a simple explicit state machine over a shared Case State
  object (no heavy agent frameworks). Each agent is a module with typed
  input and output and writes to the audit log. The UI streams agent
  progress through server-sent events.

---------------------------------------------------------------
5. THE DEMO CASE (build this data exactly)
---------------------------------------------------------------
Fictional company: "Meridian Textiles Ltd" (clearly labelled SYNTHETIC in
the UI). Currency INR crore. Reporting date of the analysis: 24 Oct 2026.
Research question: "Is Meridian Textiles financially healthy enough to be
considered for a long-term holding? Summarise growth, profitability,
liquidity, leverage and key risks."
Documents (each with title, type, publication date, page/section structure):
  D1 Annual Report FY2025 (published Jun 2026): income statement, balance
     sheet, cash flow, notes (borrowings, contingent liabilities, related
     party transactions, customer concentration, auditor's report).
  D2 Earnings Press Release FY2025 (published May 2026).
  D3 Q2 FY2026 results note (published Oct 2026), short.
  D4 Investor Presentation FY2023 (published May 2024? no: use May 2023),
     containing old management guidance. Deliberately STALE.
  D5 A structured financial-statements table (CSV/JSON) for FY2023 to FY2025.
Ground-truth figures (keep these consistent across documents except where
a conflict is planted):
  Revenue FY2024: 1,000. Revenue FY2025 per Annual Report (D1): 1,120.
  Revenue FY2025 per Press Release (D2): 1,180  <- PLANTED CONFLICT (60 cr).
  Net profit FY2024: 80. FY2025: 72. (Net margin 8.0% -> 6.4%.)
  Total borrowings FY2024: 400. FY2025: 520 (+30%).
  Current assets FY2025: 540. Current liabilities FY2025: 600.
  (Current ratio 0.90.)
  Hidden in D1 notes (these are the OMISSIONS the draft will never mention):
    - Contingent liability of 85 cr (tax dispute), page 47 of D1.
    - Unsecured loan of 40 cr to an entity controlled by the promoter
      (related-party note).
    - Top customer = 38% of revenue (concentration note).
  D4 contains guidance "revenue growth of 20%+ annually through FY2026",
  dated May 2023 (older than the 12-month staleness limit).
THE AI DRAFT REPORT (a deliberately confident, polished "first-pass AI
analysis", stored as a fixture and optionally regenerable) contains about
12 claims, including:
  C1 "Revenue grew 18% to 1,180 crore."  (uses press release; conflicts with D1)
  C2 "Net margins expanded year over year."  (CONTRADICTED: 8.0% to 6.4%)
  C3 "The company has reduced its debt."  (CONTRADICTED: 400 to 520)
  C4 "Liquidity is strong."  (current ratio 0.90, below 1.0)
  C5 "Management has secured long-term financing for expansion."
     (UNSUPPORTED: no source)
  C6 "Management expects 20%+ annual growth."  (STALE: only from 2023 source)
  C7 plus about 5 correct, well-supported claims (to prove the system does
     not cry wolf), e.g. FY2024 revenue, an accurate profit figure,
     headcount if present, an accurate cash-flow statement.
  The draft never mentions the contingent liability, the promoter loan, or
  customer concentration.
Expected key demo moments:
  - Resolving the revenue conflict in favour of the audited Annual Report
    changes growth from 18% to 12%, and flips the "strong growth" conclusion
    (rule: strong growth means above 15%). The graph and report update live.
  - Omission Radar says: "The draft never mentions the 85 cr contingent
    liability (Annual Report, Note 27, page 47)."
  - Top-3 materiality flags are shown first.
  - The analyst overrides one flag with a written reason, rejects the draft,
    and approves the corrected version.

---------------------------------------------------------------
6. ARCHITECTURE: PIPELINE AND AGENTS
---------------------------------------------------------------
Shared Case State holds: question, documents, chunks, ledger facts, computed
metrics, draft, claims, verdicts, conflicts, omissions, flags, reviewer
actions, audit log. Pipeline stages (each an agent/module):

 A. INGEST (not an LLM)
    Parse the synthetic documents into sections, paragraphs, sentences and
    table cells with stable IDs and character offsets. Record doc title,
    type, publication date, page, section. Build the Fact Ledger from the
    financial tables: each fact has metric, value, unit, period, source doc,
    page, table cell reference, and date. Normalise units (crore, lakh,
    millions) in one place.
 B. RESEARCHER
    Hybrid retrieval (BM25 plus embeddings) over chunks. Returns top passages
    with source metadata and dates for any query. Exposes a "source
    explorer" so a user can browse everything cited.
 C. ANALYST (deterministic)
    Computes growth, margins, current ratio, debt-to-equity or leverage,
    interest cover if data exists, and period-over-period trends. Every
    computed metric stores its formula and the IDs of the ledger facts it
    used (this feeds the Dependency Graph). The LLM never does arithmetic.
 D. DRAFT WRITER (LLM, or fixture)
    Produces the confident draft report from retrieved evidence. For the demo
    the planted-error draft is a stored fixture for repeatability; a
    "regenerate" option may exist but is not used on stage.
 E. CLAIM EXTRACTOR (LLM, schema-constrained)
    Splits the draft into atomic claims. Each claim: text, type (numeric,
    directional, qualitative, forward-looking, existence), metric, period,
    asserted value or direction, and its sentence position in the draft.
 F. VERIFIER (the core)
    1. Numeric and directional claims: find the matching ledger facts,
       recompute with code, compare using tolerance (0.5%) after unit
       normalisation. Verdict Supported or Contradicted with the recomputed
       value and the evidence cell.
    2. Qualitative or textual claims: retrieve the top passages, ask the LLM
       for an entailment judgement that MUST return a verbatim supporting
       quote and passage ID. Then verify in code that the quote really exists
       in that passage (exact or near-exact string match). If it does not,
       discard the judgement and mark the claim Unsupported or Needs Review.
       This is the anti-hallucination guard for the verifier itself.
    3. Qualitative thresholds come from a visible, editable rules file
       (e.g. strong liquidity means current ratio of at least 1.2; strong
       growth means above 15%; leverage rising means borrowings up).
       Never let the LLM invent thresholds.
    4. Conflict detector: when two documents give different values for the
       same metric and period, create a Conflict with both sources, the
       difference, and a source-reliability hierarchy (audited annual report
       above press release above presentation) as a SUGGESTION only. The
       human decides.
    5. Staleness check: compare source publication date with the analysis
       date, using configurable limits (e.g. guidance older than 12 months,
       quarterly data older than 6 months). Verdict Stale.
    6. Abstention: if confidence is low or evidence is ambiguous, output
       Needs Review instead of guessing. Abstaining is a feature.
 G. OMISSION RADAR
    A hardcoded expected-disclosure checklist of 8 items: contingent
    liabilities, related-party transactions, debt maturity or covenant
    information, auditor qualifications or emphasis-of-matter, going-concern
    language, customer or segment concentration, subsequent events, and
    pledged promoter shares. For each item: (1) scan the filings (keywords
    plus LLM confirmation, extracting amount and location), (2) check whether
    the draft addresses it. Output one of: "Disclosed in filings and
    addressed", "Disclosed in filings but OMITTED from the draft" (high
    severity, with exact source), or "Not found in provided filings"
    (information gap, listed under limitations).
 H. DEPENDENCY GRAPH + MATERIALITY ENGINE (deterministic)
    Build a directed graph: Facts -> Computed Metrics -> Conclusions/Claims
    -> Report Sections. When a reviewer picks which source is authoritative
    for a conflict, recompute everything downstream and show before and
    after values, which claims flip verdict, and which conclusions change.
    Materiality score per flag combines: number of downstream conclusions it
    flips, magnitude relative to revenue/equity, and severity class
    (contradiction > omission > stale > unsupported). Produce plain-language
    impact statements, e.g. "Resolving this 60 cr revenue conflict changes
    growth from 18% to 12% and flips 'strong growth'."
 I. RED-TEAM AGENT (LLM, prompt-only, build LAST)
    Told to argue the bear case using ONLY ledger facts and retrieved
    passages with citations. Each point passes through the same quote and
    citation validator. Strong, well-sourced bear points that the draft
    ignored become "Ignored counter-evidence" flags. This gives two agents
    with opposite incentives that visibly disagree.
 J. RISK ASSESSOR
    Aggregates: business and financial risks from the evidence, missing
    information, stale sources, conflicts, abstentions, and model limits.
    Produces a Risk and Uncertainty register and an overall Evidence
    Confidence indicator (never a buy/sell call).
 K. REPORT COMPOSER
    Builds the structured final report (section 9) from the verified
    findings only, with every statement carrying citation chips. Anything
    unverified is visibly marked, never silently included.
 L. SELF-TEST ENGINE (Tier 2)
    Takes the clean, corrected version of the report and injects one random
    error from a catalogue: swapped number, unit slip (x10), reversed
    direction, wrong period, removed citation, altered source date,
    fabricated claim. Runs the Verifier and shows caught or missed per
    injection and a running detection rate by error type. Also reports the
    false-positive rate on untouched correct claims. Show misses honestly;
    do not hide them. Seed the RNG so the stage demo is repeatable, but
    allow a "random" mode.
 M. AUDIT LOG
    Append-only record of every agent action, LLM call hash, verdict,
    reviewer action and timestamp. Exportable.

Responsible-AI guarantees to implement and mention: no autonomous
transactions (there is no trading code anywhere); human approval gate before
a report can be marked "Approved for consideration"; uncertainty always
visible; every number traceable; permanent banner "Decision support only,
not investment advice. Synthetic data."

---------------------------------------------------------------
7. DATA MODEL (SQLite tables, described, not coded)
---------------------------------------------------------------
documents (id, title, type, publication_date, source_note)
passages (id, doc_id, page, section, text, char offsets, embedding ref)
table_cells (id, doc_id, page, table_name, row_label, column_label, raw_value)
facts (id, metric, value, unit, period, doc_id, cell_id or passage_id, as_of_date)
metrics (id, name, formula_text, input_fact_ids, value, period)
claims (id, draft_text_span, type, metric, period, asserted_value)
verdicts (id, claim_id, verdict, recomputed_value, evidence_ids, quote,
          confidence, rationale, method)
conflicts (id, metric, period, fact_ids, difference, suggested_authority)
omissions (id, checklist_item, status, source_ref, amount, severity)
flags (id, kind, ref_id, materiality_score, impact_text, status)
reviewer_actions (id, flag_id, action, reason, reviewer, timestamp)
selftest_runs (id, injection_type, injected_text, caught, detail, timestamp)
audit_log (id, timestamp, actor, action, payload_hash, summary)
Give every record a stable ID, because UI highlights and graph edges
reference them.

---------------------------------------------------------------
8. PROVENANCE: MAKE IT EXACT
---------------------------------------------------------------
"Page 12" is not enough. Clicking any claim, number or flag must open the
Source Viewer on the correct document and highlight the exact sentence or the
exact table cell, with a small chip showing document title, section, page and
publication date. Because our documents are authored as structured data, the
viewer renders from structure with precise highlights (do not depend on
PDF coordinate extraction). Numbers shown in the report are hoverable and
reveal their formula and input facts.

---------------------------------------------------------------
9. THE FINAL REPORT (sections)
---------------------------------------------------------------
1 Header with company, question, analysis date, status, trust summary.
2 Verified executive summary (only supported findings).
3 Key findings, each with evidence chips and verdict badge.
4 Financial analysis: ratio table, trends across FY2023 to FY2025, charts.
5 Verification summary: counts per verdict, conflicts and how resolved.
6 Risks and red-team counterpoints.
7 Omissions: what the draft failed to mention.
8 Limitations, stale or missing sources, abstentions, unresolved questions.
9 Reviewer sign-off: decision, reasons, overrides, timestamp, audit link.
Exports: PDF or Markdown with footnoted provenance, plus the audit log.
Status states: Draft -> Under Review -> Approved for Consideration, or
Rejected. Approval requires the human to confirm; the system cannot approve.

---------------------------------------------------------------
10. SCREENS AND UX FLOW
---------------------------------------------------------------
 S1 New Case: company, research question, document set, "Load demo case".
 S2 Pipeline Run: animated vertical timeline of agents (Researcher,
    Analyst, Draft Writer, Verifier, Omission Radar, Red-Team, Risk), each
    with status and a short live log. Provide "Instant demo mode" using
    cached results so the live demo can never stall.
 S3 Review Workspace (the hero screen), three panes:
    Left: Flag Queue ranked by materiality, grouped Top 3 / Others, with
          verdict badges and impact lines.
    Center: the AI draft rendered as a document with claims underlined and
          colour-coded by verdict; toggle Draft view / Corrected view.
    Right: Evidence Inspector showing the highlighted source passage or cell,
          recomputed value, formula, confidence, rationale, and actions:
          Accept verdict, Override with reason, Choose authoritative source
          (for conflicts), Reject claim, Add note.
    Top bar: case title, Evidence Confidence ring, counts, theme toggle.
 S4 Dependency Graph: interactive graph, Facts -> Metrics -> Conclusions ->
    Report. Click a disputed fact to toggle the authoritative source and watch
    values, edges and verdict badges update with a smooth animation, plus an
    impact summary panel.
 S5 Omission Radar: the 8-item checklist as elegant cards (Addressed /
    Omitted / Not found), omitted items showing amount and source highlight.
 S6 Self-Test Lab: "Inject error" button, live result rows (Injected ->
    Caught/Missed), detection rate by error type, false-positive rate.
 S7 Final Report and Sign-off: the composed report, approve or reject with
    required reason, export, audit log viewer.
Keyboard-friendly: J/K to move through flags, Enter to open, a command
palette (Cmd/Ctrl+K) for jumping between screens.

---------------------------------------------------------------
11. VISUAL DESIGN SYSTEM: PREMIUM BLACK AND WHITE
---------------------------------------------------------------
Aesthetic: a quiet, editorial, high-end financial terminal. Think private
bank meets Linear meets a printed research note. Monochrome first, colour
only when it carries meaning.
Palette (use as CSS variables, with light and dark themes; dark is default
for the app shell, and the report always renders on a white "paper" card):
  Ink 950 #09090B, 900 #0F0F12, 850 #141418, 800 #18181B, 700 #27272A,
  600 #3F3F46, 500 #71717A, 400 #A1A1AA, 300 #D4D4D8, 200 #E4E4E7,
  100 #F4F4F5, 50 #FAFAFA, White #FFFFFF.
Semantic accents, muted and used ONLY for verdicts and status, as thin
indicators, small badges and subtle tinted backgrounds, never large fills:
  Supported: soft emerald (#34D399 family at low opacity)
  Contradicted: soft crimson (#F87171 family)
  Unsupported: soft amber (#FBBF24 family)
  Stale: cool slate-blue (#94A3B8 family)
  Needs Review: neutral violet-grey
Every colour-coded element must also have an icon or text label (never rely
on colour alone).
Typography: Inter or Geist for UI; a refined serif (e.g. Source Serif,
Newsreader or Instrument Serif) for report body and big headings; Geist Mono
or JetBrains Mono for figures, IDs and citations. Use tabular numerals for
all financial figures. Tight, confident type scale; generous line height in
the report.
Surfaces and detail: 1px hairline borders in low-contrast greys, soft
layered shadows in light mode and subtle inner glow in dark mode, 12 to 16px
radii, an 8-point spacing grid, very generous whitespace, subtle glassmorphism
only on floating panels (command palette, popovers), faint grain or dot-grid
texture on empty states, thin custom scrollbars.
Motion (Framer Motion, restrained): staggered fade-and-rise on load,
smooth layout transitions between panes, animated count-up on metrics, a
graceful ring animation for Evidence Confidence, graph edges that pulse once
when a value changes, skeleton shimmer while loading. Respect reduced-motion.
Components to craft carefully: verdict badges, evidence chips (doc, page,
date), highlighted source passages (soft marker-style highlight), metric
cards with sparklines, flag cards with a materiality bar, a document "paper"
view, a polished timeline for the agent run, graph nodes as minimal rounded
cards, keyboard-hint pills, empty and error states with personality.
Accessibility: WCAG AA contrast, visible focus rings, semantic HTML.
The UI must look finished at 1440x900 and 1920x1080, since it will be
projected. No default-looking widgets, no emoji, no clip-art, no rainbow
dashboards.

---------------------------------------------------------------
12. BUILD ORDER, PRIORITIES AND CUT LINES
---------------------------------------------------------------
TIER 1 (must work perfectly):
  Phase 0 (~1h): repo, project skeleton, design tokens, fonts, seed folder.
  Phase 1 (~1.5h): author synthetic documents and fact ledger exactly per
          section 5; ingestion with stable IDs and offsets; source viewer.
  Phase 2 (~1.5h): retrieval and the deterministic Analyst with formulas and
          fact lineage.
  Phase 3 (~3h): claim extraction, Verifier (numeric, textual with quote
          validation, conflict, stale, abstain), rules file, flags.
  Phase 4 (parallel, ~3h): frontend S1, S2, S3, S7 with real data.
TIER 2 (do next, in this order):
  Phase 5 (~1.5h): Dependency Graph + Materiality engine + live recompute (S4).
  Phase 6 (~1h): Omission Radar (S5).
  Phase 7 (~1h): Self-Test Lab (S6).
TIER 3 (only if time remains):
  Phase 8 (~0.5h): Red-Team agent as a prompt-only add-on.
  Phase 9 (~1h): polish, export, README, demo script, tests.
Cut order if behind schedule: Red-Team first, then Self-Test visuals, then
export polish. Never cut: Verifier, exact provenance, human review gate,
the planted-error demo.

---------------------------------------------------------------
13. TESTING AND ACCEPTANCE CRITERIA
---------------------------------------------------------------
The demo passes only if ALL are true:
 1. Loading the demo case and running the pipeline works offline in under
    60 seconds, and "Instant demo mode" in under 5 seconds.
 2. C1 to C4 flagged Contradicted or flagged with the correct recomputed
    values; C5 Unsupported; C6 Stale; the correct claims are Supported
    (target: zero false positives on the demo draft).
 3. The 60 cr revenue conflict is detected with both sources; choosing the
    Annual Report changes growth 18% -> 12% and flips the growth conclusion
    visibly in the graph, claim list and report.
 4. Omission Radar reports the 85 cr contingent liability, the 40 cr
    related-party loan and the 38% customer concentration as omitted, each
    with an exact source highlight.
 5. The top 3 flags by materiality are shown first with impact sentences.
 6. Every number in the final report is traceable to a highlighted source.
 7. Self-Test catches most injected errors; misses and the false-positive
    rate are displayed honestly.
 8. A reviewer can override with a reason, reject, approve, and export; the
    audit log shows all actions. No code path can execute a trade.
Write unit tests for: unit normalisation, ratio formulas, tolerance
matching, the quote-existence validator, staleness rules, conflict
detection, materiality scoring and graph recomputation. Add a small
end-to-end test of the demo case.

---------------------------------------------------------------
14. RULES OF ENGAGEMENT FOR YOU (THE CODING ASSISTANT)
---------------------------------------------------------------
 - Determinism over cleverness: use code for anything that can be code; use
   the LLM only for claim extraction, entailment with quotes, draft writing,
   omission confirmation and red-team text.
 - Never let an LLM output reach the UI without schema validation. Cache
   all LLM calls. Provide a fallback fixture for each LLM step.
 - Keep modules small and typed; one folder per agent; a single config file
   for thresholds, tolerances and staleness limits.
 - Do not add features not described here. Ask me before changing scope.
 - After each phase: run the tests, tell me what works, what is stubbed, and
   how to demo it, then wait for my go-ahead.
 - Final repo must include: README (problem, solution, architecture diagram,
   setup in under 5 commands, demo script, limitations, responsible-AI notes),
   a one-click demo launcher, the seed data, and a docs folder with
   architecture and data-model notes.
 - Be honest in the UI and README about limitations: synthetic data,
   verifier is not infallible, LLM judgements are quote-validated but not
   guaranteed, real-world filings need robust parsing (future work: XBRL).

---------------------------------------------------------------
15. PITCH ALIGNMENT (so the build supports the story)
---------------------------------------------------------------
Story: a pension analyst receives a confident AI-written summary of a
company. It reads well and is wrong in four places, and silent about
three hidden liabilities. ClaimCourt shows the contradictions with
highlighted evidence, ranks what matters most, reveals what was never said,
proves its own reliability live with Self-Test, and leaves the final decision
to the human. Closing line: "Don't trust AI reports. Verify them, claim by
claim."
Expected Q&A the product must be ready for: who verifies the verifier
(quote validation, deterministic recompute, abstention, Self-Test, red-team);
why synthetic data (controlled ground truth, plus one real EDGAR example);
how it scales (XBRL ingestion, more checklist items); how it differs from
cited-RAG tools (claim-level verdicts, recomputation, omission detection).
=====================================================================

PATCH A: DATA (replaces/extends section 5)
- D4 Investor Presentation: published May 2023 (stale). Nothing else.
- Equity: FY2024 600, FY2025 640. Debt-to-equity: 0.67 -> 0.81.
- Cash flow FY2025 (D1): operating cash flow 85 (FY2024: 110), capex 150.
- Headcount (D1): FY2024 3,900; FY2025 4,200.
- D3 Q2 FY2026 note (published Oct 2026, fresh): revenue 285, net profit 15.
- D6 Q3 FY2025 note (published Jan 2026, older than the 6-month limit):
  revenue 290, net profit 19.
- Correct claims (must be Supported): C7a FY2024 revenue 1,000; C7b FY2025
  net profit 72; C7c operating cash flow 85, down from 110; C7d headcount
  4,200; C7e Q2 FY2026 revenue 285.
- C8 "Latest quarterly revenue was 290 crore" -> STALE (6-month rule;
  superseded by D3). This exercises the quarterly staleness rule.
- Margins and growth are always computed from the AUTHORITATIVE revenue
  source. When the reviewer switches the authoritative source, margins,
  growth and affected verdicts recompute live (second graph demo).

PATCH B: PROCESS (replaces the process rules in sections 12 and 14)
- Do NOT send a summary first. Read docs/SPEC.md (this document) and start.
- Build Phases 0-3 in one go. Stop only when the backend works end to end.
  Then build Phases 4-7 in one go.
- Hardcode the demo case first (documents, ledger, draft fixture). Keep the
  verifier logic generic. Generalize later.
- Phase 3 exit criterion: the LLM cache and all fixtures are pre-warmed and the
  full demo runs offline.
- FinQA evaluation and the EDGAR example are "if time remains" only.

PATCH C: AGENT VISIBILITY, LIVE DRAFT, QUERY-DRIVEN FLOW

C1. MAKE THE AGENTS REAL AND VISIBLE
- Every agent has a name, a one-line role, a typed input schema and a typed
  output schema, and communicates ONLY by posting typed messages to a shared
  Message Bus (stored in SQLite and streamed to the UI).
  Agents: Scout (retrieval), Quant (deterministic analysis), Scribe (draft),
  Extractor (claims), Auditor (verifier), Sentinel (omission radar),
  Devil (red-team), Warden (risk), Editor (report composer).
- Message format: sender, recipient, type (REQUEST, EVIDENCE, CLAIM_SET,
  VERDICT, CHALLENGE, REBUTTAL, FLAG), payload summary, referenced IDs,
  timestamp. Agents may send REQUESTs to each other (e.g. Auditor asks Scout
  for more evidence when confidence is low, Auditor asks Quant to recompute
  a metric).
- Pipeline screen (S2) shows: an agent graph with live status, and a
  scrolling message feed ("Auditor -> Scout: need evidence for 'long-term
  financing', top-5 requested"). Clicking a message opens its payload.
  Mark each agent as LLM-driven or deterministic (honest labels).

C2. THE DEBATE (Auditor vs Devil)
- Promote Red-Team (Devil) from stretch to Tier 2, built right after Omission
  Radar. Do NOT cut it first. New cut order: export polish, then Self-Test
  visuals, and only last the Devil.
- Devil argues the bear case from ledger facts and passages, each point with
  citations that pass the same quote validator. Auditor must respond to each
  point with CONFIRMED (draft ignored it), REBUTTED (evidence shown) or
  PARTIAL. Show this as a "Debate" panel inside S3 or S2 with two columns:
  Devil's challenge vs Auditor's response, evidence chips under each.
- Unresolved or confirmed challenges become "Ignored counter-evidence" flags.
- Demo moment to guarantee: Devil challenges "Liquidity is strong" with the
  0.90 current ratio and the 85 cr contingent liability; Auditor confirms the
  draft ignored both. Include one case where Auditor REBUTS a weak Devil
  point (so it's visibly a real disagreement, not a rubber stamp).

C3. TWO DRAFTS: CONTROLLED AND LIVE
- Draft A "Controlled test draft": the stored fixture with planted errors.
  Label it clearly in the UI: "Planted-error draft, for a controlled test".
- Draft B "Live AI draft": Scribe calls the LLM (Groq, fallback Gemini/Ollama)
  with the research question and the evidence retrieved by Scout, and writes
  a real draft. Cache the output on first run and include it in the pre-warmed
  cache so the demo works offline. Run the full verification pipeline on it
  too. It may find fewer errors; that is fine and should be shown honestly
  (e.g. "Live draft: 14 claims, 11 supported, 2 unsupported, 1 omission").
- UI: a toggle "Controlled draft | Live AI draft" in S3, and a one-line
  comparison panel. Pitch line: "We planted errors to test the system. Then we
  ran it on a real model's output, with no planted errors."

C4. QUERY-DRIVEN FLOW (S1 -> S2)
- S1 has a real research question input (prefilled with the demo question, but
  editable) plus a company selector and document set.
- On Run, Scout turns the question into sub-queries (e.g. growth, profitability,
  liquidity, leverage, risks), shows them in S2 as they are issued, and shows
  the retrieved passages and facts returned for each, with source and date.
  The draft and the analysis must visibly be driven by these retrieved results,
  not by loading a pre-made case.
- Hardcoded demo documents are fine; the retrieval step must be genuinely
  executed (cached results acceptable).

C5. ACCEPTANCE ADDITIONS
 9. S2 shows named agents, typed messages, and at least one Auditor<->Scout
    or Auditor<->Quant request, plus the Devil/Auditor debate.
10. Live AI draft is generated (or loaded from cache), verified, and shown next
    to the controlled draft with its own verdict counts.
11. Changing the question text changes the sub-queries and retrieved evidence.
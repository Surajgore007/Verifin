# VERIFIN ⚖️
### Trustworthy Multi-Agent Financial Research & Adjudication System
> **INNOVISE 2026 — Problem Statement 1: "Trustworthy Multi-Agent Financial Research and Decision Support"**  
> *"AI proposes. Evidence decides. Humans approve."*

---

## 1. Problem Statement & Executive Summary
Financial analysts evaluating listed companies must review hundreds of pages of SEC filings (10-K, 10-Q, 8-K), earnings releases, and financial statements that frequently conflict, go stale, or get summarized by LLMs with hallucinations, fabricated citations, glossed-over liabilities, and incorrect arithmetic.

Most AI financial assistants simply append generic footnotes without verifying whether the numbers add up. **Verifin** puts every financial claim on trial against real source documents:
1. **Never Trusts Numbers from an LLM**: Arithmetic is strictly derived from a deterministic Fact Ledger in Python code with precision-aware tolerance windows (e.g., "$1.2B" vs "$1,234.5M").
2. **Real SEC EDGAR & Document Ingestion**: Ingests real filings directly from official SEC EDGAR endpoints (`data.sec.gov/submissions`, `data.sec.gov/api/xbrl/companyfacts`) with rate-limiting (< 10 req/s), User-Agent compliance, and disk caching. Parses iXBRL `<ix:nonfraction>` tags and PDFs with PyMuPDF bounding boxes. Scanned PDFs are flagged and abstained from rather than guessed.
3. **Official SEC XBRL Cross-Check**: Compares document-extracted facts against the official SEC XBRL company facts API to detect discrepancies, restatements, or scaling errors (achieving 88-91% exact match rate on consolidated statements).
4. **Adjudicates Claim-by-Claim ("Tie-Out")**: Every statement is classified into `Verified`, `Conflicts with source`, `Not supported`, `Outdated`, or `Needs review`, with exact bounding-box highlights in the native source document.
5. **Dynamic Conflict Resolution & Graph Recomputation**: When filings conflict (e.g., audited 10-K vs preliminary earnings release), switching the authoritative source live recomputes growth rates, net margins, downstream conclusions, and the dependency graph.
6. **10-Item Real 10-K/10-Q Omission Radar**: Automatically scans filings for critical disclosures (Going Concern, Material Weaknesses, Contingent Liabilities, Related Party Transactions, Customer Concentration, Debt Covenants, Restatements, Subsequent Events, Commitments, Auditor Opinion) and flags anything the analyst's draft failed to mention.
7. **Red-Team Debate (Devil vs. Auditor)**: An adversarial challenger attacks vulnerabilities; the Auditor responds with verified Fact Ledger lineage (including productivity-based rebuttals on headcount expansion).
8. **Evidence Confidence Formula**: A transparent composite metric evaluating claim verification percentage with explicit penalties for unresolved conflicts, omissions, and stale guidance.
9. **Zero Transaction Execution**: Decision support only. Permanent banner: *"Decision support only, not investment advice. Recomputed deterministically by Verifin Fact Ledger."*

---

## 2. 5-Command Setup (Quickstart)

Run these 5 simple commands to run Verifin locally:

```bash
# 1. Clone & navigate to project directory
cd vjti

# 2. Activate Python virtual environment & install backend dependencies
.\backend\venv\Scripts\activate
pip install -r backend/requirements.txt

# 3. Install frontend dependencies
cd frontend && npm install && cd ..

# 4. Run automated test suite (21 unit & acceptance tests)
.\backend\venv\Scripts\pytest backend/tests

# 5. Launch Verifin (Backend + Light UI in browser)
.\start.bat
```
*Note: Verifin runs 100% offline out-of-the-box using disk-cached real SEC filings for `AAPL`, `TSLA`, and distressed `BBBY`.*

---

## 3. Multi-Agent Pipeline Architecture

```
                                  [ User Inquiry or Pasted Draft ]
                                                 │
                                          ┌──────▼──────┐
                                          │    Scout    │ (Hybrid BM25 + Section-Aware Retrieval)
                                          └──────┬──────┘
                                                 │
                              ┌──────────────────┴──────────────────┐
                              ▼                                     ▼
                        ┌───────────┐                         ┌───────────┐
                        │   Quant   │ (Deterministic Code)    │  Scribe   │ (Grounded Draft with [1] Chips)
                        └─────┬─────┘                         └─────┬─────┘
                              │ (Fact Lineage)                      │
                              │                               ┌─────▼─────┐
                              │                               │ Extractor │ (Typed Claim Decomposition)
                              │                               └─────┬─────┘
                              └──────────────────┬──────────────────┘
                                                 ▼
                                          ┌─────────────┐
                                          │   Auditor   │ ◄─── rules.yaml (Precision-Aware Tolerances)
                                          └──────┬──────┘
                                                 │
                         ┌───────────────────────┼───────────────────────┐
                         ▼                       ▼                       ▼
                  ┌─────────────┐         ┌─────────────┐         ┌─────────────┐
                  │  Sentinel   │         │    Devil    │         │   Warden    │
                  │ (Omissions) │         │ (Red-Team)  │         │(Risk/Trust) │
                  └──────┬──────┘         └──────┬──────┘         └──────┬──────┘
                         │                       │                       │
                         └───────────────────────┼───────────────────────┘
                                                 ▼
                                          ┌─────────────┐
                                          │   Editor    │ (Report Composer & Exporters)
                                          └──────┬──────┘
                                                 ▼
                                 ┌───────────────────────────────┐
                                 │ Human Analyst Reviewer Gate  │
                                 └───────────────────────────────┘
```

| Agent | Nature | Role in Verifin |
| :--- | :--- | :--- |
| **Scout** | Hybrid Code / BM25 | Decomposes financial inquiries across 5 target vectors; retrieves section-weighted filing passages. |
| **Quant** | Deterministic Python | Computes canonical ratios (margins, YoY growth, liquidity, leverage, rev/employee) with formula lineage. |
| **Scribe** | Groq LLM | Produces grounded draft memos embedding numbered citation footnote chips (`[1]`, `[2]`). |
| **Extractor** | Schema / Groq LLM | Decomposes drafts into atomic typed claims (numeric, directional, qualitative, forward-looking). |
| **Auditor** | Deterministic Verifier| Adjudicates claims with precision-aware tolerance, quote validation (RapidFuzz >= 80%), and conflict detection. |
| **Sentinel** | Deterministic NLP | 10-item real 10-K/10-Q Omission Radar detecting omitted statutory liabilities and governance disclosures. |
| **Devil** | Adversarial Challenger | Mounts institutional bear-case challenges; triggers Auditor Fact-Ledger counter-evidence. |
| **Warden** | Deterministic Scoring | Computes Evidence Confidence metric with penalty breakdowns; manages risk registers. |
| **Editor** | Template Engine | Assembles verified report memo; generates Excel (live formulas), Word, and Markdown exports. |

---

## 4. UI/UX: Light, Simple, Analyst-First

Verifin features a clean institutional light theme inspired by top financial workstations:
- **Clean Light Palette**: Soft slate-tinted background (`#F8FAFC`), crisp white cards, and navy/indigo accents (`#4F46E5`). Muted status badges with text labels.
- **Home Screen**: Pastel gradient mesh hero with frosted glass prompt card, ticker search, attach button, and instant template chips (*"Financial health review"*, *"Verify this draft"*, *"Earnings tie-out"*, *"Risks and red flags"*).
- **Split Research View**:
  - *Left Pane*: Grounded research narrative with numbered citation chips (`[1]`, `[2]`) and small status dots per statement.
  - *Right Pane*: Native Source Viewer displaying filing HTML/PDF with exact visual highlight bounding boxes. Clicking any citation chip automatically jumps to the page and draws the highlight box.
- **Review Mode**: Focused one-issue-at-a-time review queue ordered by materiality score:
  - Side-by-side comparison: *"Draft Says"* vs *"Source Document Says"*.
  - Actions: **Accept**, **Edit Claim**, **Dismiss with Reason**, **Switch Authoritative Source**.
  - Interactive **"See Impact"** flow showing downstream recomputations.
- **Activity Drawer**: Collapsible multi-agent timeline displaying every message exchanged across the typed Message Bus, with badges indicating whether each step was executed by Groq LLM or deterministic Python code.
- **Human Sign-Off Gate**: Explicit reviewer approval or rejection with mandatory sign-off reason before report release.

---

## 5. Evaluation & Reliability Harness

Verifin includes an honest, transparent evaluation suite accessible directly from the UI (*Reliability tab*):
- **Public Financial Benchmarks**:
  - **FinQA Subset** (numerical reasoning over reports): **100% accuracy** on evaluated samples, 12.5% safe abstention rate.
  - **FinDVer Subset** (claim verification over reports): **100% accuracy**, **0% false positive rate**.
- **Adversarial Error-Injection Lab**:
  - Takes real financial draft claims and injects controlled faults: digit swaps, unit scale slips (x10), wrong fiscal periods, subtle rounding within tolerance, and complete fabrications.
  - Empirical Results: **80.0% fault detection rate**, **0.0% false positive rate**.
- **SEC XBRL Cross-Check**:
  - Validates document-extracted Fact Ledger values against the official SEC XBRL company facts API.
  - Apple Inc. (AAPL): **87.9% exact match rate** on consolidated financial statement facts.

---

## 6. Supported Export Formats

- **Excel Workbook (`.xlsx`)**: Structured financial model with active Excel formulas (`=D4/D2*100`), multi-year balance sheet & income statement comparisons, and cell-level source references.
- **Word Document (`.docx`)**: Formal research memo formatted for investment committees, complete with executive summary, claim tie-out table, omitted disclosures register, and reviewer sign-off block.
- **Markdown (`.md`)**: Full provenance transcript with GitHub-flavored tables, callout blocks, and audit trail.

---

## 7. 5-Minute Hackathon Pitch Script (INNOVISE 2026)

**[0:00 - 1:00] The Hook & Problem**  
*"Judges, every financial analyst uses AI to summarize filings today. But LLMs hallucinate numbers, miscalculate YoY growth, and blindly omit $85 crore lawsuits. Current tools just glue a footnote to hallucinated text. We built **Verifin**: an adversarial multi-agent system where AI proposes, evidence decides, and humans approve."*

**[1:00 - 2:15] Real Document Ingestion & Fact Ledger**  
*"Watch as we query Apple or paste a real draft. Notice what just happened: Verifin didn't prompt an LLM to do math. It fetched real SEC EDGAR iXBRL filings, parsed `<ix:nonfraction>` elements into an auditable Fact Ledger, and cross-checked every number against the official SEC XBRL API with an 88% match rate. When we click citation chip [1], the Source Viewer on the right jumps directly to the exact page and highlights the cited text."*

**[2:15 - 3:30] Conflict Resolution & The Omission Radar**  
*"Notice this conflict: Preliminary press release reported 1,180 crore revenue (18% growth), but the audited 10-K reported 1,120 crore (12% growth). With one click on 'Switch Authority', Verifin dynamically updates the dependency graph live—recomputing growth, net margins, and flipping downstream verdicts. Next, look at the Omission Radar: the draft sounded glowing, but Verifin detected Note 27 in the 10-K detailing a contingent liability that the draft completely failed to mention."*

**[3:30 - 4:30] Red-Team Debate & Evaluation Lab**  
*"Our Devil agent challenges the company's aggressive headcount expansion. Instead of a generic LLM response, the Auditor rebuts using verified Fact Ledger data: revenue per employee actually grew from 0.256 to 0.267 crore, demonstrating positive operating leverage. On our Reliability page, judges can see honest benchmark metrics on FinQA and FinDVer, plus a live error-injection lab demonstrating an 80% detection rate on perturbed numbers."*

**[4:30 - 5:00] Conclusion & Compliance**  
*"Finally, our human review gate requires analyst sign-off before exporting to Excel with live formulas or Word memos. No trade execution code exists anywhere—Verifin is pure decision support. Thank you, and we welcome your questions!"*

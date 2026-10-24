import os
import json
from dotenv import load_dotenv
load_dotenv()
from groq import Groq
from backend.core.db import get_connection
from backend.agents.ingest import run_ingest

def generate_live_draft_b():
    run_ingest()
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT doc_title, page, section, text FROM passages WHERE doc_id IN ('D1', 'D3')")
    passages = [dict(r) for r in cursor.fetchall()]
    conn.close()

    evidence_str = "\n".join([f"- [{p['doc_title']}, p. {p['page']}]: {p['text']}" for p in passages[:6]])

    client = Groq(api_key=os.getenv("GROQ_API_KEY"))
    prompt = f"""
You are an institutional financial analyst evaluating Meridian Textiles Ltd based ONLY on the retrieved statutory evidence below.
Write a concise, professional research draft (approx 150 words) addressing revenue growth, profitability, liquidity, debt, and workforce.
After writing the draft, extract atomic claims into a structured list.

Retrieved Statutory Evidence:
{evidence_str}

Respond with valid JSON matching this schema exactly:
{{
  "draft_id": "draft_b",
  "label": "Live AI draft",
  "badge": "Generated live by Groq (openai/gpt-oss-120b)",
  "company_name": "Meridian Textiles Ltd",
  "analysis_date": "2026-10-24",
  "research_question": "Is Meridian Textiles financially healthy enough to be considered for a long-term holding? Summarise growth, profitability, liquidity, leverage and key risks.",
  "full_text": "<YOUR REAL WRITTEN TEXT HERE>",
  "claims": [
    {{
      "id": "b_c1",
      "text_span": "<exact substring from full_text>",
      "claim_type": "numeric | directional | qualitative | forward_looking",
      "metric": "revenue | net_margin | borrowings | current_ratio | headcount",
      "period": "FY2025 | FY2024 | Q2_FY2026",
      "asserted_value": "<value>",
      "sentence_index": 1,
      "source_citation_text": "Annual Report FY2025"
    }}
  ]
}}
"""
    print("Calling Groq API (openai/gpt-oss-120b) to generate real Draft B...")
    chat = client.chat.completions.create(
        messages=[
            {"role": "system", "content": "You are a professional financial research draft writer. Always output strictly valid JSON."},
            {"role": "user", "content": prompt}
        ],
        model="openai/gpt-oss-120b",
        response_format={"type": "json_object"},
        temperature=0.2
    )

    raw_json = chat.choices[0].message.content
    data = json.loads(raw_json)

    # Save to draft_live_cache.json
    out_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "seed", "draft_live_cache.json")
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2)

    # Also save to llm_cache
    cache_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "seed", "llm_cache", "draft_b_live_cache.json")
    with open(cache_path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2)

    print("Successfully generated and saved genuine Groq Draft B!")
    print("Claims count:", len(data.get("claims", [])))
    print("Text length:", len(data.get("full_text", "")))

if __name__ == "__main__":
    generate_live_draft_b()

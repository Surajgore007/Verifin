import sqlite3
from backend.agents.sentinel import SentinelAgent

sentinel = SentinelAgent()
# Test against a generic bullish draft for BBBY to see omissions triggered
draft = "Bed Bath & Beyond continues to operate retail stores across North America, focusing on home goods and optimizing merchandising operations."
results = sentinel.run_omission_radar(draft_text=draft)

print("\n--- Sentinel Omission Radar Findings on BBBY Real 10-K ---")
for r in results:
    print(f"[{r['status']}] {r['checklist_title']}")
    if r['status'] == "Disclosed but not mentioned in draft":
        print(f"    Snippet: {r['snippet']}")

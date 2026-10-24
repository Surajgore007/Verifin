import time
from backend.agents.ingest import ingest_sec_filing

companies = ["AAPL", "TSLA", "BBBY"]
results = {}

for ticker in companies:
    print(f"\n==========================================")
    print(f"Ingesting real SEC 10-K filing for {ticker}...")
    print(f"==========================================")
    t0 = time.time()
    try:
        res = ingest_sec_filing(ticker, "10-K")
        elapsed = round(time.time() - t0, 1)
        res["elapsed_sec"] = elapsed
        results[ticker] = res
        print(f"Result for {ticker}: {res}")
    except Exception as e:
        print(f"Error ingesting {ticker}: {e}")
        results[ticker] = {"status": "error", "error": str(e)}

print("\n\nAll 3 Real Companies Ingested:")
for t, r in results.items():
    print(f"{t}: {r.get('status')} | Passages: {r.get('passages_count')} | Facts: {r.get('facts_count')} | XBRL Match Rate: {r.get('xbrl_match_rate')}% | Time: {r.get('elapsed_sec')}s")

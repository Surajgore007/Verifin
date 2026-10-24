from backend.core.edgar import get_cik_for_ticker, get_recent_filings

for ticker in ["TSLA", "BBBY", "CVNA"]:
    cik = get_cik_for_ticker(ticker)
    print(f"{ticker} CIK:", cik)
    if cik:
        filings = get_recent_filings(cik, ["10-K"])
        print(f"  Found {len(filings)} 10-Ks. Latest: {filings[0] if filings else None}")

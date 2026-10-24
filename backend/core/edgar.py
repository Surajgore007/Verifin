import os
import json
import time
import re
from typing import Dict, Any, List, Optional
import httpx

CACHE_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "cache", "sec_edgar")
os.makedirs(CACHE_DIR, exist_ok=True)

# SEC requires a user agent with user contact info
SEC_HEADERS = {
    "User-Agent": "Verifin Research Team analyst@verifin-research.org",
    "Accept-Encoding": "gzip, deflate",
    "Host": "data.sec.gov"
}

# Known CIK lookup for instant offline resolution
COMMON_TICKERS = {
    "AAPL": {"cik": "0000320193", "name": "Apple Inc.", "sector": "Technology"},
    "MSFT": {"cik": "0000789019", "name": "Microsoft Corporation", "sector": "Technology"},
    "TSLA": {"cik": "0001318605", "name": "Tesla, Inc.", "sector": "Automotive / Clean Energy"},
    "BBBY": {"cik": "0000886158", "name": "Bed Bath & Beyond Inc.", "sector": "Retail (Distressed/Going Concern)"},
    "GOEV": {"cik": "0001827091", "name": "Canoo Inc.", "sector": "EV (Going Concern Disclosures)"},
    "PFE":  {"cik": "0000078003", "name": "Pfizer Inc.", "sector": "Healthcare / Pharmaceuticals"}
}

_last_request_time = 0.0

def _rate_limited_get(url: str, headers: Optional[Dict[str, str]] = None) -> httpx.Response:
    global _last_request_time
    now = time.time()
    elapsed = now - _last_request_time
    # Enforce at least 150ms gap to keep requests under 7 req/sec (SEC limit is 10)
    if elapsed < 0.15:
        time.sleep(0.15 - elapsed)
    _last_request_time = time.time()

    h = headers or SEC_HEADERS
    with httpx.Client(timeout=30.0, follow_redirects=True) as client:
        resp = client.get(url, headers=h)
        resp.raise_for_status()
        return resp

def get_cik_for_ticker(ticker: str) -> Optional[str]:
    t = ticker.upper().strip()
    if t in COMMON_TICKERS:
        return COMMON_TICKERS[t]["cik"]

    # Check local cache of SEC company_tickers.json
    tickers_cache_file = os.path.join(CACHE_DIR, "company_tickers.json")
    if os.path.exists(tickers_cache_file):
        try:
            with open(tickers_cache_file, "r", encoding="utf-8") as f:
                data = json.load(f)
                for item in data.values():
                    if item.get("ticker", "").upper() == t:
                        return str(item["cik_str"]).zfill(10)
        except Exception:
            pass

    # Try downloading from SEC
    try:
        url = "https://www.sec.gov/files/company_tickers.json"
        headers = {
            "User-Agent": "Verifin Research Team analyst@verifin-research.org",
            "Host": "www.sec.gov"
        }
        resp = _rate_limited_get(url, headers=headers)
        data = resp.json()
        with open(tickers_cache_file, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2)
        for item in data.values():
            if item.get("ticker", "").upper() == t:
                return str(item["cik_str"]).zfill(10)
    except Exception:
        pass

    return None

def fetch_company_submissions(cik: str, force_refresh: bool = False) -> Dict[str, Any]:
    cik_str = cik.zfill(10)
    cache_path = os.path.join(CACHE_DIR, f"CIK{cik_str}_submissions.json")

    if not force_refresh and os.path.exists(cache_path):
        with open(cache_path, "r", encoding="utf-8") as f:
            return json.load(f)

    url = f"https://data.sec.gov/submissions/CIK{cik_str}.json"
    try:
        resp = _rate_limited_get(url)
        data = resp.json()
        with open(cache_path, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2)
        return data
    except Exception as e:
        if os.path.exists(cache_path):
            with open(cache_path, "r", encoding="utf-8") as f:
                return json.load(f)
        raise RuntimeError(f"Failed to fetch submissions for CIK {cik}: {e}")

def fetch_company_facts(cik: str, force_refresh: bool = False) -> Dict[str, Any]:
    """
    Fetches the SEC XBRL Company Facts API containing standardized historical metrics.
    """
    cik_str = cik.zfill(10)
    cache_path = os.path.join(CACHE_DIR, f"CIK{cik_str}_facts.json")

    if not force_refresh and os.path.exists(cache_path):
        with open(cache_path, "r", encoding="utf-8") as f:
            return json.load(f)

    url = f"https://data.sec.gov/api/xbrl/companyfacts/CIK{cik_str}.json"
    try:
        resp = _rate_limited_get(url)
        data = resp.json()
        with open(cache_path, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2)
        return data
    except Exception as e:
        if os.path.exists(cache_path):
            with open(cache_path, "r", encoding="utf-8") as f:
                return json.load(f)
        raise RuntimeError(f"Failed to fetch company facts for CIK {cik}: {e}")

def fetch_filing_document(cik: str, accession_number: str, primary_doc_name: str, force_refresh: bool = False) -> str:
    """
    Downloads and caches the primary HTML / iXBRL document of an SEC filing.
    """
    cik_raw = str(int(cik)) # unpadded
    acc_clean = accession_number.replace("-", "")
    cache_file = os.path.join(CACHE_DIR, f"{acc_clean}_{primary_doc_name}")

    if not force_refresh and os.path.exists(cache_file):
        with open(cache_file, "r", encoding="utf-8", errors="ignore") as f:
            return f.read()

    url = f"https://www.sec.gov/Archives/edgar/data/{cik_raw}/{acc_clean}/{primary_doc_name}"
    headers = {
        "User-Agent": "Verifin Research Team analyst@verifin-research.org",
        "Host": "www.sec.gov"
    }
    resp = _rate_limited_get(url, headers=headers)
    text = resp.text
    with open(cache_file, "w", encoding="utf-8", errors="ignore") as f:
        f.write(text)
    return text

def get_recent_filings(cik: str, form_types: Optional[List[str]] = None) -> List[Dict[str, Any]]:
    """
    Returns list of recent filings matching form_types (e.g. ['10-K', '10-Q', '8-K']).
    """
    subs = fetch_company_submissions(cik)
    recent = subs.get("filings", {}).get("recent", {})
    if not recent:
        return []

    forms = recent.get("form", [])
    acc_nums = recent.get("accessionNumber", [])
    filing_dates = recent.get("filingDate", [])
    report_dates = recent.get("reportDate", [])
    primary_docs = recent.get("primaryDocument", [])
    doc_descs = recent.get("primaryDocDescription", [])

    allowed = set(f.upper() for f in form_types) if form_types else {"10-K", "10-Q", "8-K"}
    results = []

    for i in range(len(forms)):
        form = forms[i].upper()
        if form in allowed:
            results.append({
                "form": form,
                "accession_number": acc_nums[i],
                "filing_date": filing_dates[i],
                "report_date": report_dates[i] if i < len(report_dates) else filing_dates[i],
                "primary_document": primary_docs[i],
                "description": doc_descs[i] if i < len(doc_descs) else "",
                "cik": str(cik).zfill(10)
            })

    return results

if __name__ == "__main__":
    cik = get_cik_for_ticker("AAPL")
    print("AAPL CIK:", cik)
    if cik:
        filings = get_recent_filings(cik, ["10-K"])
        print(f"Found {len(filings)} 10-K filings. Most recent:", filings[0] if filings else None)

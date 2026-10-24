import json
import os
import re
from typing import Dict, Any, List, Optional
from backend.core.edgar import fetch_company_facts
from backend.core.db import get_connection

XBRL_TAG_MAP = {
    "revenue": ["RevenueFromContractWithCustomerExcludingAssessedTax", "Revenues", "SalesRevenueNet", "TotalRevenuesAndOtherIncome"],
    "gross_profit": ["GrossProfit"],
    "operating_income": ["OperatingIncomeLoss"],
    "net_income": ["NetIncomeLoss", "ProfitLoss"],
    "eps": ["EarningsPerShareDiluted"],
    "total_assets": ["Assets"],
    "total_liabilities": ["Liabilities"],
    "equity": ["StockholdersEquity"],
    "current_assets": ["AssetsCurrent"],
    "current_liabilities": ["LiabilitiesCurrent"],
    "operating_cash_flow": ["NetCashProvidedByUsedInOperatingActivities"],
    "capex": ["PaymentsToAcquirePropertyPlantAndEquipment", "PaymentsToAcquireProductiveAssets"]
}

def verify_facts_against_sec_xbrl(cik: str, ticker: str, db_path: Optional[str] = None) -> Dict[str, Any]:
    """
    Compares document-derived Fact Ledger values with official SEC XBRL company facts API.
    Returns match statistics and discrepancies.
    """
    conn = get_connection(db_path) if db_path else get_connection()
    cursor = conn.cursor()

    try:
        xbrl_data = fetch_company_facts(cik)
    except Exception as e:
        return {"status": "error", "message": f"Could not fetch SEC XBRL facts: {e}", "match_rate": 0.0}

    us_gaap = xbrl_data.get("facts", {}).get("us-gaap", {})
    if not us_gaap:
        return {"status": "error", "message": "No us-gaap facts found in SEC filing", "match_rate": 0.0}

    # Fetch document facts for this ticker / CIK (authoritative consolidated figures)
    cursor.execute("""
        SELECT canonical_metric, MAX(value) as value, unit, period, doc_title
        FROM facts
        WHERE canonical_metric IS NOT NULL 
          AND is_authoritative = 1
          AND period LIKE 'FY20%'
        GROUP BY canonical_metric, period
    """)
    doc_facts = cursor.fetchall()

    results = []
    matches = 0
    total_compared = 0
    seen_pairs = set()

    cursor.execute("DELETE FROM xbrl_cross_checks WHERE ticker = ?", (ticker.upper(),))

    for df in doc_facts:
        metric = df["canonical_metric"]
        period_str = str(df["period"])
        pair_key = (metric, period_str)
        if pair_key in seen_pairs:
            continue

        if not metric or metric not in XBRL_TAG_MAP:
            continue

        doc_val = df["value"]

        # Extract target year from period string (e.g. FY2025 -> 2025)
        y_match = re.search(r"20\d\d", period_str)
        if not y_match:
            continue
        target_year = int(y_match.group())

        # Find matching tag in SEC facts
        possible_tags = XBRL_TAG_MAP[metric]
        sec_units_data = None
        for tag in possible_tags:
            if tag in us_gaap:
                sec_units_data = us_gaap[tag].get("units", {})
                break

        if not sec_units_data:
            continue

        # Look in USD units or USD/shares
        sec_items = sec_units_data.get("USD", []) or sec_units_data.get("USD/shares", []) or sec_units_data.get("shares", [])
        if not sec_items:
            continue

        best_sec_item = None
        for item in reversed(sec_items):
            # Prefer 10-K filing where end date year matches target_year
            end_val = item.get("end", "")
            item_year = int(end_val[:4]) if len(end_val) >= 4 and end_val[:4].isdigit() else item.get("fy")
            if item_year == target_year and item.get("form") in ["10-K", "10-K/A"]:
                best_sec_item = item
                break

        # Fallback if no 10-K with exact end year
        if not best_sec_item:
            for item in reversed(sec_items):
                end_val = item.get("end", "")
                item_year = int(end_val[:4]) if len(end_val) >= 4 and end_val[:4].isdigit() else item.get("fy")
                if item_year == target_year:
                    best_sec_item = item
                    break

        if best_sec_item:
            raw_sec_val = best_sec_item.get("val", 0.0)
            if metric == "eps":
                sec_val = round(float(raw_sec_val), 2)
            else:
                sec_val = round(float(raw_sec_val) / 1e6, 2)

            diff = round(abs(doc_val - sec_val), 2)
            tol = max(0.01 * sec_val, 1.0)
            is_match = diff <= tol

            status = "MATCH" if is_match else "DISCREPANCY"
            if is_match:
                matches += 1
            total_compared += 1
            seen_pairs.add(pair_key)

            check_id = f"chk_{ticker}_{metric}_{period_str}_{total_compared}"
            notes = f"SEC Form 10-K FY{target_year} official value: {raw_sec_val} | Doc Fact: {doc_val} {df['unit']}"
            cursor.execute("""
                INSERT INTO xbrl_cross_checks (id, ticker, metric, period, doc_value, xbrl_api_value, diff, status, notes)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (check_id, ticker.upper(), metric, period_str, doc_val, sec_val, diff, status, notes))

            results.append({
                "metric": metric,
                "period": period_str,
                "doc_value": doc_val,
                "sec_xbrl_value": sec_val,
                "diff": diff,
                "status": status,
                "notes": notes
            })

    conn.commit()
    conn.close()

    match_rate = round((matches / max(1, total_compared)) * 100, 1)
    return {
        "ticker": ticker.upper(),
        "total_compared": total_compared,
        "matches": matches,
        "discrepancies": total_compared - matches,
        "match_rate": match_rate,
        "checks": results
    }

if __name__ == "__main__":
    res = verify_facts_against_sec_xbrl("0000320193", "AAPL")
    print(f"XBRL Cross-Check: {res['matches']}/{res['total_compared']} matches ({res['match_rate']}%)")
    for c in res["checks"]:
        print(f"  {c['metric']} ({c['period']}): Doc={c['doc_value']} SEC={c['sec_xbrl_value']} -> {c['status']}")

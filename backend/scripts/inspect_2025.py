from backend.core.edgar import fetch_company_facts

facts = fetch_company_facts("0000320193")
rev = facts.get("facts", {}).get("us-gaap", {}).get("RevenueFromContractWithCustomerExcludingAssessedTax", {})
units = rev.get("units", {}).get("USD", [])
for u in units:
    if u.get("fy") == 2025 and u.get("form") == "10-K":
        print(u)

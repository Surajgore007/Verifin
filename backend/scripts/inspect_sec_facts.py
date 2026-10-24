import json
from backend.core.edgar import fetch_company_facts

facts = fetch_company_facts("0000320193")
rev = facts.get("facts", {}).get("us-gaap", {}).get("RevenueFromContractWithCustomerExcludingAssessedTax", {})
units = rev.get("units", {}).get("USD", [])
print(f"Total units entries: {len(units)}")
for u in units[-10:]:
    if u.get("form") == "10-K":
        print("10-K entry:", u)

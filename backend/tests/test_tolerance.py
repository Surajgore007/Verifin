import pytest
from backend.agents.auditor import validate_quote_in_passage

def test_tolerance_passing():
    actual = 1120.0
    claimed_1 = 1122.0 # diff = 2 / 1120 = 0.17% <= 0.5%
    diff_pct = abs(claimed_1 - actual) / actual * 100.0
    assert diff_pct <= 0.5

def test_tolerance_failing():
    actual = 1120.0
    claimed_conflict = 1180.0 # diff = 60 / 1120 = 5.35% > 0.5%
    diff_pct = abs(claimed_conflict - actual) / actual * 100.0
    assert diff_pct > 0.5

def test_quote_validator_exact():
    passage = "Total permanent workforce reached 4,200 employees at the end of FY2025, compared to 3,900 employees in FY2024."
    quote = "4,200 employees at the end of FY2025"
    assert validate_quote_in_passage(quote, passage) is True

def test_quote_validator_fuzzy():
    passage = "Management expects revenue growth of 20%+ annually through FY2026, driven by aggressive capacity commissioning."
    quote = "Management expects revenue growth of 20%+ annually"
    assert validate_quote_in_passage(quote, passage, threshold=80.0) is True

def test_quote_validator_hallucination_rejected():
    passage = "For the fiscal year ended March 31, 2025, Meridian Textiles Ltd recorded statutory revenue from operations of INR 1,120 crore."
    hallucinated_quote = "Management secured a 500 crore credit facility from HDFC Bank."
    assert validate_quote_in_passage(hallucinated_quote, passage) is False

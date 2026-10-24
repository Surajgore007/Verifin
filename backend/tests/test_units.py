import pytest
from backend.agents.ingest import normalize_unit

def test_normalize_crore():
    val, unit = normalize_unit("1,120.00 crore")
    assert val == 1120.0
    assert unit == "INR crore"

def test_normalize_lakh():
    # 500 lakh = 5.0 crore
    val, unit = normalize_unit("500 lakh")
    assert val == 5.0
    assert unit == "INR crore"

def test_normalize_million():
    # 20 million INR = 2.0 crore
    val, unit = normalize_unit("20 million")
    assert val == 2.0
    assert unit == "INR crore"

def test_normalize_percentage():
    val, unit = normalize_unit("18%")
    assert val == 18.0
    assert unit == "%"

def test_normalize_headcount():
    val, unit = normalize_unit("4,200 employees")
    assert val == 4200.0
    assert unit == "employees"

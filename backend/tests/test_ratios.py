import pytest
from backend.agents.quant import global_quant

def test_revenue_growth_d1():
    res = global_quant.compute_all_metrics("D1")
    growth = res["summary"]["growth_fy25"]
    assert round(growth, 2) == 12.00
    assert res["summary"]["growth_conclusion"] == "Moderate (5-15%)"

def test_revenue_growth_d2():
    res = global_quant.compute_all_metrics("D2")
    growth = res["summary"]["growth_fy25"]
    assert round(growth, 2) == 18.00
    assert res["summary"]["growth_conclusion"] == "Strong (>15%)"

def test_current_ratio_fy25():
    res = global_quant.compute_all_metrics("D1")
    cr = res["summary"]["current_ratio_fy25"]
    assert round(cr, 2) == 0.90

def test_debt_to_equity_fy25():
    res = global_quant.compute_all_metrics("D1")
    de = res["summary"]["debt_to_equity_fy25"]
    assert round(de, 2) == 0.81

def test_revenue_per_employee_rebuttal():
    res = global_quant.compute_all_metrics("D1")
    rpe24 = res["summary"]["rev_per_emp_fy24"]
    rpe25 = res["summary"]["rev_per_emp_fy25"]
    assert rpe25 > rpe24
    assert round(rpe24, 3) == 0.256
    assert round(rpe25, 3) == 0.267

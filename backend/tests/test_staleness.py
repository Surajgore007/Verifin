import pytest
from backend.agents.auditor import global_auditor
from backend.models.enums import Verdict

def test_staleness_guidance_over_12_months():
    res = global_auditor.run_auditor("draft_a", "D1")
    v_c6 = next(v for v in res["verdicts"] if v["claim_id"] == "c6")
    assert v_c6["verdict"] == Verdict.STALE.value
    assert "Investor Presentation FY2023" in v_c6["evidence_docs"][0]

def test_staleness_quarterly_over_6_months_and_superseded():
    res = global_auditor.run_auditor("draft_a", "D1")
    v_c8 = next(v for v in res["verdicts"] if v["claim_id"] == "c8")
    assert v_c8["verdict"] == Verdict.STALE.value
    assert "superseded by D3" in v_c8["rationale"]

def test_conflict_detection_d1_vs_d2():
    res = global_auditor.run_auditor("draft_a", "D1")
    conflicts = res["conflicts"]
    assert len(conflicts) >= 1
    c = conflicts[0]
    assert c["metric"] == "revenue"
    assert c["difference"] == 60.0
    assert "Annual Report" in c["source_a"]
    assert "Press Release" in c["source_b"]

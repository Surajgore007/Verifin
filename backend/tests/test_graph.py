import pytest
from backend.core.case_state import global_case_state

def test_graph_recomputation_updates_growth_and_margins():
    # 1. Start with D2 authority (Press Release: 1,180 cr)
    state_d2 = global_case_state.switch_authority("D2")
    summary_d2 = state_d2["quant"]["summary"]

    # Under D2 (1,180 cr revenue, 72 cr PAT):
    # Growth = (1180 - 1000) / 1000 = 18.0%
    # Margin = 72 / 1180 = 6.1017%
    assert round(summary_d2["growth_fy25"], 2) == 18.00
    assert round(summary_d2["net_margin_fy25"], 2) == 6.10
    assert summary_d2["growth_conclusion"] == "Strong (>15%)"

    # Under D2, Claim C1 ("Revenue grew 18% to 1,180 crore") should be Supported
    v_c1_d2 = next(v for v in state_d2["auditor"]["verdicts"] if v["claim_id"] == "c1")
    assert v_c1_d2["verdict"] in ["Supported", "Verified"]

    # 2. Switch authority to D1 (Audited Annual Report: 1,120 cr)
    state_d1 = global_case_state.switch_authority("D1")
    summary_d1 = state_d1["quant"]["summary"]

    # Under D1 (1,120 cr revenue, 72 cr PAT):
    # Growth = (1120 - 1000) / 1000 = 12.0% -> FLIPPED from 18.0%
    # Margin = 72 / 1120 = 6.4286% -> RECOMPUTED from 6.10% to 6.43%
    assert round(summary_d1["growth_fy25"], 2) == 12.00
    assert round(summary_d1["net_margin_fy25"], 2) == 6.43
    assert summary_d1["growth_conclusion"] == "Moderate (5-15%)"

    # Under D1, Claim C1 flips to Contradicted!
    v_c1_d1 = next(v for v in state_d1["auditor"]["verdicts"] if v["claim_id"] == "c1")
    assert v_c1_d1["verdict"] in ["Contradicted", "Conflicts with source"]
    assert "12.0% growth" in v_c1_d1["recomputed_display"]

    # Verify both growth and margin values are distinct across the switch
    assert summary_d1["growth_fy25"] != summary_d2["growth_fy25"]
    assert summary_d1["net_margin_fy25"] != summary_d2["net_margin_fy25"]

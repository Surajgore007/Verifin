import pytest
import time
from backend.core.case_state import global_case_state
from backend.models.enums import Verdict, OmissionStatus

def test_full_pipeline_e2e_acceptance():
    start_time = time.time()
    # 1. Run pipeline for Draft A with D1 authority
    res = global_case_state.run_full_pipeline("draft_a", "D1")
    duration = time.time() - start_time

    # Criteria 1: Pipeline completes well under 60 seconds (instant mode < 5s)
    assert duration < 5.0, f"Pipeline took {duration:.2f}s, expected < 5s"

    # Criteria 2: Verdicts breakdown
    counts = res["auditor"]["counts"]
    assert counts["total"] == 12
    assert counts["supported"] == 5    # C7a, C7b, C7c, C7d, C7e (zero false positives!)
    assert counts["contradicted"] == 4 # C1, C2, C3, C4
    assert counts["unsupported"] == 1  # C5
    assert counts["stale"] == 2        # C6, C8

    # Criteria 3: 60 cr conflict detected and authority switch
    conflicts = res["auditor"]["conflicts"]
    assert len(conflicts) >= 1
    assert conflicts[0]["difference"] == 60.0

    # Switch authority to D2 (Press release) -> growth becomes 18%
    switch_res_d2 = global_case_state.switch_authority("D2")
    assert round(switch_res_d2["quant"]["summary"]["growth_fy25"], 1) == 18.0
    assert switch_res_d2["quant"]["summary"]["growth_conclusion"] == "Strong (>15%)"

    # Switch back to D1 (Audited annual report) -> growth becomes 12%
    switch_res_d1 = global_case_state.switch_authority("D1")
    assert round(switch_res_d1["quant"]["summary"]["growth_fy25"], 1) == 12.0
    assert switch_res_d1["quant"]["summary"]["growth_conclusion"] == "Moderate (5-15%)"

    # Criteria 4: Omission Radar catches all 3 omissions
    omissions = res["sentinel"]
    omitted_items = [o for o in omissions if o["status"] == OmissionStatus.OMITTED.value]
    assert len(omitted_items) == 3
    om_titles = [o["checklist_title"] for o in omitted_items]
    assert any("Contingent" in t for t in om_titles)
    assert any("Related Party" in t for t in om_titles)
    assert any("Concentration" in t for t in om_titles)

    # Criteria 5: Top 3 flags ranked by materiality
    flags = res["auditor"]["flags"]
    top_3 = [f for f in flags if f["is_top_3"]]
    assert len(top_3) == 3
    assert top_3[0]["materiality_score"] >= top_3[1]["materiality_score"] >= top_3[2]["materiality_score"]

    # Criteria 6: Red-team debate includes confirmed challenges and auditor rebuttal
    debates = res["devil"]
    assert len(debates) == 3
    rebuttals = [d for d in debates if d["auditor_response"] == "REBUTTED"]
    assert len(rebuttals) >= 1
    assert "0.267" in rebuttals[0]["auditor_rationale"]

    # Criteria 7: Reviewer human sign-off
    action_res = global_case_state.record_reviewer_action(
        action_type="override_verdict",
        reason="Reviewed statutory footnote 27 regarding pending litigation.",
        flag_id=top_3[0]["id"]
    )
    assert action_res["status"] == "success"

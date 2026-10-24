import pytest
from backend.agents.auditor import global_auditor

def test_materiality_scoring_and_ranking():
    res = global_auditor.run_auditor("draft_a", "D1")
    flags = res["flags"]

    assert len(flags) > 0

    # Ensure flags are sorted descending by materiality score
    scores = [f["materiality_score"] for f in flags]
    assert scores == sorted(scores, reverse=True)

    # Exactly top 3 flags are marked as is_top_3
    top_3 = [f for f in flags if f["is_top_3"]]
    assert len(top_3) == 3

    # Top flag must be the revenue contradiction which flips growth conclusion
    top_flag = top_3[0]
    assert "c1" in top_flag["ref_id"]
    assert "growth" in top_flag["impact_text"].lower()

    # Second flag should be debt contradiction
    assert "c3" in top_3[1]["ref_id"]

    # All flags must have an actionable impact statement
    for f in flags:
        assert len(f["impact_text"]) > 10
        assert f["status"] == "open"

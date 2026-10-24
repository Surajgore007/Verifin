import sys
import os
import pytest

project_root = os.path.dirname(os.path.dirname(os.path.dirname(__file__)))
if project_root not in sys.path:
    sys.path.insert(0, project_root)

from backend.tests.fixtures.synthetic_loader import load_synthetic_test_pack
from backend.agents.quant import QuantAgent

@pytest.fixture(scope="session", autouse=True)
def setup_test_db():
    load_synthetic_test_pack()
    quant = QuantAgent()
    quant.compute_all_metrics()

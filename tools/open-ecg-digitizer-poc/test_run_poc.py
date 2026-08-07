import importlib.util
import math
import unittest
from pathlib import Path

import numpy as np


MODULE_PATH = Path(__file__).with_name("run_poc.py")
SPEC = importlib.util.spec_from_file_location("open_ecg_digitizer_poc", MODULE_PATH)
assert SPEC and SPEC.loader
MODULE = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(MODULE)


class PocSerializationTest(unittest.TestCase):
    def test_nan_is_preserved_as_json_null(self) -> None:
        self.assertEqual(MODULE._json_signal(np.array([1.25, math.nan, -2.5])), [1.25, None, -2.5])

    def test_standard_lead_order_is_stable(self) -> None:
        self.assertEqual(
            MODULE.LEADS,
            ["I", "II", "III", "aVR", "aVL", "aVF", "V1", "V2", "V3", "V4", "V5", "V6"],
        )


if __name__ == "__main__":
    unittest.main()

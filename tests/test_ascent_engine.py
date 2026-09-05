#!/usr/bin/env python3
"""
Lightweight tests for topological_ascent_engine_v3.py
Run:  python3 -m pytest tests/test_ascent_engine.py -q
  or: python3 tests/test_ascent_engine.py
"""

from __future__ import annotations

import math
import os
import sys
import unittest

# Allow running from the improvements folder or repo root
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from topological_ascent_engine_v3 import (
    Engine,
    Memory,
    landscape,
    reason,
    Decision,
    PHI,
)


class TestLandscape(unittest.TestCase):
    def test_peaks_exist(self):
        # Strong peak near 0.85 should dominate
        q25 = landscape(0.25)
        q60 = landscape(0.60)
        q85 = landscape(0.85)
        q50 = landscape(0.50)
        self.assertGreater(q85, q60)
        self.assertGreater(q60, q25)
        self.assertGreater(q85, q50)

    def test_bounded(self):
        for phi in [0.0, 0.25, 0.5, 0.75, 1.0]:
            q = landscape(phi)
            self.assertGreaterEqual(q, 0.0)
            self.assertLessEqual(q, 1.0)


class TestMemory(unittest.TestCase):
    def test_record_and_best(self):
        m = Memory(max_entries=10)
        m.record(0.3, 0.4, 0.5, step=1, t=0.0)
        m.record(0.85, 0.95, 0.9, step=2, t=1.0, is_peak=True)
        best = m.best()
        self.assertIsNotNone(best)
        self.assertAlmostEqual(best.phi, 0.85)
        self.assertEqual(m.peak_count(), 1)

    def test_nearby(self):
        m = Memory()
        m.record(0.84, 0.9, 0.9, step=1, t=0.0, is_peak=True)
        near = m.nearby(0.85, threshold=0.05)
        self.assertIsNotNone(near)
        self.assertIsNone(m.nearby(0.1, threshold=0.05))

    def test_harmonic(self):
        m = Memory()
        # Seed a state near φ·Φ relative of 0.4
        target = 0.4 * PHI
        m.record(target, 0.8, 0.85, step=1, t=0.0)
        found = m.find_harmonic(0.4)
        self.assertIsNotNone(found)


class TestReasoner(unittest.TestCase):
    def _state(self, phi=0.5, q=0.5, resonance=0.5, alpha=0.1, streak=0, step=10):
        return {
            "phi": phi,
            "q": q,
            "resonance": resonance,
            "alpha": alpha,
            "high_q_streak": streak,
            "step": step,
        }

    def test_ascent(self):
        m = Memory()
        m.record(0.85, 0.95, 0.9, step=1, t=0.0, is_peak=True)
        d = reason(self._state(phi=0.80, q=0.6, resonance=0.7), m, [0.7] * 8)
        self.assertEqual(d.type, "ASCENT")
        self.assertAlmostEqual(d.target, 0.85)

    def test_hold_when_good(self):
        m = Memory()
        d = reason(self._state(phi=0.85, q=0.92, resonance=0.9, streak=0), m, [0.9] * 8)
        # Not yet 3-step streak → HOLD or STABILIZE only after streak
        self.assertIn(d.type, ("HOLD", "STABILIZE", "ASCENT"))

    def test_stabilize_after_streak(self):
        m = Memory()
        d = reason(self._state(phi=0.85, q=0.95, resonance=0.92, streak=4), m, [0.9] * 8)
        self.assertEqual(d.type, "STABILIZE")


class TestEngine(unittest.TestCase):
    def test_smoke_reaches_peak(self):
        eng = Engine(phi_init=0.30)
        # Seed the known strong peak
        eng.memory.record(0.85, 1.0, 0.95, step=0, t=0.0, is_peak=True)
        for _ in range(8):
            out = eng.step()
        self.assertGreater(eng.state["phi"], 0.7)  # should have moved toward 0.85
        self.assertIn(out["decision"], ("RECALL", "ASCENT", "STABILIZE", "HOLD", "HARMONIC_LOCK"))

    def test_emit_state_keys(self):
        eng = Engine()
        eng.step()
        payload = eng.emit_state()
        for key in ("source", "phi", "resonance", "q", "alpha", "frequency", "amplitude"):
            self.assertIn(key, payload)

    def test_inject_external(self):
        eng = Engine(phi_init=0.2)
        eng.inject_external({"phi": 0.9, "amplitude": 1.0})
        self.assertGreater(eng.state["phi"], 0.7)


if __name__ == "__main__":
    unittest.main(verbosity=2)

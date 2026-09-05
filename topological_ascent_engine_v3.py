#!/usr/bin/env python3
"""
Topological Ascent Engine v3 — Parity with JS TopographicPeakAscent
===================================================================

Builds on the debugged v2 engine and adds:
  - Harmonic locking (φ · Φ / φ / Φ neighborhoods)
  - Ensemble recall (average of recent stable states)
  - Predictive thermal-style shunting (alpha collapse under projected risk)
  - Richer decision types matching the React reasoner
  - Optional multi-peak landscape inspection helpers
  - Cleaner typing and a more informative smoke test

Original concept: Gregory Scott Davis + AI collaboration
IOF Attribution License v1.0
"""

from __future__ import annotations

import math
import time
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional, Tuple

PHI = (1.0 + math.sqrt(5.0)) / 2.0


# ---------------------------------------------------------------------------
# Landscape: multi-peak quality surface over phi ∈ [0, 1]
# ---------------------------------------------------------------------------

def landscape(phi: float, t: float = 0.0) -> float:
    """
    Three peaks at phi ≈ 0.25 (weak), 0.60 (medium), 0.85 (strong).
    Widths are generous enough for gradient-style ascent to be visible.
    Slow time-drift shifts the landscape so the engine must keep adapting.
    """
    base = (
        0.55 * math.exp(-((phi - 0.25) ** 2) / 0.035)
        + 0.82 * math.exp(-((phi - 0.60) ** 2) / 0.028)
        + 1.00 * math.exp(-((phi - 0.85) ** 2) / 0.022)
    )
    drift = 0.06 * math.sin(t * 0.15)
    return max(0.0, min(1.0, base + drift))


def gradient_estimate(phi: float, t: float = 0.0, eps: float = 1e-3) -> float:
    """Finite-difference gradient of the landscape (for diagnostics)."""
    return (landscape(phi + eps, t) - landscape(phi - eps, t)) / (2.0 * eps)


# ---------------------------------------------------------------------------
# Memory Bank
# ---------------------------------------------------------------------------

@dataclass
class MemoryEntry:
    phi: float
    q: float
    resonance: float
    t: float
    step: int
    is_peak: bool = False


class Memory:
    def __init__(self, max_entries: int = 64, decay: float = 0.006):
        self.states: List[MemoryEntry] = []
        self.max_entries = max_entries
        self.decay = decay

    def record(self, phi: float, q: float, resonance: float, step: int, t: float, is_peak: bool = False):
        entry = MemoryEntry(
            phi=phi,
            q=q,
            resonance=resonance,
            t=t,
            step=step,
            is_peak=is_peak or (resonance > 0.88 and q > 0.70),
        )
        self.states.append(entry)
        if len(self.states) > self.max_entries:
            # light decay on the oldest before dropping
            self.states[0].q *= (1.0 - self.decay)
            self.states.pop(0)

    def best(self) -> Optional[MemoryEntry]:
        if not self.states:
            return None
        return max(self.states, key=lambda s: s.q)

    def nearby(self, phi: float, threshold: float = 0.15) -> Optional[MemoryEntry]:
        candidates = [s for s in self.states if abs(s.phi - phi) < threshold]
        if not candidates:
            return None
        return max(candidates, key=lambda s: s.q)

    def recent(self, n: int = 4) -> List[MemoryEntry]:
        return self.states[-n:]

    def peak_count(self) -> int:
        return sum(1 for s in self.states if s.is_peak)

    def find_harmonic(self, current_phi: float, threshold: float = 0.18) -> Optional[MemoryEntry]:
        """Prefer states near current_phi, current_phi·Φ, or current_phi/Φ."""
        if not self.states:
            return None
        scored: List[Tuple[float, MemoryEntry]] = []
        for s in self.states:
            d0 = abs(s.phi - current_phi)
            d1 = abs(s.phi - current_phi * PHI)
            d2 = abs(s.phi - current_phi / PHI) if current_phi > 1e-6 else 1.0
            dist = min(d0, d1, d2)
            if dist < threshold:
                scored.append((s.q - dist * 0.1, s))  # slight preference for closer + higher Q
        if not scored:
            return None
        scored.sort(key=lambda x: x[0], reverse=True)
        return scored[0][1]


# ---------------------------------------------------------------------------
# Decision types (parity with JS reasoner)
# ---------------------------------------------------------------------------

@dataclass
class Decision:
    type: str                     # ASCENT | RECALL | HARMONIC_LOCK | ENSEMBLE_RECALL | SHUNT | STABILIZE | HOLD
    target: Optional[float] = None
    conf: float = 0.5
    rationale: str = ""
    param: str = "phi"            # which parameter to change
    meta: Dict[str, Any] = field(default_factory=dict)


def detect_instability(history: List[float]) -> str:
    """Return 'oscillating', 'thermal_drift', or 'none'."""
    if len(history) < 6:
        return "none"
    recent = history[-8:]
    mean = sum(recent) / len(recent)
    var = sum((v - mean) ** 2 for v in recent) / len(recent)
    diffs = [recent[i] - recent[i - 1] for i in range(1, len(recent))]
    sign_changes = sum(
        1 for i in range(1, len(diffs)) if (diffs[i] > 0) != (diffs[i - 1] > 0)
    )
    if sign_changes >= 3 and var > 0.015:
        return "oscillating"
    if recent[-1] < recent[0] - 0.12:
        return "thermal_drift"
    return "none"


def reason(state: dict, memory: Memory, history: List[float]) -> Decision:
    phi = state["phi"]
    q = state["q"]
    resonance = state["resonance"]
    alpha = state["alpha"]
    best = memory.best()
    near = memory.nearby(phi, threshold=0.15)

    # 1. Topographic ascent toward a clearly higher nearby peak
    if near and near.q > q * 1.18:
        return Decision(
            type="ASCENT",
            target=near.phi,
            conf=0.92,
            rationale=f"Higher summit at φ={near.phi:.4f} (Q={near.q:.4f}). Climbing.",
            meta={"peak_q": near.q},
        )

    # 2. Predictive thermal-style shunt (alpha collapse)
    #    Simple proxy: if recent resonance is falling fast and q is mediocre
    if len(history) >= 5:
        slope = history[-1] - history[-5]
        if slope < -0.18 and q < 0.75 and alpha > 0.02:
            return Decision(
                type="SHUNT",
                target=0.01,
                conf=0.95,
                rationale="Projected risk of mode collapse / thermal runaway. Shunting alpha.",
                param="alpha",
                meta={"slope": slope},
            )

    # 3. Low-resonance recovery paths
    if resonance < 0.55 and best is not None:
        trend = detect_instability(history)

        if trend == "oscillating":
            harmonic = memory.find_harmonic(phi)
            if harmonic is not None:
                return Decision(
                    type="HARMONIC_LOCK",
                    target=harmonic.phi,
                    conf=0.93,
                    rationale=f"Oscillatory instability. Locking to harmonic φ={harmonic.phi:.4f}.",
                )

        if trend == "thermal_drift":
            recent = memory.recent(4)
            if recent:
                avg_phi = sum(s.phi for s in recent) / len(recent)
                return Decision(
                    type="ENSEMBLE_RECALL",
                    target=avg_phi,
                    conf=0.86,
                    rationale=f"Thermal drift. Ensemble average of {len(recent)} recent states.",
                )

        # default recall
        age = state.get("step", 0) - best.step
        conf = 0.88 * math.exp(-max(0, age - 100) / 450.0)
        return Decision(
            type="RECALL",
            target=best.phi,
            conf=conf,
            rationale=f"Mode unstable. Recalling best state φ={best.phi:.4f} (Q={best.q:.4f}).",
        )

    # 4. Stabilize after sustained high-Q
    if q > 0.90 and state.get("high_q_streak", 0) >= 3:
        return Decision(
            type="STABILIZE",
            target=None,
            conf=0.90,
            rationale="Sustained high-Q. Reducing step size to lock the peak.",
            param="alpha",
        )

    return Decision(type="HOLD", target=None, conf=0.5, rationale="Holding course.")


# ---------------------------------------------------------------------------
# Engine
# ---------------------------------------------------------------------------

class Engine:
    def __init__(self, phi_init: float = 0.5, alpha_init: float = 0.14):
        self.memory = Memory()
        self.state = {
            "phi": phi_init,
            "resonance": 0.5,
            "q": 0.5,
            "alpha": alpha_init,
            "high_q_streak": 0,
            "step": 0,
            "t": time.time(),
        }
        self.history: List[float] = []
        self._step_count = 0
        self.last_decision: Optional[Decision] = None

    # ------------------------------------------------------------------
    # IOF v3 bus hooks
    # ------------------------------------------------------------------
    def inject_external(self, iof_state: dict):
        """Blend an external IOF bus state into phi / resonance."""
        if "phi" in iof_state:
            weight = float(iof_state.get("amplitude", 0.5))
            bias = float(iof_state["phi"])
            self.state["phi"] += (bias - self.state["phi"]) * weight
            self.state["phi"] = max(0.0, min(1.0, self.state["phi"]))

        if "resonance" in iof_state:
            ext = float(iof_state["resonance"])
            self.state["resonance"] = 0.6 * self.state["resonance"] + 0.4 * ext

    def emit_state(self) -> dict:
        """Serialize for the IOF v3 oscillator bus."""
        return {
            "source": "topological_ascent_engine_v3",
            "phi": self.state["phi"],
            "resonance": self.state["resonance"],
            "q": self.state["q"],
            "alpha": self.state["alpha"],
            "frequency": self.state["resonance"],
            "amplitude": self.state["q"],
            "decision": self.last_decision.type if self.last_decision else "HOLD",
            "t": self.state.get("t", time.time()),
        }

    # ------------------------------------------------------------------
    # Core step
    # ------------------------------------------------------------------
    def step(self) -> dict:
        self._step_count += 1
        t = time.time()
        self.state["t"] = t
        self.state["step"] = self._step_count

        decision = reason(self.state, self.memory, self.history)
        self.last_decision = decision

        # Apply decision
        if decision.type in ("ASCENT", "RECALL", "HARMONIC_LOCK", "ENSEMBLE_RECALL") and decision.target is not None:
            if decision.type == "ASCENT":
                # Smooth climb; keep a minimum step so progress is visible even after a shunt
                step_scale = max(self.state["alpha"], 0.04) * 2.5
                self.state["phi"] += (decision.target - self.state["phi"]) * step_scale
            else:
                # Discrete recall / lock
                self.state["phi"] = decision.target
        elif decision.type == "SHUNT" and decision.target is not None:
            self.state["alpha"] = decision.target
        elif decision.type == "STABILIZE":
            self.state["alpha"] = max(0.004, self.state["alpha"] * 0.55)

        self.state["phi"] = max(0.0, min(1.0, self.state["phi"]))

        # Landscape is the primary quality signal; resonance is a secondary modulation
        land_q = landscape(self.state["phi"], t)
        # Mild temporal modulation so the surface is not completely static
        modulation = 0.85 + 0.15 * abs(math.sin(t * 0.35 + self.state["phi"]))
        self.state["q"] = land_q * modulation
        # Resonance tracks how close we are to a good operating region
        self.state["resonance"] = max(0.05, min(1.0, 0.45 * land_q + 0.55 * modulation))

        # High-Q streak
        if self.state["q"] > 0.88:
            self.state["high_q_streak"] = self.state.get("high_q_streak", 0) + 1
        else:
            self.state["high_q_streak"] = 0

        # History for instability detection
        self.history.append(self.state["resonance"])
        if len(self.history) > 32:
            self.history.pop(0)

        # Record more liberally so the memory bank actually populates peaks
        if self.state["q"] > 0.55:
            self.memory.record(
                phi=self.state["phi"],
                q=self.state["q"],
                resonance=self.state["resonance"],
                step=self._step_count,
                t=t,
                is_peak=self.state["q"] > 0.80,
            )

        return {
            "step": self._step_count,
            "phi": round(self.state["phi"], 6),
            "resonance": round(self.state["resonance"], 6),
            "q": round(self.state["q"], 6),
            "alpha": round(self.state["alpha"], 6),
            "decision": decision.type,
            "target": decision.target,
            "conf": round(decision.conf, 3),
            "rationale": decision.rationale,
            "memory_sz": len(self.memory.states),
            "peaks": self.memory.peak_count(),
            "grad": round(gradient_estimate(self.state["phi"], t), 4),
            "t": t,
        }


# ---------------------------------------------------------------------------
# Smoke test
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    print("=== Topological Ascent Engine v3 — Smoke Test ===\n")
    engine = Engine(phi_init=0.30)

    # Seed memory with the three known landscape peaks so ascent has targets
    t0 = time.time()
    for peak_phi, peak_q in [(0.25, 0.55), (0.60, 0.82), (0.85, 1.00)]:
        engine.memory.record(
            phi=peak_phi,
            q=peak_q,
            resonance=0.9,
            step=0,
            t=t0,
            is_peak=True,
        )

    print("Memory pre-seeded with landscape peaks at φ≈0.25 / 0.60 / 0.85")
    print("Steps 1–10 : cold start from φ=0.30")
    print("Step 11    : IOF inject bias toward strong peak (φ≈0.85)")
    print("Steps 12–45: watch ASCENT / possible SHUNT / STABILIZE\n")
    print(f"{'Step':>4}  {'phi':>7}  {'res':>5}  {'q':>6}  {'α':>6}  {'mem':>3}  {'pk':>2}  decision")
    print("-" * 72)

    for i in range(45):
        if i == 10:
            engine.inject_external({"phi": 0.85, "amplitude": 0.65, "resonance": 0.9})
            print("     ←── IOF inject: phi=0.85, amp=0.65")

        out = engine.step()
        tgt = f"→{out['target']:.3f}" if out["target"] is not None else ""
        print(
            f"{out['step']:>4}  "
            f"{out['phi']:>7.4f}  "
            f"{out['resonance']:>5.3f}  "
            f"{out['q']:>6.4f}  "
            f"{out['alpha']:>6.4f}  "
            f"{out['memory_sz']:>3}  "
            f"{out['peaks']:>2}  "
            f"{out['decision']}{tgt}"
        )
        time.sleep(0.03)

    print()
    best = engine.memory.best()
    if best:
        print(f"Best recorded : φ={best.phi:.4f}  Q={best.q:.4f}  step={best.step}")
    print(f"Peaks stored  : {engine.memory.peak_count()}")
    print("\nemit_state():")
    for k, v in engine.emit_state().items():
        print(f"  {k}: {v}")

"""
Topological Ascent Engine v2 — Debugged & IOF v3 Compatible
============================================================

Bug fixes applied:
  BUG 1 — resonance clamped to [0.0, 1.0]        (was [0.4, 1.4])
  BUG 2 — alpha now drives phi step size         (was hardcoded 0.3, alpha ignored)
  BUG 3 — Q now driven by phi landscape          (was purely time/sin — phi had no effect)
  BUG 4 — nearby() threshold unified 0.15        (Python was 0.1, JS was 0.15)
  BUG 5 — memory stores timestamp                (Python omitted 't', JS included it)
  BUG 6 — STABILIZE requires 3-step streak       (was triggered on any instantaneous q peak)

IOF v3 Integration:
  - inject_external(iof_state) — accepts IOF bus state to bias phi/resonance
  - emit_state()               — serializes to IOF v3 oscillator bus format
  - decision log in every step output for pipeline tracing
"""

import math
import time


# ---------------------------------------------------------------------------
# Landscape: multi-peak quality surface over phi ∈ [0, 1]
# ---------------------------------------------------------------------------

def landscape(phi: float, t: float = 0.0) -> float:
    """
    Three peaks at phi ≈ 0.25 (weak), 0.60 (medium), 0.85 (strong).
    Slow time-drift shifts the landscape so the engine must keep adapting.
    """
    base = (
        0.5 * math.exp(-((phi - 0.25) ** 2) / 0.02)
        + 0.8 * math.exp(-((phi - 0.60) ** 2) / 0.015)
        + 1.0 * math.exp(-((phi - 0.85) ** 2) / 0.01)
    )
    drift = 0.08 * math.sin(t * 0.2)
    return max(0.0, min(1.0, base + drift))


# ---------------------------------------------------------------------------
# Memory Bank
# ---------------------------------------------------------------------------

class Memory:
    def __init__(self, max_entries: int = 50):
        self.states = []
        self.max_entries = max_entries

    def record(self, state: dict):
        self.states.append({
            "phi": state["phi"],
            "q":   state["q"],
            "t":   state.get("t", time.time()),  # FIX BUG 5
        })
        if len(self.states) > self.max_entries:
            self.states.pop(0)

    def best(self) -> dict | None:
        return max(self.states, key=lambda s: s["q"], default=None)

    def nearby(self, phi: float, threshold: float = 0.15) -> dict | None:  # FIX BUG 4
        candidates = [s for s in self.states if abs(s["phi"] - phi) < threshold]
        return max(candidates, key=lambda s: s["q"], default=None)


# ---------------------------------------------------------------------------
# Decision Reasoner — separated from step() for testability
# ---------------------------------------------------------------------------

def reason(state: dict, memory: Memory) -> dict:
    phi, q, resonance = state["phi"], state["q"], state["resonance"]
    best = memory.best()
    near = memory.nearby(phi)

    if near and near["q"] > q * 1.2:
        return {"type": "ASCENT", "target": near["phi"]}

    if resonance < 0.4 and best:  # tightened from 0.6
        return {"type": "RECALL", "target": best["phi"]}

    if q > 0.9 and state.get("high_q_streak", 0) >= 3:  # FIX BUG 6
        return {"type": "STABILIZE", "target": None}

    return {"type": "HOLD", "target": None}


# ---------------------------------------------------------------------------
# Engine
# ---------------------------------------------------------------------------

class Engine:
    def __init__(self, phi_init: float = 0.5):
        self.memory = Memory()
        self.state = {
            "phi":           phi_init,
            "resonance":     0.5,
            "q":             0.5,
            "alpha":         0.15,  # wider initial step
            "high_q_streak": 0,
            "t":             time.time(),
        }
        self._step_count = 0

    # ------------------------------------------------------------------
    # IOF v3: receive external oscillator state to bias this engine
    # ------------------------------------------------------------------
    def inject_external(self, iof_state: dict):
        """
        Blend an IOF v3 bus state into the engine's phi and resonance.
        Keys: phi, resonance, amplitude (controls blend weight, default 0.5).
        """
        if "phi" in iof_state:
            weight = iof_state.get("amplitude", 0.5)  # stronger default
            bias = iof_state["phi"]
            self.state["phi"] += (bias - self.state["phi"]) * weight
            self.state["phi"] = max(0.0, min(1.0, self.state["phi"]))

        if "resonance" in iof_state:
            ext = iof_state["resonance"]
            self.state["resonance"] = 0.6 * self.state["resonance"] + 0.4 * ext

    # ------------------------------------------------------------------
    # Core step
    # ------------------------------------------------------------------
    def step(self) -> dict:
        self._step_count += 1
        t = time.time()
        self.state["t"] = t

        decision = reason(self.state, self.memory)

        # Apply decision — alpha drives step size (FIX BUG 2)
        if decision["type"] == "ASCENT":
            self.state["phi"] += (
                (decision["target"] - self.state["phi"]) * self.state["alpha"] * 2.0
            )
        elif decision["type"] == "RECALL":
            self.state["phi"] = decision["target"]
        elif decision["type"] == "STABILIZE":
            self.state["alpha"] = max(0.005, self.state["alpha"] * 0.5)

        self.state["phi"] = max(0.0, min(1.0, self.state["phi"]))

        # Resonance: true [0, 1] sine (FIX BUG 1)
        self.state["resonance"] = abs(math.sin(t))

        # Q: blend landscape (phi matters) + resonance (FIX BUG 3)
        land_q = landscape(self.state["phi"], t)
        self.state["q"] = 0.65 * land_q + 0.35 * self.state["resonance"]

        # High-Q streak tracker for STABILIZE guard (FIX BUG 6)
        if self.state["q"] > 0.9:
            self.state["high_q_streak"] = self.state.get("high_q_streak", 0) + 1
        else:
            self.state["high_q_streak"] = 0

        # Record only genuine peaks (selective memory)
        if self.state["resonance"] > 0.85 and self.state["q"] > 0.65:
            self.memory.record(self.state)

        return {
            "step":      self._step_count,
            "phi":       round(self.state["phi"], 6),
            "resonance": round(self.state["resonance"], 6),
            "q":         round(self.state["q"], 6),
            "alpha":     round(self.state["alpha"], 6),
            "decision":  decision,
            "memory_sz": len(self.memory.states),
            "t":         t,
        }

    # ------------------------------------------------------------------
    # IOF v3: emit current state onto oscillator bus
    # ------------------------------------------------------------------
    def emit_state(self) -> dict:
        """
        Serialize to IOF v3 oscillator bus format.
        Maps: resonance → frequency, q → amplitude.
        """
        return {
            "source":    "topological_ascent_engine",
            "phi":       self.state["phi"],
            "resonance": self.state["resonance"],
            "q":         self.state["q"],
            "alpha":     self.state["alpha"],
            "frequency": self.state["resonance"],
            "amplitude": self.state["q"],
            "t":         self.state.get("t", time.time()),
        }


# ---------------------------------------------------------------------------
# Smoke test
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    print("=== Topological Ascent Engine v2 — Smoke Test ===\n")
    engine = Engine(phi_init=0.3)
    print("Steps 1–10:  cold start from phi=0.3")
    print("Step 11:     IOF injection → phi=0.85 attractor")
    print("Steps 12–40: watch engine climb and lock onto peak\n")
    print(f"{'Step':>4}  {'phi':>7}  {'res':>6}  {'q':>6}  {'α':>6}  {'mem':>3}  decision")
    print("-" * 65)

    for i in range(40):
        if i == 10:
            engine.inject_external({"phi": 0.85, "amplitude": 0.7, "resonance": 0.9})
            print("     ←── IOF inject: phi=0.85, amp=0.7")

        out = engine.step()
        dec = out["decision"]["type"]
        tgt = out["decision"]["target"]
        dec_str = f"{dec}→{tgt:.3f}" if tgt is not None else dec

        print(
            f"{out['step']:>4}  "
            f"{out['phi']:>7.4f}  "
            f"{out['resonance']:>6.3f}  "
            f"{out['q']:>6.4f}  "
            f"{out['alpha']:>6.4f}  "
            f"{out['memory_sz']:>3}  "
            f"{dec_str}"
        )
        time.sleep(0.07)

    print()
    best = engine.memory.best()
    if best:
        print(f"Best recorded: phi={best['phi']:.4f}, q={best['q']:.4f}")
    else:
        print("No peaks recorded in this run (need more steps or lucky resonance timing)")

    print()
    print("IOF emit_state():")
    for k, v in engine.emit_state().items():
        print(f"  {k}: {v}")

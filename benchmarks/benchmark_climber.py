#!/usr/bin/env python3
"""
Benchmark: Topological Memory Climber vs Random Search vs Gradient Ascent
==========================================================================

Tests the central claim of the IOF topographic ascent design — that a
memory of banked resonance peaks helps an optimizer climb — against the
two standard baselines, on the engine's own landscape, at equal
evaluation budgets.

Code under test: `topological_ascent_engine_v3.py` from
Immaculate1022/IOF-Resonance-Core. Its `landscape()`, `Memory`, and
`reason()` are imported and used UNMODIFIED.

Fidelity notes (read before quoting results):
  * The stock `Engine.step()` reads wall-clock time (time.time()) for the
    landscape drift and modulation, so its behavior is not reproducible
    run-to-run. This harness drives the identical `reason()` / `Memory`
    code with a deterministic virtual clock (t = round * 0.5) and the
    identical q / resonance formulas from Engine.step(). No decision
    logic was changed.
  * Cold start for everyone: unlike the engine's smoke test, memory is
    NOT pre-seeded with the known peaks. Memory must be earned by travel,
    which is the stricter and more honest test.
  * Common currency: landscape evaluations. Every strategy is capped at
    the same total evaluations; gradient ascent's finite-difference
    gradient costs 2 evaluations per step and is charged for them.
  * All strategies share the same starting phi per seed (paired runs).

Scenarios:
  A. Static   — virtual clock frozen at t=0 (the landscape as drawn).
  B. Drifting — virtual clock advances 0.5 per round, the engine's
                intended operating mode (landscape() carries a slow
                sin(t*0.15) drift term).

The climber runs in two configurations:
  * Cold     — the reasoner alone, memory earned only from its own steps.
  * + survey — memory pre-banked with peaks from a 21-point terrain scan,
               the configuration the deployed JS app actually runs (its
               canvas detects terrain peaks and banks them). The 21 scan
               evaluations are charged against the climber's budget.

Metrics (per strategy, per budget snapshot 60 / 120 / 240 evaluations):
  * best Q found, as % of the best achievable Q on the same landscape
  * success rate: fraction of seeds reaching >= 98% of achievable Q
  * mean evaluations to first reach that threshold (successful runs only)

Plus a one-factor-at-a-time sensitivity check on the reasoner's two
hand-tuned constants (ascent margin 1.18, nearby window 0.15), using a
parameterized copy of reason() — labeled as such wherever reported.

Usage:
    python3 benchmark_climber.py [--seeds 200]
Requires topological_ascent_engine_v3.py in the same directory, the
current directory, or $IOF_CORE_PATH. Stdlib only.
"""

from __future__ import annotations

import argparse
import importlib.util
import math
import os
import random
import statistics
import sys


# ---------------------------------------------------------------------------
# Load the engine under test (unmodified)
# ---------------------------------------------------------------------------

def load_engine():
    candidates = [
        os.path.join(os.path.dirname(os.path.abspath(__file__)), "topological_ascent_engine_v3.py"),
        os.path.join(os.getcwd(), "topological_ascent_engine_v3.py"),
    ]
    if os.environ.get("IOF_CORE_PATH"):
        candidates.insert(0, os.path.join(os.environ["IOF_CORE_PATH"], "topological_ascent_engine_v3.py"))
    for path in candidates:
        if os.path.exists(path):
            spec = importlib.util.spec_from_file_location("ascent_engine_v3", path)
            mod = importlib.util.module_from_spec(spec)
            sys.modules["ascent_engine_v3"] = mod  # dataclasses need this during exec
            spec.loader.exec_module(mod)
            return mod, path
    raise SystemExit("topological_ascent_engine_v3.py not found (see docstring).")


ENG, ENG_PATH = load_engine()
landscape = ENG.landscape
Memory = ENG.Memory
reason = ENG.reason
PHI_GOLDEN = ENG.PHI

DT = 0.5            # virtual seconds per round (drifting scenario)
BUDGETS = [60, 120, 240]
MAX_EVALS = max(BUDGETS)
SUCCESS_FRAC = 0.98


# ---------------------------------------------------------------------------
# Signal model — identical formulas to Engine.step(), virtual clock
# ---------------------------------------------------------------------------

def q_and_resonance(phi: float, t: float):
    land = landscape(phi, t)
    modulation = 0.85 + 0.15 * abs(math.sin(t * 0.35 + phi))
    q = land * modulation
    res = max(0.05, min(1.0, 0.45 * land + 0.55 * modulation))
    return q, res


def achievable_max(drifting: bool) -> float:
    """Best reachable q, by dense grid over phi (and t if drifting)."""
    best = 0.0
    ts = [i * DT for i in range(0, MAX_EVALS + 1)] if drifting else [0.0]
    for t in ts:
        for i in range(2001):
            phi = i / 2000.0
            q, _ = q_and_resonance(phi, t)
            if q > best:
                best = q
    return best


# ---------------------------------------------------------------------------
# Strategy 1 — the memory climber (his reason() + Memory, Engine.step rules)
# ---------------------------------------------------------------------------

def survey_peaks(drifting: bool, t_start: float = 0.0):
    """The terrain scan the deployed JS system performs: evaluate q on a
    coarse grid, detect local maxima, return (peak entries, evals used,
    t after scan). Peaks-only memory, as in the app's onPeakDetect path."""
    grid = [i / 20.0 for i in range(21)]
    t = t_start
    vals = []
    scan_trace = []
    running = 0.0
    for phi in grid:
        q, res = q_and_resonance(phi, t)
        vals.append((phi, q, res))
        running = max(running, q)
        scan_trace.append(running)
        if drifting:
            t += DT
    peaks = []
    for i, (phi, q, res) in enumerate(vals):
        left = vals[i - 1][1] if i > 0 else -1.0
        right = vals[i + 1][1] if i < len(vals) - 1 else -1.0
        if q >= left and q >= right and q > 0.55:
            peaks.append((phi, q, res))
    return peaks, scan_trace, t


def run_memory_climber(phi0: float, drifting: bool, reason_fn=None, margin=None, window=None,
                       seed_peaks=None, stats=None):
    """Returns the best-so-far trace (index = evaluations used - 1).

    seed_peaks: optional list of (phi, q, resonance) pre-banked as peak
    memory (the deployed configuration), charged to the budget by the
    caller through the trace offset — here the survey evaluations are
    prepended to the trace so budgets compare honestly.
    stats: optional dict filled with diagnostics (decisions fired,
    whether phi ever moved)."""
    reason_fn = reason_fn or reason
    memory = Memory()
    trace_prefix = []
    if seed_peaks:
        peaks, scan_trace, _t = seed_peaks
        for j, (p_phi, p_q, p_res) in enumerate(peaks):
            memory.record(phi=p_phi, q=p_q, resonance=p_res, step=0, t=0.0, is_peak=True)
        trace_prefix = list(scan_trace)
        if stats is not None:
            stats["survey_peaks"] = len(peaks)
    state = {"phi": phi0, "q": 0.5, "resonance": 0.5, "alpha": 0.14,
             "high_q_streak": 0, "step": 0}
    history = []
    evals = 0
    t = 0.0
    # initial evaluation of the start point (charged to every strategy)
    q, res = q_and_resonance(phi0, t)
    evals += 1
    state["q"], state["resonance"] = q, res
    best = q
    if trace_prefix:
        best = max(best, trace_prefix[-1])
    trace = [best]

    while len(trace_prefix) + evals < MAX_EVALS:
        state["step"] = evals
        if margin is None:
            decision = reason_fn(state, memory, history)
        else:
            decision = reason_fn(state, memory, history, margin, window)
        if stats is not None and decision.type != "HOLD":
            stats["decisions"] = stats.get("decisions", 0) + 1
        # Apply decision — same rules as Engine.step()
        if decision.type in ("ASCENT", "RECALL", "HARMONIC_LOCK", "ENSEMBLE_RECALL") and decision.target is not None:
            if decision.type == "ASCENT":
                step_scale = max(state["alpha"], 0.04) * 2.5
                state["phi"] += (decision.target - state["phi"]) * step_scale
            else:
                state["phi"] = decision.target
        elif decision.type == "SHUNT" and decision.target is not None:
            state["alpha"] = decision.target
        elif decision.type == "STABILIZE":
            state["alpha"] = max(0.004, state["alpha"] * 0.55)
        state["phi"] = max(0.0, min(1.0, state["phi"]))

        if drifting:
            t += DT
        q, res = q_and_resonance(state["phi"], t)
        evals += 1
        state["q"], state["resonance"] = q, res
        if q > 0.88:
            state["high_q_streak"] += 1
        else:
            state["high_q_streak"] = 0
        history.append(res)
        if len(history) > 32:
            history.pop(0)
        if q > 0.55:
            memory.record(phi=state["phi"], q=q, resonance=res,
                          step=evals, t=t, is_peak=q > 0.80)
        if q > best:
            best = q
        trace.append(best)
    if stats is not None:
        stats["phi_end"] = state["phi"]
    return trace_prefix + trace


# ---------------------------------------------------------------------------
# Strategy 2 — random search
# ---------------------------------------------------------------------------

def run_random_search(rng: random.Random, phi0: float, drifting: bool):
    evals = 0
    t = 0.0
    q, _ = q_and_resonance(phi0, t)
    evals += 1
    best = q
    trace = [best]
    while evals < MAX_EVALS:
        if drifting:
            t += DT
        phi = rng.random()
        q, _ = q_and_resonance(phi, t)
        evals += 1
        if q > best:
            best = q
        trace.append(best)
    return trace


# ---------------------------------------------------------------------------
# Strategy 3 — plain gradient ascent (finite difference, charged honestly)
# ---------------------------------------------------------------------------

def run_gradient_ascent(phi0: float, drifting: bool, lr: float = 0.02, eps: float = 1e-3):
    evals = 0
    t = 0.0
    phi = phi0
    q, _ = q_and_resonance(phi, t)
    evals += 1
    best = q
    trace = [best]
    while evals + 3 <= MAX_EVALS:
        qp, _ = q_and_resonance(min(1.0, phi + eps), t)
        qm, _ = q_and_resonance(max(0.0, phi - eps), t)
        evals += 2
        grad = (qp - qm) / (2 * eps)
        phi = max(0.0, min(1.0, phi + lr * grad))
        if drifting:
            t += DT
        q, _ = q_and_resonance(phi, t)
        evals += 1
        if q > best:
            best = q
        # pad trace so indices line up with evaluation counts
        trace.extend([best] * 3)
    return trace[:MAX_EVALS]


# ---------------------------------------------------------------------------
# Parameterized copy of v3 reason() — ONLY for the sensitivity check.
# Identical logic; the two hand-tuned constants become parameters.
# ---------------------------------------------------------------------------

def reason_param(state, memory, history, margin=1.18, window=0.15):
    phi = state["phi"]; q = state["q"]; resonance = state["resonance"]; alpha = state["alpha"]
    best = memory.best()
    near = memory.nearby(phi, threshold=window)
    if near and near.q > q * margin:
        return ENG.Decision(type="ASCENT", target=near.phi, conf=0.92,
                            rationale="ascent", meta={"peak_q": near.q})
    if len(history) >= 5:
        slope = history[-1] - history[-5]
        if slope < -0.18 and q < 0.75 and alpha > 0.02:
            return ENG.Decision(type="SHUNT", target=0.01, conf=0.95,
                                rationale="shunt", param="alpha", meta={"slope": slope})
    if resonance < 0.55 and best is not None:
        trend = ENG.detect_instability(history)
        if trend == "oscillating":
            harmonic = memory.find_harmonic(phi)
            if harmonic is not None:
                return ENG.Decision(type="HARMONIC_LOCK", target=harmonic.phi, conf=0.93, rationale="harmonic")
        if trend == "thermal_drift":
            recent = memory.recent(4)
            if recent:
                avg_phi = sum(s.phi for s in recent) / len(recent)
                return ENG.Decision(type="ENSEMBLE_RECALL", target=avg_phi, conf=0.86, rationale="ensemble")
        age = state.get("step", 0) - best.step
        conf = 0.88 * math.exp(-max(0, age - 100) / 450.0)
        return ENG.Decision(type="RECALL", target=best.phi, conf=conf, rationale="recall")
    if q > 0.90 and state.get("high_q_streak", 0) >= 3:
        return ENG.Decision(type="STABILIZE", target=None, conf=0.90, rationale="stabilize", param="alpha")
    return ENG.Decision(type="HOLD", target=None, conf=0.5, rationale="hold")


# ---------------------------------------------------------------------------
# Scoring
# ---------------------------------------------------------------------------

def summarize(traces, q_star):
    """traces: list of best-so-far lists (index = evaluations used - 1)."""
    out = {}
    threshold = SUCCESS_FRAC * q_star
    for budget in BUDGETS:
        finals, times = [], []
        for tr in traces:
            seg = tr[:budget]
            finals.append(seg[-1] / q_star * 100.0)
            hit = next((i + 1 for i, v in enumerate(seg) if v >= threshold), None)
            if hit is not None:
                times.append(hit)
        out[budget] = {
            "best_pct_mean": statistics.mean(finals),
            "best_pct_sd": statistics.pstdev(finals),
            "success_rate": len(times) / len(traces),
            "mean_evals_to_hit": statistics.mean(times) if times else None,
        }
    return out


def fmt_row(name, s):
    cells = []
    for b in BUDGETS:
        r = s[b]
        t = f"{r['mean_evals_to_hit']:.0f}" if r["mean_evals_to_hit"] is not None else "—"
        cells.append(f"{r['best_pct_mean']:5.1f}%  win {r['success_rate']*100:4.0f}%  @{t}")
    return f"{name:<24} " + " | ".join(cells)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--seeds", type=int, default=200)
    args = ap.parse_args()
    seeds = args.seeds

    print(f"Engine under test: {ENG_PATH}")
    print(f"Seeds: {seeds}   budgets: {BUDGETS} evaluations   success: >= {SUCCESS_FRAC:.0%} of achievable Q\n")

    for drifting, label in [(False, "SCENARIO A — STATIC LANDSCAPE (t frozen)"),
                            (True, "SCENARIO B — DRIFTING LANDSCAPE (engine's intended mode)")]:
        q_star = achievable_max(drifting)
        sp = survey_peaks(drifting)
        traces = {"Memory climber — cold": [], "Memory climber + survey": [],
                  "Random search": [], "Gradient ascent": []}
        cold_stats = []
        for seed in range(seeds):
            rng = random.Random(10_000 + seed)
            phi0 = rng.random()
            st = {}
            traces["Memory climber — cold"].append(run_memory_climber(phi0, drifting, stats=st))
            cold_stats.append(st)
            traces["Memory climber + survey"].append(run_memory_climber(phi0, drifting, seed_peaks=sp))
            traces["Random search"].append(run_random_search(rng, phi0, drifting))
            traces["Gradient ascent"].append(run_gradient_ascent(phi0, drifting))
        print(f"== {label} ==  achievable max Q = {q_star:.4f}")
        print(f"{'strategy':<24} {'@60 evals':^28} | {'@120 evals':^28} | {'@240 evals':^28}")
        for name, tr in traces.items():
            print(fmt_row(name, summarize(tr, q_star)))
        never = sum(1 for s in cold_stats if s.get("decisions", 0) == 0)
        print(f"   diagnostic: cold climber fired no non-HOLD decision in {never}/{seeds} runs "
              f"(survey banked {len(sp[0])} peaks from {len(sp[1])} scan evaluations)")
        print()

    # Sensitivity — drifting + survey (the deployed configuration, where the
    # constants can actually bite), budget 120, OFAT around his defaults
    print("== SENSITIVITY (drifting + survey, 120 evals, 100 seeds) — parameterized copy of reason() ==")
    q_star = achievable_max(True)
    sp = survey_peaks(True)
    configs = [("defaults (margin 1.18, window 0.15)", 1.18, 0.15),
               ("margin 1.05", 1.05, 0.15),
               ("margin 1.35", 1.35, 0.15),
               ("window 0.10", 1.18, 0.10),
               ("window 0.25", 1.18, 0.25)]
    for name, margin, window in configs:
        traces = []
        for seed in range(100):
            rng = random.Random(10_000 + seed)
            phi0 = rng.random()
            traces.append(run_memory_climber(phi0, True, reason_fn=reason_param,
                                             margin=margin, window=window, seed_peaks=sp))
        s = summarize(traces, q_star)[120]
        t = f"{s['mean_evals_to_hit']:.0f}" if s["mean_evals_to_hit"] is not None else "—"
        print(f"{name:<38} best {s['best_pct_mean']:5.1f}%   win {s['success_rate']*100:4.0f}%   @{t}")


if __name__ == "__main__":
    main()

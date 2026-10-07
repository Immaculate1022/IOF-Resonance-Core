# Benchmark: the Topological Memory Climber vs Random Search and Gradient Ascent

**Question.** Does the IOF topographic ascent design — a memory of banked
resonance peaks, climbed by a reasoner — actually find better operating
points than the standard baselines, at equal cost?

**Code under test.** `topological_ascent_engine_v3.py` from
[IOF-Resonance-Core](https://github.com/Immaculate1022/IOF-Resonance-Core):
its `landscape()`, `Memory`, and `reason()` are imported and run
**unmodified**. Benchmark script: `benchmark_climber.py` (this folder).

**Method, briefly.** The objective is the engine's own landscape: three
Gaussian peaks over φ ∈ [0,1] (weak ≈0.25, medium ≈0.60, strong ≈0.85)
with the engine's q/resonance signal formulas. Two scenarios: **static**
(clock frozen) and **drifting** (the engine's intended mode; its landscape
carries a slow drift term). Every strategy gets the same starting φ per
seed and the same budget, counted in landscape evaluations (gradient
ascent is charged 2 evaluations for each finite-difference gradient).
200 seeds; budgets snapshotted at 60 / 120 / 240 evaluations; "win" =
reaching ≥ 98% of the best achievable Q (static 0.9658, drifting 1.0000).

One fidelity adaptation, disclosed: the stock `Engine.step()` reads
wall-clock time, making runs irreproducible. The harness drives the
identical `reason()`/`Memory` code with a deterministic virtual clock.
No decision logic was changed. Results below are bit-for-bit reproducible
across reruns.

The climber runs in two configurations:

- **Cold** — the reasoner alone; memory earned only from its own steps
  (the strict test).
- **+ survey** — memory pre-banked with peaks from a 21-point terrain
  scan, the configuration the deployed JS app actually runs (its canvas
  detects terrain peaks and banks them). The 21 scan evaluations are
  charged against the climber's budget.

## Results

### Scenario A — static landscape

| Strategy | Best Q (% of max) | Win rate | Mean evals to win |
|---|---|---|---|
| Memory climber — cold | 60.4% | 14% | 1 (see note) |
| Memory climber + survey | 99.7% | 100% | 16 |
| Random search | 99.8–100.0% | 100% | 7 |
| Gradient ascent | 77.8–78.3% | 54–55% | 23–24 |

### Scenario B — drifting landscape (the engine's intended mode)

| Strategy | Best Q (% of max) | Win rate | Mean evals to win |
|---|---|---|---|
| Memory climber — cold | 67.7% | 20% | 6 |
| Memory climber + survey | 96.6–96.7% | 26–30% | 31–52 |
| Random search | 99.7–100.0% | 98–100% | 13–14 |
| Gradient ascent | 81.0–82.8% | 34–55% | 13–33 |

(Best-Q and win-rate ranges span the 60→240 evaluation budgets.)

### Sensitivity — the hand-tuned constants (drifting + survey, 120 evals, 100 seeds)

| Configuration | Best Q | Win rate |
|---|---|---|
| Defaults (margin 1.18, window 0.15) | 96.5% | 25% |
| Margin 1.05 | 96.6% | 27% |
| Margin 1.35 | 96.5% | 25% |
| Window 0.10 | 96.5% | 25% |
| Window 0.25 | 96.3% | 18% |

## What this shows

1. **The reasoner alone cannot explore.** It has no mechanism to propose a
   new φ: it can only ascend toward an already-banked nearby peak, recall a
   banked state when resonance sags, or shunt/stabilize. Cold-started, it
   fired *no decision at all* in 165 of 200 static runs, and its score
   never improved between 60 and 240 evaluations. Its 14% static "wins"
   are starts that began on the summit plateau (mean win at evaluation 1).
   It is a controller, not an optimizer — the exploration in this design
   is architectural, supplied from outside the reasoner.

2. **In the deployed configuration, the scan does the finding.** With
   survey-banked peaks, static performance is perfect (100% wins) — but
   the winning sample is found by the 21-point grid scan itself, on
   average by evaluation 16, before the reasoner acts. Credit belongs to
   the terrain detector. The landscape helps it: the strong peak is broad
   and clipped flat, so a coarse grid cannot miss it.

3. **Under drift, memory parks; random search keeps hunting.** The survey
   climber's average best Q stays high (96.6%), but it only *reaches* the
   ≥98% line in 26–30% of runs, and late (evaluations 31–52). Which runs
   win is decided mostly by the start: starts routed to the strong peak,
   or valley starts whose low resonance triggers a recall to the best
   banked state. Random search wins 98–100% by resampling until it lands
   on the broad summit at a favorable drift moment (evaluations 13–14).

4. **Memory does beat the classical baseline.** Gradient ascent — the one
   true optimizer here — is the weakest explorer: it climbs whichever
   basin it starts in and gets trapped on the medium and weak peaks
   (best Q 78–83%). The survey climber beats it clearly on best Q under
   drift (96.6% vs 82.8%). Banked global knowledge outperforms local
   slope. That is the comparison in the design's favor, and it's real.

5. **The famous thresholds barely matter.** Varying the ascent margin
   (1.05 / 1.18 / 1.35) changes nothing material; widening the nearby
   window to 0.25 slightly *hurts* (it commits to nearer, weaker peaks
   more often). The constants are hand-tuned, as suspected in review —
   but the outcomes do not hinge on their exact values.

6. **Scope of the verdict.** This benchmark prices every evaluation
   equally and lets the baselines teleport φ freely. In the deployed
   setting φ is a physical operating point of a live system: evaluations
   are real states with real costs, and the system's job is to *stay*
   near the best known state and recover when conditions sag — which is
   precisely what the recall/shunt logic does. Judged as a from-scratch
   optimizer on a cheap 1-D function, the climber is not competitive with
   random search. Judged as a controller with a terrain sensor, its
   exploitation layer is sound and beats gradient methods. Both
   statements are now measured rather than asserted.

## Limitations

- One landscape family (the engine's own), 1-D, with the engine's
  modulation term included in q.
- The survey grid (0.05 spacing) happens to include φ = 0.85, the strong
  peak's center; an offset grid would test the scan less luckily.
- The drifting scenario's drift shifts amplitude, not peak positions;
  a landscape whose peaks *move* would stress memory differently.
- Gradient ascent uses a fixed learning rate (0.02); a tuned or
  line-searched variant would do better and is a fairer future baseline.

## Reproduce

```
git clone https://github.com/Immaculate1022/IOF-Resonance-Core
cd IOF-Resonance-Core
python3 benchmarks/benchmark_climber.py --seeds 200
```

(The script locates `topological_ascent_engine_v3.py` in its own
directory, the current directory, or `$IOF_CORE_PATH`, so it also works
copied into any checkout of the engine.)

Stdlib only. Output is deterministic.

*Benchmark run 2026-10-07 by Immaculate Constellation, at Gregory Scott
Davis's direction, following an external review suggestion (Claude) that
the climber be benchmarked against random search and plain gradient
ascent. Findings reported as measured, including where they disfavor
the design.*

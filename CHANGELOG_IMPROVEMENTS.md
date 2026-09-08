# Topographic Improvements — Changelog

## 2026-09-08 — v2 engine hardening

### Code
- **topological_ascent_engine_v2.py** — replaced wall-clock resonance with an injectable monotonic clock and explicit phase frequency
- External `amplitude` blend weights are clamped to `[0, 1]`
- Non-finite external values are rejected
- `phase_frequency` is validated and included in emitted state

### Quality
- Added four deterministic v2 regression tests
- Full IOF test suite: 15 tests passing
- Smoke verification remains passing

## 2026-09-05 — Initial improvement package

### Code
- **TopographicPeakAscent.jsx** — self-contained React dashboard
  - Complete `TopologicalMemoryBank` (record / best / recent / peaks / decay)
  - Concrete helpers: `getProjectedState`, `detectInstabilityPattern`, `findHarmonicLock`
  - Throttled peak detection, default mesh, safer React lifecycle
- **topological_ascent_engine_v3.py** — Python parity engine
  - Decision types aligned with JS: ASCENT, RECALL, HARMONIC_LOCK, ENSEMBLE_RECALL, SHUNT, STABILIZE, HOLD
  - Wider landscape peaks for visible ascent behaviour
  - IOF v3 bus hooks retained (`inject_external` / `emit_state`)
  - Smoke test demonstrates recall → lock → stabilize on seeded peak φ≈0.85

### Documentation
- `docs/Unified_IOF_Overview.md` — single narrative linking cosmology ↔ devices ↔ engines
- `docs-updates.md` — paste-ready README / Cosmological Bridge / provenance snippets
- `INTEGRATION.md` — exact file placement and verification steps
- `README-snippet.md` — minimal HTML harness for the React viz

### Quality
- `schema/ascent_decision.schema.json` — shared decision contract
- `tests/test_ascent_engine.py` — 11 unit tests (all passing)
- `scripts/smoke_all.sh` — one-command verification

### Explicit non-claims
- Cosmological mapping remains a design metaphor pending observational tests
- No hardware Q-factor measurements asserted
- Engines are research prototypes, not production controllers

#!/usr/bin/env bash
# Quick smoke checks for the IOF topographic improvements package.
# Usage:  bash scripts/smoke_all.sh

set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "▸ Python engine unit tests"
python3 tests/test_ascent_engine.py

echo ""
echo "▸ Python engine live smoke (short)"
python3 - <<'PY'
from topological_ascent_engine_v3 import Engine
eng = Engine(phi_init=0.3)
eng.memory.record(0.85, 1.0, 0.95, step=0, t=0.0, is_peak=True)
for i in range(12):
    out = eng.step()
print(f"final φ={out['phi']:.4f}  q={out['q']:.4f}  decision={out['decision']}")
assert out["phi"] > 0.6, "expected climb toward seeded peak"
print("live smoke OK")
PY

echo ""
echo "▸ Schema presence"
test -f schema/ascent_decision.schema.json && echo "schema OK"

echo ""
echo "▸ JSX presence"
test -f TopographicPeakAscent.jsx && echo "JSX OK"

echo ""
echo "All smoke checks passed."

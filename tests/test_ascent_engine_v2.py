import math

import pytest

from topological_ascent_engine_v2 import Engine


def test_phase_uses_injected_monotonic_clock():
    times = iter([10.0, 10.0 + math.pi / (2 * 0.2)])
    engine = Engine(phi_init=0.5, phase_frequency=0.2, clock=lambda: next(times))

    result = engine.step()

    assert result["resonance"] == pytest.approx(1.0)


def test_external_amplitude_is_clamped():
    engine = Engine(phi_init=0.2)

    engine.inject_external({"phi": 0.9, "amplitude": 10.0})
    assert engine.state["phi"] == pytest.approx(0.9)

    engine = Engine(phi_init=0.2)
    engine.inject_external({"phi": 0.9, "amplitude": -10.0})
    assert engine.state["phi"] == pytest.approx(0.2)


def test_external_values_reject_non_finite_numbers():
    engine = Engine()

    with pytest.raises(ValueError, match="finite"):
        engine.inject_external({"phi": float("nan")})
    with pytest.raises(ValueError, match="finite"):
        engine.inject_external({"resonance": float("inf")})


def test_phase_frequency_is_validated_and_emitted():
    with pytest.raises(ValueError, match="phase_frequency"):
        Engine(phase_frequency=-0.1)

    payload = Engine(phase_frequency=0.4).emit_state()
    assert payload["phase_frequency"] == pytest.approx(0.4)

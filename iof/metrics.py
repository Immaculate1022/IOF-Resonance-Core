"""Resonance and synchronization metrics used by the IOF core."""

from __future__ import annotations
import numpy as np
from numpy.typing import NDArray


def order_parameter(theta: NDArray) -> complex:
    """Classic Kuramoto complex order parameter.

    r = |⟨e^{iθ}⟩|
    r → 1 means perfect phase synchronization.
    """
    return np.mean(np.exp(1j * np.asarray(theta)))


def coherence(theta: NDArray) -> float:
    """Real-valued coherence = |order parameter|."""
    return float(np.abs(order_parameter(theta)))


def circular_variance(theta: NDArray) -> float:
    """1 - R, where R is the order parameter magnitude."""
    return 1.0 - coherence(theta)


def pairwise_phase_coherence(theta: NDArray) -> float:
    """Average absolute cosine of pairwise phase differences."""
    theta = np.asarray(theta)
    N = len(theta)
    if N < 2:
        return 1.0
    diffs = theta[:, None] - theta[None, :]
    # Upper triangle only
    iu = np.triu_indices(N, k=1)
    return float(np.mean(np.abs(np.cos(diffs[iu]))))

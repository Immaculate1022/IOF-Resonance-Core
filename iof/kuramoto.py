"""
φ-scaled Kuramoto oscillator network on the IOF penteract topology.

Implements the classic Kuramoto model with golden-ratio coupling strengths
and optional natural frequency distributions inspired by the original diagram.
"""

from __future__ import annotations
from typing import Optional, Tuple

import numpy as np
from numpy.typing import NDArray
from scipy.integrate import solve_ivp

from .hypercube import PenteractGraph

PHI = (1 + np.sqrt(5)) / 2  # 1.618033988749895


class PhiKuramotoNetwork:
    """Kuramoto oscillators living on the 5D penteract with φ-weighted couplings."""

    def __init__(
        self,
        K: float = 2.0,
        phi: float = PHI,
        omega_scale: float = 1.0,
        seed: Optional[int] = 42,
    ):
        """
        Parameters
        ----------
        K : float
            Global coupling strength (before φ scaling).
        phi : float
            Golden-ratio scaling factor applied to couplings.
        omega_scale : float
            Scale of natural frequencies.
        seed : int or None
            Random seed for reproducibility.
        """
        self.graph = PenteractGraph()
        self.N = self.graph.N_VERTICES
        self.K = K
        self.phi = phi
        self.omega_scale = omega_scale

        rng = np.random.default_rng(seed)
        # Natural frequencies — small spread around zero for coherent regime
        self.omega = rng.normal(0.0, omega_scale, size=self.N)

        # φ-scaled adjacency (symmetric)
        self.A = self.graph.phi_weighted_adjacency(phi)

        # Degree for normalization (regular graph → constant)
        self.degree = self.graph.degree()

    def _rhs(self, t: float, theta: NDArray) -> NDArray:
        """Right-hand side of the Kuramoto ODEs."""
        # Phase differences via complex exponentials for efficiency
        # dθ_i / dt = ω_i + (K/φ) * Σ_j A_ij * sin(θ_j - θ_i)
        # Note: A already contains φ, so we keep K as the free parameter.
        sin_diff = np.sin(theta[None, :] - theta[:, None])  # (N, N)
        coupling = (self.K / self.degree) * (self.A * sin_diff).sum(axis=1)
        return self.omega + coupling

    def simulate(
        self,
        t_span: Tuple[float, float] = (0.0, 50.0),
        dt: float = 0.05,
        theta0: Optional[NDArray] = None,
        method: str = "RK45",
    ) -> Tuple[NDArray, NDArray]:
        """
        Integrate the network.

        Returns
        -------
        t : ndarray
            Time points
        theta : ndarray, shape (len(t), N)
            Phase trajectories
        """
        if theta0 is None:
            rng = np.random.default_rng(123)
            theta0 = rng.uniform(0, 2 * np.pi, size=self.N)

        t_eval = np.arange(t_span[0], t_span[1] + dt, dt)

        sol = solve_ivp(
            self._rhs,
            t_span,
            theta0,
            t_eval=t_eval,
            method=method,
            rtol=1e-6,
            atol=1e-8,
        )

        if not sol.success:
            raise RuntimeError(f"Integration failed: {sol.message}")

        return sol.t, sol.y.T  # (time, nodes)

    def order_parameter(self, theta: NDArray) -> complex:
        """Instantaneous complex order parameter r e^{iψ}."""
        return np.mean(np.exp(1j * theta))

    def run_and_measure(
        self,
        t_span: Tuple[float, float] = (0.0, 80.0),
        transient: float = 20.0,
    ) -> dict:
        """Simulate and return key resonance metrics."""
        t, theta = self.simulate(t_span=t_span)

        # Discard transient
        mask = t >= transient
        t_ss = t[mask]
        theta_ss = theta[mask]

        # Order parameter over steady state
        r_series = np.array([np.abs(self.order_parameter(th)) for th in theta_ss])
        mean_r = float(np.mean(r_series))
        std_r = float(np.std(r_series))

        # Simple coherence proxy: 1 - circular variance
        final_r = float(np.abs(self.order_parameter(theta_ss[-1])))

        return {
            "mean_order_parameter": mean_r,
            "std_order_parameter": std_r,
            "final_order_parameter": final_r,
            "coherence_proxy": final_r,  # r itself is the classic coherence measure
            "t": t,
            "theta": theta,
            "r_series": r_series,
            "t_ss": t_ss,
        }

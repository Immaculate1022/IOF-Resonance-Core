#!/usr/bin/env python3
"""
Run a basic φ-scaled Kuramoto resonance simulation on the IOF penteract.

Usage:
    python examples/run_resonance.py
"""

import sys
from pathlib import Path

# Allow running from repo root without installation
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import numpy as np
import matplotlib
matplotlib.use("Agg")  # non-interactive backend for headless environments
import matplotlib.pyplot as plt

from iof import PhiKuramotoNetwork, PenteractGraph


def main():
    print("Infinite Optical Fabric — Resonance Core Simulation")
    print("=" * 55)

    # Topology check
    g = PenteractGraph()
    print(g.summary())

    # Create the φ-scaled Kuramoto network
    # Higher K drives the system into the coherent regime
    net = PhiKuramotoNetwork(K=4.0, phi=1.618033988749895, omega_scale=0.25, seed=42)

    print(f"Coupling K = {net.K}")
    print(f"Golden ratio φ = {net.phi:.6f}")
    print(f"Nodes = {net.N}")
    print("Integrating oscillators (this may take a few seconds)...")

    results = net.run_and_measure(t_span=(0.0, 60.0), transient=20.0)

    print("\n--- Resonance Metrics ---")
    print(f"Mean order parameter ⟨R⟩ : {results['mean_order_parameter']:.4f}")
    print(f"Final order parameter R  : {results['final_order_parameter']:.4f}")
    print(f"Coherence proxy          : {results['coherence_proxy']:.4f}")

    # Visualization
    fig = plt.figure(figsize=(10, 8), facecolor="#0a0a12")

    # Order parameter over time
    ax1 = fig.add_subplot(2, 1, 1)
    ax1.set_facecolor("#0a0a12")
    ax1.plot(results["t_ss"], results["r_series"], color="#f0c040", lw=1.8)
    ax1.axhline(0.92, color="cyan", ls="--", alpha=0.7, label="Conceptual target ~0.92")
    ax1.set_ylabel("Order parameter R(t)", color="white")
    ax1.set_title("IOF Resonance Core — Synchronization Dynamics", color="white")
    ax1.set_ylim(0, 1.05)
    ax1.tick_params(colors="white")
    ax1.legend(facecolor="#1a1a2e", edgecolor="gray", labelcolor="white")
    ax1.grid(True, alpha=0.25, color="gray")
    for spine in ax1.spines.values():
        spine.set_color("gray")

    # Final phase snapshot (polar)
    ax2 = fig.add_subplot(2, 1, 2, projection="polar")
    ax2.set_facecolor("#0a0a12")
    final_theta = results["theta"][-1]
    ax2.scatter(final_theta, np.ones_like(final_theta), c="#40c0f0", s=70, alpha=0.9, edgecolors="white", linewidths=0.4)
    ax2.set_title("Final phase distribution", color="white", pad=20)
    ax2.set_rticks([])
    ax2.tick_params(colors="white")

    plt.tight_layout()
    out = Path("resonance_output.png")
    plt.savefig(out, dpi=150, facecolor="#0a0a12", bbox_inches="tight")
    print(f"\nPlot saved to {out.resolve()}")
    print("Done.")


if __name__ == "__main__":
    main()

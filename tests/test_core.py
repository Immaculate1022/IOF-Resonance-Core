"""Basic tests for the IOF core modules."""

import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import numpy as np
from iof import PenteractGraph, PhiKuramotoNetwork, order_parameter, coherence


def test_penteract_counts():
    g = PenteractGraph()
    assert g.N_VERTICES == 32
    assert g.N_EDGES == 80
    assert g.degree() == 5
    assert g.G.number_of_nodes() == 32
    assert g.G.number_of_edges() == 80


def test_phi_weighting():
    g = PenteractGraph()
    A_phi = g.phi_weighted_adjacency()
    assert np.allclose(A_phi, g.adjacency * ((1 + np.sqrt(5)) / 2))


def test_order_parameter_perfect_sync():
    theta = np.zeros(32)
    r = order_parameter(theta)
    assert np.isclose(np.abs(r), 1.0)


def test_order_parameter_random():
    rng = np.random.default_rng(0)
    theta = rng.uniform(0, 2 * np.pi, 32)
    r = coherence(theta)
    assert 0.0 <= r <= 1.0


def test_kuramoto_runs():
    net = PhiKuramotoNetwork(K=2.0, seed=1)
    t, theta = net.simulate(t_span=(0.0, 5.0), dt=0.1)
    assert theta.shape[1] == 32
    assert len(t) > 10


if __name__ == "__main__":
    test_penteract_counts()
    test_phi_weighting()
    test_order_parameter_perfect_sync()
    test_order_parameter_random()
    test_kuramoto_runs()
    print("All core tests passed.")

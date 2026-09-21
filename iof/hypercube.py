"""
5-dimensional hypercube (penteract) graph generation.
32 vertices, 80 edges — the topological skeleton of the IOF Resonance Core.
"""

from __future__ import annotations
import itertools
from typing import List, Tuple

import networkx as nx
import numpy as np


class PenteractGraph:
    """Generate and manage the 5-cube graph used by the IOF architecture."""

    DIMENSION = 5
    N_VERTICES = 1 << DIMENSION  # 32
    N_EDGES = DIMENSION * (1 << (DIMENSION - 1))  # 80

    def __init__(self):
        self.G = self._build()
        self.adjacency = nx.to_numpy_array(self.G, dtype=float)
        self.nodes = list(self.G.nodes())

    def _build(self) -> nx.Graph:
        """Construct the 5-cube as a NetworkX graph.

        Vertices are binary strings of length 5 (0..31).
        Edges connect vertices that differ by exactly one bit.
        """
        G = nx.Graph()
        vertices = list(range(self.N_VERTICES))
        G.add_nodes_from(vertices)

        for v in vertices:
            for bit in range(self.DIMENSION):
                neighbor = v ^ (1 << bit)
                if neighbor > v:  # add each edge only once
                    G.add_edge(v, neighbor)

        assert G.number_of_nodes() == self.N_VERTICES
        assert G.number_of_edges() == self.N_EDGES
        return G

    def neighbors(self, node: int) -> List[int]:
        return list(self.G.neighbors(node))

    def degree(self) -> int:
        """Regular graph of degree = dimension = 5."""
        return self.DIMENSION

    def laplacian(self) -> np.ndarray:
        return nx.laplacian_matrix(self.G).toarray().astype(float)

    def phi_weighted_adjacency(self, phi: float = 1.618033988749895) -> np.ndarray:
        """Return adjacency matrix scaled by the golden ratio."""
        return self.adjacency * phi

    def summary(self) -> str:
        return (
            f"Penteract (5-cube)\n"
            f"  Vertices : {self.N_VERTICES}\n"
            f"  Edges    : {self.N_EDGES}\n"
            f"  Degree   : {self.degree()} (regular)\n"
            f"  Diameter : {nx.diameter(self.G)}\n"
        )

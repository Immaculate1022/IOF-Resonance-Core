#!/usr/bin/env python3
"""Print basic facts about the 5D penteract used by the IOF core."""

import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from iof import PenteractGraph
import networkx as nx

def main():
    g = PenteractGraph()
    print(g.summary())
    print(f"Is regular?     {nx.is_regular(g.G)}")
    print(f"Is bipartite?   {nx.is_bipartite(g.G)}")
    print(f"Average clustering: {nx.average_clustering(g.G):.4f}")
    print(f"Spectral gap (approx): {sorted(nx.laplacian_spectrum(g.G))[1]:.4f}")

if __name__ == "__main__":
    main()

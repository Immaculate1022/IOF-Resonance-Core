"""
Infinite Optical Fabric (IOF) Resonance Core
Open conceptual photonic computing architecture.

Licensed under CC BY 4.0 — free for everyone.
"""

from .hypercube import PenteractGraph
from .kuramoto import PhiKuramotoNetwork
from .metrics import order_parameter, coherence

__version__ = "0.1.0"
__all__ = ["PenteractGraph", "PhiKuramotoNetwork", "order_parameter", "coherence"]

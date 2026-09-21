# Architecture Notes

## Topology

- Base structure: 5-dimensional hypercube (penteract)
- Projection used in the reference diagram shows the characteristic dense golden network of edges
- 32 vertices, 80 edges (standard for the 5-cube)

## Synchronization Layer

The design invokes the Kuramoto model for phase synchronization across the photonic nodes:

```
dθᵢ / dt = ωᵢ + (K / N) Σⱼ sin(θⱼ − θᵢ)
```

with coupling strengths and time constants scaled by the golden ratio φ ≈ 1.6180339887.

## Timing

Primary phase timing constant:
τφ = φ × 1.0 ps = 1.618 ps

## Resonance Markers (Fibonacci)

- F₅ → 5-node jellyfish mesh (distributed sync clusters)
- F₈ → 8-phase sync bands
- F₁₃ → 13 modal pathways

These numbers are used as design motifs rather than strict engineering constraints in the original concept.

## Intent

This is a high-level conceptual architecture intended for inspiration, education, and further research — not a production-ready design.

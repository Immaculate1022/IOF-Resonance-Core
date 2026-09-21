# Mathematical Formalization of the IOF Resonance Core

## 1. Topology — The 5-Cube (Penteract)

Vertices: all binary strings of length 5, identified with integers `{0, 1, …, 31}`.

Two vertices `u, v` are adjacent if and only if their Hamming distance is 1 (they differ in exactly one bit).

- Number of vertices: `2^5 = 32`
- Number of edges: `5 · 2^{4} = 80`
- The graph is 5-regular, bipartite, and vertex-transitive.

Adjacency matrix `A` is the standard 0-1 adjacency matrix of this graph.

## 2. Golden-Ratio Scaling

Let `φ = (1 + √5)/2 ≈ 1.618033988749895`.

We define the φ-weighted adjacency:

```
A_φ = φ · A
```

All coupling strengths inherit this factor.

## 3. Kuramoto Dynamics on the Fabric

Each vertex `i` carries a phase oscillator `θ_i(t) ∈ ℝ / 2πℤ`.

The governing equations are:

```
dθ_i / dt = ω_i + (K / d) Σ_j (A_φ)_{ij} sin(θ_j − θ_i)
```

where:
- `ω_i` are natural frequencies (drawn from a narrow distribution),
- `K` is the global coupling strength,
- `d = 5` is the regular degree.

This is exactly the classic Kuramoto model on an undirected graph with edge weights scaled by φ.

## 4. Order Parameter (Coherence)

The complex order parameter is

```
r(t) e^{iψ(t)} = (1/N) Σ_i exp(i θ_i(t))
```

`R(t) = |r(t)|` measures global phase coherence:
- `R ≈ 0` → incoherent
- `R → 1` → perfect synchronization

The conceptual diagram lists a target of approximately 0.92 under strong coupling.

## 5. Timing Constant

The diagram’s phase timing constant is defined as

```
τ_φ = φ · τ₀ = 1.618 ps   (with τ₀ = 1 ps)
```

In the present continuous-time model this sets a natural time unit; discrete-time or photonic delay implementations would use it directly.

## 6. Fibonacci Motifs

- F₅ = 5 → degree / “jellyfish” cluster size motif
- F₈ = 8 → suggested multi-phase banding
- F₁₃ = 13 → modal pathway count motif

These appear as design inspiration rather than hard algebraic constraints in the current simulation layer.

---

This formalization is released under the same CC BY 4.0 license as the rest of the project.

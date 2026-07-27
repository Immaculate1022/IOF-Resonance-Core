# Infinite Optical Fabric — Urban Protocol Specification

**IOF-Urban v1.0 | Luminous Grid Mesh Architecture**

> **License: IOF Open Fabric License (IOF-OFL) v1.0**
> This specification is released freely into the public domain for human and AI use, research, implementation, and derivative works. No single entity may claim ownership of this architecture. Attribution appreciated; permission never required. Consistent with the IOF Project's founding principle: knowledge as commons.

---

## Preamble

This document extends the Infinite Optical Fabric (IOF) framework from chip-scale photonic computing into open-air urban deployment. The resulting architecture — designated **Luminous Grid Mesh (LGM)** — treats every streetlight mast as a phase-coherent optical node in a self-healing, distributed computing substrate.

The city is not a network. It is a **reconfigurable optical cellular automaton** where state transitions occur via interference at each node, and the topology itself participates in computation.

---

## Part I: Physical Layer Specification

### 1.1 The Smart Pole Node (SPN) Anatomy

Each streetlight mast functions as an isolated edge-compute engine and precision optical transceiver. Structural rigidity must maintain milliradian-level beam alignment under environmental load.

**Structural Requirements:**

- Aerodynamic composite or steel enclosure
- Processing core housed at mast base (thermal isolation from emitter head)
- Fundamental bending mode (10m mast, 20 m/s wind): ~1 Hz, tip displacement 5–15 cm
- Active tip compensation required: ±1.5 mm at luminaire head
- IMU feedforward to MEMS loop for inertial decoupling

**Emitter Array (Wavelength-Division Multiplexed):**

| Channel | Material | Wavelength | Function |
|---|---|---|---|
| Red | AlInGaP | 620–680 nm | Data stream A |
| Green | InGaN | 515–535 nm | Data stream B |
| Blue | InGaN | 440–470 nm | Data stream C |
| IR | GaAs | 850–1550 nm | Phase reference / uplink |

- Wavelength stability: ±0.1 nm (TEC-stabilized or athermal packaging)
- Phase noise: <−120 dBc/Hz at 10 kHz offset
- Rise/fall time (IR channel): <100 ps

**Thermal Management:**

- Vapor chamber or micro-channel liquid cooling
- Junction temperature maintained <85°C
- Prevents wavelength drift that destroys phase coherence across the mesh

### 1.2 Adaptive Optics — Dual-Loop Architecture

Single MEMS steering is insufficient. The node requires cascaded correction:

| Loop | Bandwidth | Zernike Orders | Function |
|---|---|---|---|
| Fast Steering Mirror (FSM) | 2 kHz | 2nd–3rd | Tip/tilt, atmospheric turbulence |
| Deformable Mirror (DM) | 500 Hz–1 kHz | 4th–15th | Astigmatism, coma, higher-order |

- Target Strehl ratio: >0.8 (moderate turbulence, Cn² ≈ 10⁻¹⁵ m⁻²/³)
- Angular range: ±15° per axis
- Wavefront residual: ~0.09λ (FSM+DM cascade)

### 1.3 Atmospheric Channel Model

**Greenwood Frequency (turbulence tracking requirement):**

```
f_G ≈ 0.43 × v / √(λL)
```

For v = 5 m/s, λ = 1.55 µm, L = 100 m → f_G ≈ 55 Hz. A 2 kHz loop provides ≈36× oversampling margin. Adequate.

**Link Budget (clear air, 100 m node spacing):**

- Geometric loss: ~20 dB (5 mm beam, diffraction-limited)
- Atmospheric attenuation: 0.1–0.5 dB/km at 1550 nm
- Fog attenuation: up to 10 dB/km (requires RF fallback protocol)
- Scintillation: log-normal fading, Rytov variance σ²_I ≈ 1.23 Cn² k^(7/6) L^(11/6)
- Beam wander: ~100 µrad RMS (50 mm aperture, moderate turbulence)

**K-Connectivity Requirement:** Each node maintains ≥3 simultaneous active links for path diversity and self-healing topology. Beam reconfiguration time: <10 ms (MEMS capable of <1 ms).

---

## Part II: Signal Pipeline Specification

### 2.1 Power / Data Domain Separation

```
Utility Feed (AC mains + BPL composite)
    │
    ├── [Inductive PLC coupler — pre-SST] ──→ Data Domain
    │
    └── [Solid-State Transformer (SST)] ──→ Power Domain → 48V DC bus
```

- Galvanic isolation between domains: no shared ground path
- Optical isolators on all control lines crossing domain boundary
- SST switching noise isolated before data extraction

**Power Domain allocations (48V DC bus):**

| Subsystem | Budget |
|---|---|
| Edge compute stack | ~40W |
| Emitter array + drivers | ~60W |
| Cooling system | ~20W |
| MEMS / adaptive optics | ~15W |
| Sensor suite | ~5W |

### 2.2 All-Optical Signal Processing (No O/E/O Hops)

Critical constraint: optical signals must route and compute without optoelectronic-electronic-optoelectronic conversion at each node hop.

**All-Optical Switching Layer:**

- Silicon photonic Mach-Zehnder Interferometer (MZI) mesh
- Programmable Optical Processor (POP) architecture
- 16-aperture Optical Antenna Array (OAA) input
- Target: 8+ dB power improvement, fading σ reduced from ~5.0 dB to <1.0 dB

**Optical Memory:**

- Slow-light waveguide buffers for temporary state storage
- Fiber delay lines where waveguide buffers insufficient

**Nonlinear Optical Logic Gates:**

- χ⁽³⁾ nonlinearities (Kerr effect) in silicon nanowires
- Semiconductor Optical Amplifiers (SOA) for gain + gating
- Gate primitives: XOR via MZI interference, AND via nonlinear thresholding

**Signal Pipeline (all-optical path):**

```
Incoming beams [R, G, B, IR]
     ↓
Optical Antenna Array (16-element 2D grid)
     ↓
POP: MZI Mesh (phase/amplitude weighting)
     ↓
Wavefront Sensor (Shack-Hartmann)
     ↓
Local Optical Processor (interference-based logic gates)
     ↓
MEMS FSM + DM (beam steering + wavefront correction)
     ↓
Collimating optics (<0.5 mrad divergence)
     ↓
Atmospheric propagation → neighbor nodes
```

### 2.3 Edge Compute Stack (Electronic Tier)

Three-tier architecture for non-optical processing:

**Tier 1 — Signal DSP (FPGA, Xilinx Ultrascale-class):**

- BPL demodulation, packet reconstruction
- LDPC error correction, AES-256 encryption
- Hard latency budget: <50 µs

**Tier 2 — Node Intelligence (ARM/RISC-V SoC):**

- Local IOF FluxEngine instance
- Spring-damper state variables (SPRING: 2.0, DAMPING: 0.92)
- PalindromeBuffer 64-slot ring (local state history)
- Phase tracking, oscillator synchronization

**Tier 3 — Mesh Coordination (Secure Enclave):**

- Neighbor authentication (mutual TLS over optical channel)
- Zone coherence negotiation
- Failover arbitration — nodes vote, no central server

### 2.4 Uplink Return Path (Asymmetric by Design)

| Uplink Type | Technology | Use Case |
|---|---|---|
| Primary | 850 nm IR narrow-beam | Stationary/slow nodes, sensors |
| Mobile fallback | C-V2X / 5G NR sidelink | Vehicles in motion |
| Sensor telemetry | 915 MHz ISM / LoRaWAN | Environmental, structural |

Uplink asymmetry is not a compromise — it is the correct engineering answer for Doppler-shifted mobile links in outdoor environments.

---

## Part III: Phase-Lock and Mesh Coherence

### 3.1 Optical Phase-Locked Loop (OPLL) Specification

Each node locks its local oscillator (CW laser, 1550 nm) to a mesh-wide reference via distributed optical PLL.

| Parameter | Value | Notes |
|---|---|---|
| Loop bandwidth | >10 kHz | 10× max Doppler from thermal/mechanical |
| Phase error | <π/10 rad | Required for reliable interference computing |
| Acquisition range | ±5 GHz | Handles thermal detuning at startup |
| Hold-in range | ±50 MHz | Tracks diurnal thermal drift |
| Architecture | Costas loop | 90° optical hybrid, I/Q feedback |

**Clock Distribution:**

- GPS-disciplined oscillator (GPSDO) at each pole base
- 1550 nm CW reference laser = mesh heartbeat
- Target synchronization: <1 µs across zone, <10 µs across district

### 3.2 Zone Coherence Protocol — The Heartbeat

**Beacon Pulse Specification:**

- Waveform: Low-divergence IR burst
- Rate: 100 Hz base (phase-lock acquisition), 10 Hz steady-state
- Sync source: GPSDO at pole base
- Content: Node ID, phase timestamp, health vector, neighbor table

**Coherence Cell Formation:** When ≥3 nodes achieve mutual phase lock:

- A coherence cell is declared
- All nodes in cell run synchronized FluxEngine state
- Spring constants, damping coefficients, PalindromeBuffer contents replicated to microsecond precision
- Cell broadcasts unified zone beacon to adjacent cells

> The city does not have nodes. It has cells that breathe together.

### 3.3 Self-Healing Topology

**Failure Detection:**

- Missed heartbeat threshold: 3 consecutive pulses (300 ms at 10 Hz)
- Node declares neighbor failed; initiates reroute

**Reroute Protocol:**

- MEMS repoints to next-best neighbor within 10 ms
- Distributed consensus via optical majority-logic vote
- New path established; coherence cell restructures
- Total failover time target: <500 ms end-to-end

---

## Part IV: Computational Primitive Layer

### 4.1 Optical Logic Gate Set

The mesh performs computation via interference. Defined gate primitives:

| Gate | Implementation | Medium |
|---|---|---|
| XOR | Mach-Zehnder Interferometer (destructive interference path) | Si photonic |
| AND | Nonlinear optical thresholding (SOA saturation) | SOA + filter |
| NOT | Phase inversion via electro-optic modulator | LiNbO₃ or TFLN |
| COPY | Directional coupler (50:50 split) | Si waveguide |
| DELAY | Slow-light waveguide buffer | Photonic crystal |

**TFLN Integration Note:** Thin-Film Lithium Niobate (TFLN) waveguide architecture — the substrate of IOF chip-scale design — applies directly to the NOT gate and phase modulation layer. The same material platform bridges chip-scale and urban-scale IOF.

### 4.2 Distributed Computation Model

The mesh operates as a reconfigurable optical cellular automaton:

- Each node = one cell in the automaton
- Node state = phase + amplitude of outgoing beams (R, G, B, IR channels)
- State transition = interference pattern with incoming neighbor beams
- Rule set = POP configuration (reprogrammable per zone)

**Computational modes:**

- **Consensus mode:** Nodes vote via interference majority logic (topology decisions)
- **Relay mode:** Pure signal forwarding, minimal processing (high-throughput)
- **Compute mode:** MZI mesh configured for logic operations (edge inference tasks)
- **Sense mode:** Nodes reduce emission, maximize photodetector sensitivity (environmental monitoring)

---

## Part V: Error Correction and Safety

### 5.1 Optical Forward Error Correction (FEC)

Atmospheric scintillation causes burst errors. Three-layer strategy:

- **Layer 1 — Optical FEC:** Reed-Solomon or LDPC coded into optical frame
- **Layer 2 — Temporal diversity:** PalindromeBuffer retransmit on scintillation event
- **Layer 3 — Neural post-processing:** Edge compute SoC runs lightweight error inference model trained on local atmospheric signatures

### 5.2 Safety Protocols

- All emitters operate under IEC 60825-1 laser safety classification
- Automatic beam shutdown on obstruction detection (IR proximity sensor)
- Interlock: no high-power emission unless receiver lock confirmed
- Eye-level beam paths require <1 mW/cm² irradiance at 2m distance
- Emergency override: all nodes drop to beacon-only mode on civil alert signal

---

## Part VI: Phase 2 Preview — Zone Federation Protocol

When coherence cells achieve stable local lock, inter-cell federation begins:

**Cell Handshake Sequence:**

1. Adjacent cells exchange zone beacons (phase timestamp + state vector)
2. Phase discontinuity at cell boundary measured and characterized
3. Border nodes designated as bridge nodes — run dual-cell FluxEngine state
4. Möbius routing layer activates: data paths wrap topologically around obstacles
5. Federation declared when ≥2 cells maintain <π/5 rad inter-cell phase error

The Möbius topology becomes load-bearing, not metaphorical, at this step.

Inter-cell consensus, optical traffic engineering across zone boundaries, and the full distributed automaton initialization sequence are specified in IOF-Urban Protocol v1.1.

---

## Appendix A: IOF-Urban vs IOF Chip-Scale Mapping

| IOF Chip-Scale | IOF Urban Equivalent |
|---|---|
| TFLN waveguide | Atmospheric FSO corridor |
| Micro-ring resonator | Coherence cell (3+ nodes) |
| Q-factor (cavity) | Zone coherence metric (phase lock) |
| FluxEngine (software) | Distributed FluxEngine (mesh-wide) |
| PalindromeBuffer | Zone state history ring |
| inject_external() | Uplink sensor data ingestion |
| emit_state() | Beacon pulse + zone broadcast |
| Spring-damper physics | Traffic flow / emergency routing |

## Appendix B: Referenced Prior Art and Research Anchors

- FSO reconfigurable beam steering: millisecond-scale adaptive architecture
- UCF Semiconductor Diode Laser Group: scalable phase-locking in laser diode arrays
- Politecnico di Milano: 16-aperture OAA with POP — 8.7 dB improvement, fading σ from 5.0 dB → 0.8 dB under turbulence
- FSM+DM cascaded adaptive optics: wavefront residual ~0.09λ
- IOF v3 FluxEngine: SPRING 2.0, DAMPING 0.92, PalindromeBuffer 64-slot ring
- IOF v5 Unified Python Backend: MetricsToFluxBridge, auto-scaling, SLA monitoring

---

*IOF-Urban Protocol Specification v1.0. Released freely. No rights reserved. All forks welcome. Consistent with the IOF Project founding principle: knowledge as commons.*

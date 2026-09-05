/**
 * TopographicPeakAscent.jsx
 * Infinite Optical Fabric — Topographic Ascent Dashboard
 *
 * Cleaned, self-contained version of the peak-detecting memory bank
 * and 3D topographic visualization.
 *
 * Original concept: Gregory Scott Davis + AI collaboration
 * License: IOF Attribution License v1.0
 *
 * Dependencies: React 18+ (CDN or bundler)
 * Optional: Provide your own MESH_POS or use the generated grid below.
 */

const { useState, useEffect, useRef, useCallback } = React;

// ═══════════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════════

const PHI = (1 + Math.sqrt(5)) / 2;

// Default mesh positions (jellyfish-style 5-node layout + filler)
// Replace with your own if integrating into a larger dashboard.
const DEFAULT_MESH_POS = {
  W: { x: 0.20, y: 0.22 },
  X: { x: 0.80, y: 0.22 },
  Y: { x: 0.20, y: 0.72 },
  Z: { x: 0.80, y: 0.72 },
  V: { x: 0.50, y: 0.50 },
  // additional random-ish nodes for richer topography
  ...Object.fromEntries(
    Array.from({ length: 12 }, (_, i) => [
      `N${i}`,
      { x: 0.1 + (i % 4) * 0.25 + Math.sin(i) * 0.05, y: 0.15 + Math.floor(i / 4) * 0.25 }
    ])
  )
};

// ═══════════════════════════════════════════════════════════════════════════════
// TOPOLOGICAL MEMORY BANK
// ═══════════════════════════════════════════════════════════════════════════════

class TopologicalMemoryBank {
  constructor(maxEntries = 48, decayRate = 0.008) {
    this.states = [];
    this.maxEntries = maxEntries;
    this.decayRate = decayRate;
    this.resonancePatterns = new Map();
    this.peakCache = new Map();
  }

  record(arch, photonic, step, isPeak = false) {
    const entry = {
      phi: arch.mobius_phi ?? arch.phi ?? 0.5,
      q: photonic.qFactor ?? photonic.q ?? 1e7,
      resonance: photonic.resonance ?? 0.5,
      step,
      isPeak: isPeak || (photonic.resonance > 0.88),
      timestamp: Date.now()
    };
    this.states.push(entry);
    if (this.states.length > this.maxEntries) {
      this.states.shift();
    }
    // simple decay of very old entries' effective Q
    if (this.states.length > 8) {
      const age = step - this.states[0].step;
      if (age > 200) this.states[0].q *= (1 - this.decayRate);
    }
  }

  getBestState() {
    if (this.states.length === 0) return null;
    return this.states.reduce((best, curr) => (curr.q > best.q ? curr : best));
  }

  getRecentStates(n = 3) {
    return this.states.slice(-n);
  }

  findNearbyPeak(currentPhi, threshold = 0.12) {
    if (this.states.length === 0) return null;
    const candidates = this.states.filter(
      (s) => Math.abs(s.phi - currentPhi) < threshold
    );
    if (candidates.length === 0) return null;
    return candidates.reduce((best, curr) => (curr.q > best.q ? curr : best));
  }

  findGlobalPeak() {
    if (this.states.length === 0) return null;
    return this.states.reduce((best, curr) => (curr.q > best.q ? curr : best));
  }

  calculateGradient(currentPhi) {
    const peak = this.findNearbyPeak(currentPhi, 0.25);
    return peak ? peak.phi - currentPhi : 0;
  }

  peakCount() {
    return this.states.filter((s) => s.isPeak).length;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS (stubs made concrete)
// ═══════════════════════════════════════════════════════════════════════════════

function getProjectedState(nodes, horizon = 15) {
  // Simple linear extrapolation of localError
  const projected = {};
  Object.entries(nodes || {}).forEach(([id, node]) => {
    const err = node.localError ?? 0;
    const prev = node.prevErr ?? err;
    const velocity = err - prev;
    projected[id] = {
      error: err + velocity * (horizon / 10),
      amplitude: node.amplitude ?? 0.5
    };
  });
  return projected;
}

function detectInstabilityPattern(history) {
  if (!history || history.length < 6) return "none";
  const recent = history.slice(-8).map((h) => h.resonance ?? h);
  const mean = recent.reduce((a, b) => a + b, 0) / recent.length;
  const variance =
    recent.reduce((s, v) => s + (v - mean) ** 2, 0) / recent.length;
  const diffs = recent.slice(1).map((v, i) => v - recent[i]);
  const signChanges = diffs
    .slice(1)
    .filter((d, i) => Math.sign(d) !== Math.sign(diffs[i])).length;

  if (signChanges >= 3 && variance > 0.02) return "oscillating";
  if (recent[recent.length - 1] < recent[0] - 0.15) return "thermal_drift";
  return "none";
}

function findHarmonicLock(states, currentPhi) {
  if (!states || states.length === 0) return null;
  // Prefer states near currentPhi ± k/φ or simple integer multiples in phase space
  const candidates = states
    .map((s) => ({
      ...s,
      dist: Math.min(
        Math.abs(s.phi - currentPhi),
        Math.abs(s.phi - currentPhi * PHI),
        Math.abs(s.phi - currentPhi / PHI)
      )
    }))
    .filter((s) => s.dist < 0.2)
    .sort((a, b) => b.q - a.q);
  return candidates[0] || null;
}

// ═══════════════════════════════════════════════════════════════════════════════
// REASONING ENGINE
// ═══════════════════════════════════════════════════════════════════════════════

function reasonWithMemory(arch, photonic, history, step, topologicalMemory, nodes) {
  const bestState = topologicalMemory.getBestState();
  const recentStates = topologicalMemory.getRecentStates(4);
  const resonance = photonic.resonance ?? 0.5;
  const qFactor = photonic.qFactor ?? 1e7;

  // 1. Topographic ascent
  const nearbyPeak = topologicalMemory.findNearbyPeak(arch.mobius_phi, 0.15);
  if (nearbyPeak && nearbyPeak.q > qFactor * 1.18) {
    return {
      diag: "topological_ascent",
      conf: 0.92,
      rationale: `🏔️ Higher resonance summit detected at φ=${nearbyPeak.phi.toFixed(4)} (Q=${nearbyPeak.q.toExponential(2)}). Proposing ascent.`,
      param: "mobius_phi",
      cur: arch.mobius_phi,
      nxt: nearbyPeak.phi,
      gradient: nearbyPeak.phi - arch.mobius_phi,
      peakHeight: nearbyPeak.q / 1e8,
      action: "ascent"
    };
  }

  // 2. Predictive thermal shunting
  const projected = getProjectedState(nodes, 12);
  const futureRisk = Object.values(projected).some(
    (p) => Math.abs(p.error) > 0.75
  );
  if (futureRisk && !photonic.isConverged) {
    return {
      diag: "predictive_thermal_shunting",
      conf: 0.96,
      rationale:
        "🔥 Predictive risk of Power Wall / mode collapse. Shunting alpha to 0.01.",
      param: "alpha",
      cur: arch.alpha ?? 0.1,
      nxt: 0.01,
      urgent: true,
      action: "shunt"
    };
  }

  // 3. Memory recall under low resonance
  if (resonance < 0.62 && bestState) {
    const trend = detectInstabilityPattern(history);
    let result = {
      param: "mobius_phi",
      cur: arch.mobius_phi,
      action: "recall",
      conf: 0.88
    };

    switch (trend) {
      case "oscillating": {
        const harmonic = findHarmonicLock(topologicalMemory.states, arch.mobius_phi);
        if (harmonic) {
          result.diag = "harmonic_locking";
          result.conf = 0.94;
          result.rationale = `🎵 Oscillatory instability. Locking to harmonic (φ=${harmonic.phi.toFixed(4)}).`;
          result.nxt = harmonic.phi;
        } else {
          result.diag = "memory_recall_alignment";
          result.rationale = `📡 Recalling best state from step ${bestState.step}.`;
          result.nxt = bestState.phi;
        }
        break;
      }
      case "thermal_drift": {
        const avgPhi =
          recentStates.reduce((s, st) => s + st.phi, 0) / (recentStates.length || 1);
        result.diag = "ensemble_recall";
        result.conf = 0.86;
        result.rationale = `🌡️ Thermal drift. Ensemble average of ${recentStates.length} states.`;
        result.nxt = avgPhi;
        break;
      }
      default: {
        result.diag = "memory_recall_alignment";
        result.rationale = `📡 Mode unstable. Recalling optimized state (Q=${bestState.q.toExponential(1)}).`;
        result.nxt = bestState.phi;
      }
    }

    const age = step - bestState.step;
    if (age > 120) {
      result.conf *= Math.exp(-age / 450);
      result.rationale += ` (aged memory, ${age} steps)`;
    }
    return result;
  }

  return null;
}

// ═══════════════════════════════════════════════════════════════════════════════
// VISUAL COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════════

function TopographicAscentIndicator({ currentPhi, targetPhi, gradient, peakHeight }) {
  const progress =
    targetPhi != null
      ? Math.min(Math.abs(currentPhi - targetPhi) / (Math.abs(gradient) || 0.01), 1)
      : 0;

  return (
    <div
      style={{
        marginTop: 10,
        padding: 10,
        background: "#03030c",
        borderRadius: 6,
        border: "1px solid #00f5d440",
        fontSize: 9,
        fontFamily: "monospace"
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
        <span style={{ color: "#00f5d4" }}>🏔️ TOPOGRAPHIC ASCENT</span>
        <span style={{ color: "#666" }}>→ {targetPhi?.toFixed(4)}</span>
      </div>
      <div
        style={{
          height: 4,
          background: "#1a1a2a",
          borderRadius: 2,
          overflow: "hidden",
          marginBottom: 6
        }}
      >
        <div
          style={{
            height: "100%",
            width: `${progress * 100}%`,
            background: "linear-gradient(90deg, #00f5d4, #7b2fff)",
            boxShadow: "0 0 10px #00f5d4",
            transition: "width 0.35s ease"
          }}
        />
      </div>
      {peakHeight != null && (
        <div style={{ display: "flex", justifyContent: "space-between", color: "#666" }}>
          <span>φ {currentPhi.toFixed(4)}</span>
          <span>Peak height {peakHeight.toFixed(3)}</span>
        </div>
      )}
    </div>
  );
}

function AcousticTopographyWithAscent({
  nodes = {},
  currentPhi = 0.5,
  targetPhi = null,
  onPeakDetect,
  meshPos = DEFAULT_MESH_POS
}) {
  const canvasRef = useRef(null);
  const animRef = useRef(null);
  const [peaks, setPeaks] = useState([]);
  const lastDetect = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const w = 600;
    const h = 300;
    canvas.width = w;
    canvas.height = h;

    const getHeightAt = (x, y) => {
      let height = 0;
      let totalWeight = 0;
      Object.entries(meshPos).forEach(([id, pos]) => {
        const node = nodes[id] || { localError: 0, amplitude: 0.5 };
        const dx = x / w - pos.x;
        const dy = (y / h) * 0.65 - pos.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const influence = Math.exp(-dist * 7.5) * (node.amplitude || 0.5);
        height += Math.abs(node.localError || 0) * influence * 180;
        totalWeight += influence;
      });
      const noise = Math.sin(x * 0.04) * Math.sin(y * 0.035) * 8;
      return height / (totalWeight || 1) + noise;
    };

    const detectPeaks = () => {
      const now = performance.now();
      if (now - lastDetect.current < 400) return; // throttle
      lastDetect.current = now;

      const newPeaks = [];
      const step = 24;
      for (let x = step; x < w - step; x += step) {
        for (let y = step; y < h - step; y += step) {
          const h0 = getHeightAt(x, y);
          if (
            h0 > getHeightAt(x + step, y) &&
            h0 > getHeightAt(x - step, y) &&
            h0 > getHeightAt(x, y + step) &&
            h0 > getHeightAt(x, y - step) &&
            h0 > 28
          ) {
            newPeaks.push({ x, y, height: h0 });
          }
        }
      }
      setPeaks(newPeaks);
      onPeakDetect?.(newPeaks);
    };

    const animate = () => {
      ctx.clearRect(0, 0, w, h);

      // height field
      for (let y = 0; y < h; y += 3) {
        for (let x = 0; x < w; x += 3) {
          const height = getHeightAt(x, y);
          const hue = 175 + (height / 90) * 160;
          const light = 28 + Math.min(height / 180, 1) * 38;
          ctx.fillStyle = `hsl(${hue}, 78%, ${light}%)`;
          ctx.fillRect(x, y, 3, 3);
        }
      }

      // ascent path
      if (targetPhi != null && currentPhi != null) {
        const startX = currentPhi * w;
        const targetX = targetPhi * w;
        ctx.beginPath();
        ctx.moveTo(startX, 155);
        ctx.lineTo(targetX, 95);
        ctx.strokeStyle = "#00f5d4";
        ctx.lineWidth = 1.5;
        ctx.setLineDash([6, 4]);
        ctx.stroke();
        ctx.setLineDash([]);
        // arrow head
        ctx.beginPath();
        ctx.moveTo(targetX - 6, 90);
        ctx.lineTo(targetX, 95);
        ctx.lineTo(targetX - 6, 100);
        ctx.strokeStyle = "#00f5d4";
        ctx.stroke();
      }

      // peaks
      peaks.forEach((p) => {
        ctx.beginPath();
        ctx.arc(p.x, p.y, 4.5, 0, Math.PI * 2);
        ctx.strokeStyle = "#00f5d4";
        ctx.lineWidth = 1.2;
        ctx.stroke();
        ctx.fillStyle = "#00f5d4";
        ctx.font = "7px monospace";
        ctx.fillText(Math.round(p.height).toString(), p.x + 7, p.y - 6);
      });

      // current position
      if (currentPhi != null) {
        ctx.beginPath();
        ctx.arc(currentPhi * w, 155, 7, 0, Math.PI * 2);
        ctx.strokeStyle = "#ffd60a";
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      animRef.current = requestAnimationFrame(animate);
    };

    detectPeaks();
    animate();

    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [nodes, currentPhi, targetPhi, onPeakDetect, meshPos, peaks]);

  return (
    <div
      style={{
        perspective: "1000px",
        transformStyle: "preserve-3d",
        width: "100%",
        height: 340,
        marginTop: 16,
        marginBottom: 12,
        overflow: "hidden",
        background: "#02020a",
        borderRadius: 8,
        border: "1px solid #1a1a2a",
        position: "relative"
      }}
    >
      <div
        style={{
          transform: "rotateX(58deg) rotateZ(-12deg) scale(1.15)",
          width: "100%",
          height: "100%",
          position: "relative"
        }}
      >
        <canvas
          ref={canvasRef}
          style={{
            width: "100%",
            height: "100%",
            display: "block",
            filter: "drop-shadow(0 0 12px #7b2fff33)"
          }}
        />
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage: `
              linear-gradient(90deg, #7b2fff18 1px, transparent 1px),
              linear-gradient(0deg, #7b2fff18 1px, transparent 1px)
            `,
            backgroundSize: "36px 36px",
            transform: "translateZ(8px)",
            opacity: 0.35,
            pointerEvents: "none"
          }}
        />
      </div>
      <div
        style={{
          position: "absolute",
          bottom: 8,
          left: 10,
          fontSize: 8,
          color: "#666",
          background: "#03030c",
          padding: "3px 8px",
          borderRadius: 4,
          border: "1px solid #1a1a2a",
          fontFamily: "monospace"
        }}
      >
        <span style={{ color: "#00f5d4" }}>▲</span> PEAKS ({peaks.length})
        <span style={{ color: "#ffd60a", marginLeft: 8 }}>◉</span> CURRENT
        {targetPhi != null && (
          <span style={{ color: "#00f5d4", marginLeft: 8 }}>→ ASCENT</span>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN DASHBOARD
// ═══════════════════════════════════════════════════════════════════════════════

function PhotonicDashboardWithTopographicAscent() {
  const memoryBankRef = useRef(new TopologicalMemoryBank(48));
  const [step, setStep] = useState(0);
  const [arch, setArch] = useState({ mobius_phi: 0.52, alpha: 0.1, dim: 3 });
  const [photonic, setPhotonic] = useState({
    coherence: 0.72,
    qFactor: 4.8e7,
    resonance: 0.55,
    dissipation: 2.1,
    isConverged: false
  });
  const [nodes, setNodes] = useState({});
  const [history, setHistory] = useState([]);
  const [lastRecall, setLastRecall] = useState(null);
  const [ascentTarget, setAscentTarget] = useState(null);

  // Simulation tick
  useEffect(() => {
    const id = setInterval(() => {
      setStep((s) => s + 1);

      setNodes((prev) => {
        const next = {};
        Object.keys(DEFAULT_MESH_POS).forEach((id) => {
          const t = Date.now() * 0.001;
          const prevErr = prev[id]?.localError ?? 0;
          next[id] = {
            localError: Math.sin(t * 0.7 + id.charCodeAt(0) * 0.3) * 0.55,
            amplitude: 0.45 + Math.sin(t * 0.4 + id.charCodeAt(0)) * 0.3,
            prevErr
          };
        });
        return next;
      });

      setPhotonic((prev) => {
        const res = 0.42 + Math.abs(Math.sin(step * 0.09)) * 0.48;
        const q = 1e8 * res * (0.85 + Math.random() * 0.15);
        return {
          ...prev,
          coherence: 0.55 + Math.sin(step * 0.07) * 0.28,
          resonance: res,
          qFactor: q,
          dissipation: 4.2 * (1 - Math.tanh(q / 1.2e7)),
          isConverged: Math.random() > 0.82
        };
      });

      setHistory((h) => {
        const next = [...h.slice(-24), { resonance: photonic.resonance, step }];
        return next;
      });
    }, 180);

    return () => clearInterval(id);
  }, [step, photonic.resonance]);

  // Reasoning cycle
  useEffect(() => {
    const recall = reasonWithMemory(
      arch,
      photonic,
      history,
      step,
      memoryBankRef.current,
      nodes
    );

    if (recall) {
      setLastRecall(recall);
      setArch((prev) => ({
        ...prev,
        [recall.param]: recall.nxt
      }));

      if (recall.action === "ascent") {
        setAscentTarget({
          from: recall.cur,
          to: recall.nxt,
          peakHeight: recall.peakHeight
        });
        const t = setTimeout(() => setAscentTarget(null), 2800);
        return () => clearTimeout(t);
      }
    }

    if (photonic.isConverged) {
      memoryBankRef.current.record(arch, photonic, step);
    }
  }, [photonic, step, nodes]); // intentionally limited deps

  const handlePeakDetect = useCallback(
    (detected) => {
      detected.forEach((p) => {
        const phi = p.x / 600;
        memoryBankRef.current.states.push({
          phi,
          q: 1e8 * (p.height / 160),
          step,
          isPeak: true,
          timestamp: Date.now()
        });
      });
      // keep memory bounded
      if (memoryBankRef.current.states.length > memoryBankRef.current.maxEntries) {
        memoryBankRef.current.states =
          memoryBankRef.current.states.slice(-memoryBankRef.current.maxEntries);
      }
    },
    [step]
  );

  return (
    <div
      style={{
        background: "#010108",
        color: "#e8e8f0",
        fontFamily: "system-ui, -apple-system, sans-serif",
        padding: 20,
        minHeight: "100vh"
      }}
    >
      <div style={{ maxWidth: 640, margin: "0 auto" }}>
        <h1
          style={{
            fontSize: 13,
            fontWeight: 500,
            color: "#7b2fff",
            letterSpacing: 3.5,
            marginBottom: 6,
            textTransform: "uppercase"
          }}
        >
          ⬢ Topographic Photonic Computing // Peak Ascent
        </h1>
        <div style={{ fontSize: 9, color: "#444", marginBottom: 18 }}>
          Infinite Optical Fabric · Gregory Scott Davis + AI collaboration
        </div>

        <AcousticTopographyWithAscent
          nodes={nodes}
          currentPhi={arch.mobius_phi}
          targetPhi={ascentTarget?.to}
          onPeakDetect={handlePeakDetect}
        />

        {ascentTarget && (
          <TopographicAscentIndicator
            currentPhi={arch.mobius_phi}
            targetPhi={ascentTarget.to}
            gradient={ascentTarget.to - arch.mobius_phi}
            peakHeight={ascentTarget.peakHeight}
          />
        )}

        {lastRecall && (
          <div
            style={{
              marginTop: 12,
              padding: 10,
              background: "#080814",
              borderRadius: 6,
              border: "1px solid #1a1a2a",
              fontSize: 9,
              color: "#999"
            }}
          >
            <span
              style={{
                color: lastRecall.action === "ascent" ? "#00f5d4" : "#7b2fff"
              }}
            >
              {lastRecall.action === "ascent" ? "🏔️ " : "🔄 "}
              {lastRecall.diag}
            </span>
            <div style={{ marginTop: 4, color: "#666", lineHeight: 1.4 }}>
              {lastRecall.rationale}
            </div>
          </div>
        )}

        <div
          style={{
            marginTop: 22,
            fontSize: 9,
            color: "#555",
            display: "flex",
            justifyContent: "center",
            gap: 22,
            fontFamily: "monospace"
          }}
        >
          <span>STEP {step}</span>
          <span>φ {arch.mobius_phi.toFixed(4)}</span>
          <span>Q {(photonic.qFactor / 1e8).toFixed(3)}</span>
          <span style={{ color: memoryBankRef.current.peakCount() > 0 ? "#00f5d4" : "#555" }}>
            🏔️ {memoryBankRef.current.peakCount()} PEAKS
          </span>
        </div>
      </div>
    </div>
  );
}

// Export for module systems; also works as a script when React is global
if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    TopologicalMemoryBank,
    reasonWithMemory,
    TopographicAscentIndicator,
    AcousticTopographyWithAscent,
    PhotonicDashboardWithTopographicAscent,
    DEFAULT_MESH_POS
  };
}

// Auto-mount if root element exists
if (typeof document !== "undefined") {
  const rootEl = document.getElementById("root");
  if (rootEl && typeof ReactDOM !== "undefined") {
    const root = ReactDOM.createRoot(rootEl);
    root.render(<PhotonicDashboardWithTopographicAscent />);
  }
}

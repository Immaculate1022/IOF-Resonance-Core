/**
 * Topological Memory Bank + Peak Ascent Optimizer
 * Infinite Optical Fabric (IOF) collaborative extension
 *
 * Treats the resonance parameter space as a landscape of peaks.
 * Detects local maxima, proposes ascent toward higher-Q states,
 * and supports confidence-adjusted memory recall + predictive thermal shunting.
 *
 * Released under CC BY 4.0
 * Attribution: Gregory Scott Davis (Immaculate1022) and collaborative contributors
 *
 * Conceptual / educational software — not a claim of physical photonic hardware.
 */

class TopologicalMemoryBank {
  constructor(maxEntries = 64, decayRate = 0.01) {
    this.states = [];
    this.maxEntries = maxEntries;
    this.decayRate = decayRate;
    this.resonancePatterns = new Map();
    this.peakCache = new Map();
  }

  record(arch, photonic, step) {
    const entry = {
      phi: arch.mobius_phi ?? arch.phi ?? 0.5,
      q: photonic.qFactor ?? photonic.q ?? 1e7,
      resonance: photonic.resonance ?? 0.5,
      coherence: photonic.coherence ?? 0.5,
      step,
      timestamp: Date.now(),
      isPeak: false
    };
    this.states.push(entry);
    if (this.states.length > this.maxEntries) {
      this.states.shift();
    }
    return entry;
  }

  getBestState() {
    if (this.states.length === 0) return null;
    return this.states.reduce((best, curr) =>
      (curr.q > best.q ? curr : best)
    );
  }

  getRecentStates(n = 5) {
    return this.states.slice(-n);
  }

  /** Find nearby peak in topological landscape */
  findNearbyPeak(currentPhi, threshold = 0.1) {
    if (this.states.length === 0) return null;
    const candidates = this.states.filter(s =>
      Math.abs(s.phi - currentPhi) < threshold
    );
    if (candidates.length === 0) return null;
    return candidates.reduce((best, curr) =>
      curr.q > best.q ? curr : best
    );
  }

  /** Global maximum */
  findGlobalPeak() {
    if (this.states.length === 0) return null;
    return this.states.reduce((best, curr) =>
      curr.q > best.q ? curr : best
    );
  }

  /** Gradient direction toward nearest higher peak */
  calculateGradient(currentPhi) {
    const peak = this.findNearbyPeak(currentPhi, 0.3);
    if (!peak) return 0;
    return peak.phi - currentPhi;
  }

  markAsPeak(entry) {
    entry.isPeak = true;
    this.peakCache.set(entry.phi.toFixed(4), entry);
  }
}

/**
 * Reasoning layer that can propose topographic ascent,
 * predictive thermal shunting, or memory recall.
 */
function reasonWithMemory(arch, photonic, history, step, topologicalMemory, nodes = {}) {
  const bestState = topologicalMemory.getBestState();
  const recentStates = topologicalMemory.getRecentStates(3);
  const resonance = photonic.resonance ?? 0.5;
  const qFactor = photonic.qFactor ?? photonic.q ?? 1e7;

  // ===== TOPOGRAPHIC ASCENT =====
  const nearbyPeak = topologicalMemory.findNearbyPeak(arch.mobius_phi ?? arch.phi ?? 0.5, 0.15);
  if (nearbyPeak && nearbyPeak.q > qFactor * 1.2) {
    return {
      diag: "topological_ascent",
      conf: 0.92,
      rationale: `Detected higher elevation resonance summit at φ=${nearbyPeak.phi.toFixed(4)} (Q=${nearbyPeak.q.toExponential(2)}). Proposing ascent to maximize mode confinement.`,
      param: "mobius_phi",
      cur: arch.mobius_phi ?? arch.phi,
      nxt: nearbyPeak.phi,
      gradient: nearbyPeak.phi - (arch.mobius_phi ?? arch.phi),
      peakHeight: nearbyPeak.q / 1e8,
      action: "ascent"
    };
  }

  // ===== PREDICTIVE THERMAL SHUNTING (conceptual) =====
  // Placeholder for projected thermal risk — real implementation would use node error projections
  const futureThermalRisk = false; // replace with actual projection when nodes are instrumented
  if (futureThermalRisk && !photonic.isConverged) {
    return {
      diag: "predictive_thermal_shunting",
      conf: 0.98,
      rationale: "Predictive thermal risk detected. Shunting learning rate to protect mode stability.",
      param: "alpha",
      cur: arch.alpha || 0.1,
      nxt: 0.01,
      urgent: true,
      thermalRisk: true,
      action: "shunt"
    };
  }

  // ===== STANDARD MEMORY RECALL =====
  if (resonance < 0.6 && bestState) {
    const result = {
      param: "mobius_phi",
      cur: arch.mobius_phi ?? arch.phi,
      action: "recall",
      diag: "memory_recall_alignment",
      conf: 0.9,
      rationale: `Current mode unstable. Recalling optimized state from step ${bestState.step} (Q=${bestState.q.toExponential(1)}). Re-aligning to known topological peak.`,
      nxt: bestState.phi
    };

    const stepsSinceBest = step - bestState.step;
    if (stepsSinceBest > 100) {
      result.conf *= Math.exp(-stepsSinceBest / 500);
      result.rationale += ` (confidence adjusted: memory is ${stepsSinceBest} steps old)`;
    }
    return result;
  }

  return null;
}

// Export for Node / browser / bundlers
if (typeof module !== "undefined" && module.exports) {
  module.exports = { TopologicalMemoryBank, reasonWithMemory };
}

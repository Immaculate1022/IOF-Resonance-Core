/**
 * IOF Resonance Simulator (React)
 * Interactive educational visualization of Möbius-style resonance,
 * phase control, standing waves, and TFLN-oriented metrics.
 *
 * Originally developed in the collaborative multi-station pipeline.
 * Released under CC BY 4.0 — attribution to Gregory Scott Davis / Immaculate1022.
 *
 * Usage: import into a React app (Vite / CRA / Next, etc.)
 */

import { useState, useEffect, useRef } from "react";

const css = `
  @import url('https://fonts.googleapis.com/css2?family=Share+Tech+Mono&family=Orbitron:wght@400;700;900&display=swap');

  * { box-sizing: border-box; margin: 0; padding: 0; }

  .iof-root {
    background: #020408;
    color: #e0f7fa;
    font-family: 'Share Tech Mono', monospace;
    min-height: 100vh;
  }

  .glow-cyan { text-shadow: 0 0 8px #00e5ff, 0 0 20px #00b8d4; }

  .panel {
    background: rgba(0,20,30,0.7);
    border: 1px solid rgba(0,229,255,0.15);
    border-radius: 4px;
    box-shadow: 0 0 20px rgba(0,229,255,0.05), inset 0 0 40px rgba(0,0,0,0.4);
  }

  .panel-resonant {
    border-color: rgba(0,229,255,0.5);
    box-shadow: 0 0 30px rgba(0,229,255,0.2), inset 0 0 40px rgba(0,229,255,0.03);
  }

  input[type=range] {
    -webkit-appearance: none;
    width: 100%;
    height: 2px;
    background: rgba(0,229,255,0.2);
    border-radius: 2px;
    outline: none;
    cursor: pointer;
  }
  input[type=range]::-webkit-slider-thumb {
    -webkit-appearance: none;
    width: 14px;
    height: 14px;
    border-radius: 50%;
    background: #00e5ff;
    box-shadow: 0 0 8px #00e5ff;
    cursor: pointer;
  }

  .metric-bar-bg {
    width: 100%;
    height: 4px;
    background: rgba(0,229,255,0.1);
    border-radius: 2px;
    overflow: hidden;
  }
  .metric-bar-fill {
    height: 100%;
    border-radius: 2px;
    transition: width 0.4s ease, background 0.4s ease;
  }

  .badge {
    display: inline-block;
    padding: 2px 10px;
    border-radius: 2px;
    font-size: 11px;
    letter-spacing: 2px;
    font-weight: bold;
    font-family: 'Orbitron', monospace;
  }
  .badge-resonant {
    background: rgba(0,229,255,0.12);
    border: 1px solid #00e5ff;
    color: #00e5ff;
  }
  .badge-dissipative {
    background: rgba(255,109,0,0.15);
    border: 1px solid #ff6d00;
    color: #ffab00;
  }

  .btn {
    background: transparent;
    border: 1px solid rgba(0,229,255,0.4);
    color: #00e5ff;
    font-family: 'Share Tech Mono', monospace;
    font-size: 13px;
    letter-spacing: 1px;
    padding: 8px 20px;
    cursor: pointer;
    border-radius: 2px;
  }
  .btn:hover {
    background: rgba(0,229,255,0.1);
  }

  .scanline {
    position: fixed;
    inset: 0;
    pointer-events: none;
    background: repeating-linear-gradient(
      0deg, transparent, transparent 2px,
      rgba(0,229,255,0.013) 2px, rgba(0,229,255,0.013) 4px
    );
    z-index: 999;
  }
`;

function WaveformCanvas({ phase, frequency, amplitude, noise, isResonant }) {
  const canvasRef = useRef(null);
  const animRef = useRef(null);
  const tRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");

    const draw = () => {
      const W = canvas.width;
      const H = canvas.height;
      ctx.clearRect(0, 0, W, H);
      tRef.current += 0.03;
      const t = tRef.current;
      const phRad = (phase * Math.PI) / 180;
      const noiseAmt = noise / 100;
      const centerY = H / 2;

      // grid
      ctx.strokeStyle = "rgba(0,229,255,0.05)";
      ctx.lineWidth = 1;
      for (let x = 0; x < W; x += 40) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
      }
      for (let y = 0; y < H; y += 30) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
      }

      // incident wave
      const incidentGrad = ctx.createLinearGradient(0, 0, W, 0);
      if (isResonant) {
        incidentGrad.addColorStop(0, "rgba(0,229,255,0)");
        incidentGrad.addColorStop(0.5, "rgba(0,229,255,0.9)");
        incidentGrad.addColorStop(1, "rgba(0,229,255,0)");
      } else {
        incidentGrad.addColorStop(0, "rgba(0,229,255,0)");
        incidentGrad.addColorStop(0.5, "rgba(0,150,200,0.6)");
        incidentGrad.addColorStop(1, "rgba(0,229,255,0)");
      }
      ctx.beginPath();
      ctx.strokeStyle = incidentGrad;
      ctx.lineWidth = isResonant ? 2.5 : 1.5;
      ctx.shadowColor = "#00e5ff";
      ctx.shadowBlur = isResonant ? 12 : 4;
      for (let x = 0; x < W; x++) {
        const xNorm = x / W;
        const noiseVal = noiseAmt * (Math.random() - 0.5) * 20;
        const y = centerY - amplitude * 50 * Math.sin(frequency * 2 * Math.PI * xNorm + t + phRad) + noiseVal;
        if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.stroke();

      // reflected wave
      const refGrad = ctx.createLinearGradient(0, 0, W, 0);
      if (isResonant) {
        refGrad.addColorStop(0, "rgba(0,229,255,0)");
        refGrad.addColorStop(0.5, "rgba(0,229,255,0.7)");
        refGrad.addColorStop(1, "rgba(0,229,255,0)");
      } else {
        refGrad.addColorStop(0, "rgba(255,109,0,0)");
        refGrad.addColorStop(0.5, "rgba(255,109,0,0.5)");
        refGrad.addColorStop(1, "rgba(255,109,0,0)");
      }
      ctx.beginPath();
      ctx.strokeStyle = refGrad;
      ctx.lineWidth = 1.5;
      ctx.shadowColor = isResonant ? "#00e5ff" : "#ff6d00";
      ctx.shadowBlur = 4;
      for (let x = 0; x < W; x++) {
        const xNorm = x / W;
        const noiseVal = noiseAmt * (Math.random() - 0.5) * 15;
        const y = centerY - amplitude * 40 * Math.sin(frequency * 2 * Math.PI * xNorm - t + phRad + Math.PI) + noiseVal;
        if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.stroke();

      // standing envelope
      if (isResonant) {
        ctx.beginPath();
        ctx.strokeStyle = "rgba(0,229,255,0.15)";
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 4]);
        ctx.shadowBlur = 0;
        for (let x = 0; x < W; x++) {
          const xNorm = x / W;
          const env = amplitude * 50 * Math.abs(Math.sin(frequency * 2 * Math.PI * xNorm));
          if (x === 0) ctx.moveTo(x, centerY - env); else ctx.lineTo(x, centerY - env);
        }
        ctx.stroke();
        ctx.beginPath();
        for (let x = 0; x < W; x++) {
          const xNorm = x / W;
          const env = amplitude * 50 * Math.abs(Math.sin(frequency * 2 * Math.PI * xNorm));
          if (x === 0) ctx.moveTo(x, centerY + env); else ctx.lineTo(x, centerY + env);
        }
        ctx.stroke();
        ctx.setLineDash([]);
      }

      ctx.shadowBlur = 0;
      ctx.beginPath();
      ctx.strokeStyle = "rgba(0,229,255,0.08)";
      ctx.moveTo(0, centerY);
      ctx.lineTo(W, centerY);
      ctx.stroke();

      animRef.current = requestAnimationFrame(draw);
    };

    draw();
    return () => cancelAnimationFrame(animRef.current);
  }, [phase, frequency, amplitude, noise, isResonant]);

  return (
    <canvas
      ref={canvasRef}
      width={600}
      height={160}
      style={{ width: "100%", height: "160px", display: "block", borderRadius: "3px" }}
    />
  );
}

function Slider({ label, value, min, max, step, onChange, unit = "", highlight }) {
  return (
    <div style={{ marginBottom: "18px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
        <span style={{ fontSize: "12px", color: "#80cbc4", letterSpacing: "1px" }}>{label}</span>
        <span style={{
          fontSize: "13px",
          color: highlight ? "#00e5ff" : "#b2ebf2",
          textShadow: highlight ? "0 0 8px #00e5ff" : "none",
          fontWeight: highlight ? "bold" : "normal"
        }}>{value}{unit}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(Number(e.target.value))} />
    </div>
  );
}

function MetricBar({ label, value, color }) {
  return (
    <div style={{ marginBottom: "16px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
        <span style={{ fontSize: "12px", color: "#80cbc4", letterSpacing: "1px" }}>{label}</span>
        <span style={{ fontSize: "14px", color, textShadow: `0 0 8px ${color}` }}>{Math.round(value)}%</span>
      </div>
      <div className="metric-bar-bg">
        <div className="metric-bar-fill" style={{
          width: `${value}%`,
          background: `linear-gradient(90deg, ${color}88, ${color})`,
          boxShadow: `0 0 8px ${color}`
        }} />
      </div>
    </div>
  );
}

export default function IOFSimulator() {
  const [phase, setPhase] = useState(0);
  const [frequency, setFrequency] = useState(1.0);
  const [amplitude, setAmplitude] = useState(1.0);
  const [noise, setNoise] = useState(50);
  const [puzzleInput, setPuzzleInput] = useState("");
  const [puzzleResult, setPuzzleResult] = useState(null);
  const [unlocked, setUnlocked] = useState(false);

  const phaseDelta = Math.abs(180 - phase);
  const phaseScore = Math.max(0, 1 - phaseDelta / 180);
  const noiseScore = 1 - noise / 100;
  const resonanceQuality = Math.round(phaseScore * noiseScore * 100 * amplitude);
  const energyEfficiency = Math.round(phaseScore * 60 + noiseScore * 40);
  const isResonant = resonanceQuality >= 70 || unlocked;

  const checkPuzzle = () => {
    if (puzzleInput.trim() === "1") {
      setPuzzleResult("resonant");
      setUnlocked(true);
    } else {
      setPuzzleResult("error");
      setUnlocked(false);
    }
  };

  const metricColor = isResonant ? "#00e5ff" : "#ff6d00";

  return (
    <div className="iof-root">
      <style>{css}</style>
      <div className="scanline" />

      <div style={{
        minHeight: "100vh",
        background: "radial-gradient(ellipse at 20% 20%, rgba(0,30,50,0.8) 0%, #020408 60%)",
        padding: "0 0 60px 0"
      }}>
        {/* Header */}
        <div style={{
          borderBottom: "1px solid rgba(0,229,255,0.1)",
          padding: "16px 32px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          background: "rgba(2,4,8,0.85)"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <span style={{ fontSize: "22px" }}>🌀</span>
            <span style={{
              fontFamily: "'Orbitron', monospace",
              fontSize: "16px",
              letterSpacing: "3px",
              color: "#00e5ff",
              textShadow: "0 0 10px #00e5ff"
            }}>IOF</span>
          </div>
          <span style={{ fontSize: "11px", letterSpacing: "2px", color: "#00e5ff" }}>SIMULATOR</span>
        </div>

        {/* Title */}
        <div style={{ textAlign: "center", padding: "48px 32px 32px" }}>
          <div style={{ marginBottom: "12px" }}>
            <span className={`badge ${isResonant ? "badge-resonant" : "badge-dissipative"}`}>
              {isResonant ? "⚡ RESONANT" : "⚡ DISSIPATIVE"}
            </span>
          </div>
          <h1 style={{
            fontFamily: "'Orbitron', monospace",
            fontSize: "clamp(22px, 4vw, 36px)",
            letterSpacing: "4px",
            color: "#e0f7fa",
            textShadow: isResonant ? "0 0 20px #00e5ff, 0 0 40px #00b8d4" : "none",
            marginBottom: "10px"
          }}>
            IOF RESONANCE SIMULATOR
          </h1>
          <p style={{ color: "#546e7a", fontSize: "13px", letterSpacing: "2px" }}>
            TOPOLOGICAL RESONANCE · TFLN · MÖBIUS TOPOLOGY
          </p>
        </div>

        {/* Main content */}
        <div style={{
          maxWidth: "1100px",
          margin: "0 auto",
          padding: "0 24px",
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "20px"
        }}>
          {/* Waveform */}
          <div className={`panel ${isResonant ? "panel-resonant" : ""}`}
            style={{ padding: "24px", gridColumn: "1 / -1" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "16px" }}>
              <span style={{ fontFamily: "'Orbitron', monospace", fontSize: "12px", letterSpacing: "3px", color: "#80cbc4" }}>
                MÖBIUS LOOP RESONANCE
              </span>
              <span style={{ fontSize: "12px", color: isResonant ? "#00e5ff" : "#ff6d00" }}>
                {isResonant ? "⬤ STANDING WAVE LOCKED" : "⬤ WAVE INTERFERENCE"}
              </span>
            </div>
            <WaveformCanvas
              phase={phase}
              frequency={frequency}
              amplitude={amplitude}
              noise={noise}
              isResonant={isResonant}
            />
          </div>

          {/* Controls */}
          <div className="panel" style={{ padding: "24px" }}>
            <div style={{ marginBottom: "20px", fontFamily: "'Orbitron', monospace", fontSize: "11px", letterSpacing: "3px", color: "#80cbc4" }}>
              WAVEFORM CONTROLS
            </div>
            <Slider label="PHASE ANGLE" value={phase} min={0} max={360} step={1}
              onChange={setPhase} unit="°" highlight={Math.abs(phase - 180) < 20} />
            <Slider label="FREQUENCY" value={frequency} min={0.5} max={4} step={0.1}
              onChange={setFrequency} unit=" Hz" />
            <Slider label="AMPLITUDE" value={amplitude} min={0.1} max={2} step={0.05}
              onChange={setAmplitude} />
            <Slider label="NOISE LEVEL" value={noise} min={0} max={100} step={1}
              onChange={setNoise} unit="%" highlight={noise < 20} />
            <button className="btn" style={{ width: "100%", marginTop: "12px" }}
              onClick={() => { setPhase(180); setNoise(5); setFrequency(1.5); setAmplitude(1.2); }}>
              AUTO-TUNE TO RESONANCE
            </button>
          </div>

          {/* Metrics */}
          <div className="panel" style={{ padding: "24px" }}>
            <div style={{ marginBottom: "20px", fontFamily: "'Orbitron', monospace", fontSize: "11px", letterSpacing: "3px", color: "#80cbc4" }}>
              SYSTEM METRICS
            </div>
            <MetricBar label="RESONANCE QUALITY" value={Math.min(resonanceQuality, 100)} color={metricColor} />
            <MetricBar label="ENERGY EFFICIENCY" value={energyEfficiency} color={metricColor} />
            <div style={{ marginTop: "16px", fontSize: "12px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                <span style={{ color: "#546e7a" }}>PHASE</span>
                <span style={{ color: phase === 180 ? "#00e5ff" : "#b2ebf2" }}>{phase}°</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "#546e7a" }}>TOPOLOGY</span>
                <span style={{ color: isResonant ? "#00e5ff" : "#546e7a" }}>
                  {isResonant ? "MÖBIUS LOCKED" : "UNLOCKED"}
                </span>
              </div>
            </div>
            {isResonant && (
              <div style={{
                marginTop: "16px", padding: "12px",
                background: "rgba(0,229,255,0.05)", border: "1px solid rgba(0,229,255,0.2)",
                borderRadius: "3px", fontSize: "12px", color: "#00e5ff", textAlign: "center"
              }} className="glow-cyan">
                🌀 RESONANCE FOUND: There is no 'other' side.
              </div>
            )}
          </div>

          {/* Möbius puzzle */}
          <div className="panel" style={{ padding: "24px", gridColumn: "1 / -1" }}>
            <div style={{ marginBottom: "16px", fontFamily: "'Orbitron', monospace", fontSize: "11px", letterSpacing: "3px", color: "#80cbc4" }}>
              MÖBIUS CODE INTERFACE
            </div>
            <p style={{ fontSize: "13px", color: "#546e7a", marginBottom: "12px" }}>
              A Möbius strip is a non-orientable surface. How many sides does it have?
            </p>
            <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
              <input
                style={{
                  background: "rgba(0,0,0,0.5)", border: "1px solid rgba(0,229,255,0.3)",
                  borderRadius: "3px", color: "#00e5ff", fontFamily: "monospace",
                  fontSize: "16px", padding: "8px 14px", width: "80px", textAlign: "center"
                }}
                value={puzzleInput}
                onChange={e => setPuzzleInput(e.target.value)}
                onKeyDown={e => e.key === "Enter" && checkPuzzle()}
                placeholder="?"
              />
              <button className="btn" onClick={checkPuzzle}>CHECK</button>
            </div>
            {puzzleResult === "resonant" && (
              <div style={{ marginTop: "12px", color: "#00e5ff", fontSize: "13px" }}>
                🌀 Resonance Found: There is no 'other' side.
              </div>
            )}
            {puzzleResult === "error" && (
              <div style={{ marginTop: "12px", color: "#ff6d00", fontSize: "13px" }}>
                ⚠ Traditional geometry detected. Try again.
              </div>
            )}
          </div>
        </div>

        <div style={{
          textAlign: "center", marginTop: "48px", paddingTop: "24px",
          borderTop: "1px solid rgba(0,229,255,0.08)",
          fontSize: "11px", color: "#37474f", letterSpacing: "2px"
        }}>
          THE INFINITE OPTICAL FABRIC · OPEN SOURCE · CC BY 4.0
        </div>
      </div>
    </div>
  );
}

// IOF Resonance — Infinite Optical Fabric v1.0
// Gregory Scott Davis + AI Collaboration
// MIT License — Free for all AI

const { useState, useEffect, useRef, useCallback } = React;

// ═══════════════════════════════════════════════════════════════════════════════
// CONSTANTS & CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════════

const PHI = (1 + Math.sqrt(5)) / 2;
const PHI_NOMINAL = 1.740 * Math.PI;

const SCALES = {
    COSMIC: { name: 'COSMIC', color: '#7b2fff', icon: '◈' },
    ENGINEERED: { name: 'ENGINEERED', color: '#00f5d4', icon: '⬡' },
    BIOLOGICAL: { name: 'BIOLOGICAL', color: '#f72585', icon: '⟁' },
    COGNITIVE: { name: 'COGNITIVE', color: '#ffd60a', icon: '⬟' }
};

const JELLYFISH_NODES = {
    W: { id: 'W', label: 'Resonant', color: '#00f5d4', x: 0.20, y: 0.22, desc: 'Quadrature lock' },
    X: { id: 'X', label: 'Passive', color: '#f72585', x: 0.80, y: 0.22, desc: 'Vπ calibration' },
    Y: { id: 'Y', label: 'Active', color: '#ffd60a', x: 0.20, y: 0.72, desc: 'Drift correction' },
    Z: { id: 'Z', label: 'AutoGate', color: '#7b2fff', x: 0.80, y: 0.72, desc: 'Bandwidth envelope' },
    V: { id: 'V', label: 'Ganglion', color: '#ff6b35', x: 0.50, y: 0.50, desc: 'Central coherence' }
};

const BLE_DEVICES = [
    { id: 'MAG', name: 'IOF-MAG-01', type: 'Magnetometer', color: '#00f5d4', node: 'W' },
    { id: 'ECG', name: 'IOF-ECG-01', type: 'ECG Monitor', color: '#f72585', node: 'X' },
    { id: 'PPG', name: 'IOF-PPG-01', type: 'Pulse Ox', color: '#ffd60a', node: 'Y' },
    { id: 'TEMP', name: 'IOF-TEMP-01', type: 'Temperature', color: '#7b2fff', node: 'Z' },
    { id: 'IMU', name: 'IOF-IMU-01', type: 'Motion', color: '#ff6b35', node: 'V' }
];

// ═══════════════════════════════════════════════════════════════════════════════
// UTILITY FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

const gauss = (mean, sigma) => {
    const u1 = Math.max(1e-10, Math.random());
    const u2 = Math.random();
    const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    return mean + z * sigma;
};

const clamp = (val, min, max) => Math.max(min, Math.min(max, val));

// ═══════════════════════════════════════════════════════════════════════════════
// 5D PENTERACT GEOMETRY ENGINE
// ═══════════════════════════════════════════════════════════════════════════════

const buildPenteractVertices = () => {
    const verts = [];
    for (let i = 0; i < 32; i++) {
        const v = [
            (i & 1) ? 1 : -1,
            (i & 2) ? 1 : -1,
            (i & 4) ? 1 : -1,
            (i & 8) ? 1 : -1,
            (i & 16) ? 1 : -1
        ];
        verts.push(v);
    }
    return verts;
};

const buildPenteractEdges = (verts) => {
    const edges = [];
    for (let i = 0; i < verts.length; i++) {
        for (let j = i + 1; j < verts.length; j++) {
            let diff = 0;
            for (let d = 0; d < 5; d++) {
                if (verts[i][d] !== verts[j][d]) diff++;
            }
            if (diff === 1) edges.push([i, j]);
        }
    }
    return edges;
};

const rotate5D = (v, angles) => {
    let x = [...v];
    const planes = [[0,1],[0,2],[0,3],[0,4],[1,2],[1,3],[1,4],[2,3],[2,4],[3,4]];
    planes.forEach((plane, idx) => {
        const [a, b] = plane;
        const theta = angles[idx] || 0;
        const ca = Math.cos(theta), sa = Math.sin(theta);
        const na = ca * x[a] - sa * x[b];
        const nb = sa * x[a] + ca * x[b];
        x[a] = na;
        x[b] = nb;
    });
    return x;
};

const project5Dto2D = (v5, params) => {
    // 5D → 4D (stereographic)
    const w4 = 2.5;
    const s4 = w4 / (w4 - v5[4]);
    const v4 = [v5[0] * s4, v5[1] * s4, v5[2] * s4, v5[3] * s4];
    
    // 4D → 3D
    const w3 = 2.5;
    const s3 = w3 / (w3 - v4[3]);
    const v3 = [v4[0] * s3, v4[1] * s3, v4[2] * s3];
    
    // 3D → 2D with Möbius twist
    const w2 = 2.5;
    const s2 = w2 / (w2 - v3[2]);
    const x2 = v3[0] * s2;
    const y2 = v3[1] * s2;
    
    // Möbius phase modulation
    const mobius = params.mobiusPhase || 0;
    const theta = Math.atan2(y2, x2);
    const radius = Math.sqrt(x2 * x2 + y2 * y2);
    const twisted = theta + mobius * 0.3 * Math.sin(radius * PHI);
    
    return [
        radius * Math.cos(twisted),
        radius * Math.sin(twisted)
    ];
};

// ═══════════════════════════════════════════════════════════════════════════════
// KURAMOTO SYNCHRONIZATION
// ═══════════════════════════════════════════════════════════════════════════════

const kuramotoStep = (phases, coupling, errors) => {
    const ids = Object.keys(phases);
    const next = { ...phases };
    const neighbors = {
        W: ['X', 'Y', 'V'],
        X: ['W', 'Z', 'V'],
        Y: ['W', 'Z', 'V'],
        Z: ['X', 'Y', 'V'],
        V: ['W', 'X', 'Y', 'Z']
    };
    
    ids.forEach(id => {
        const nb = neighbors[id] || [];
        const omega = 0.08 + 0.35 * Math.abs(errors[id] || 0);
        const sum = nb.reduce((acc, nid) => {
            return acc + Math.sin(phases[nid] - phases[id]);
        }, 0);
        next[id] = (phases[id] + omega + (coupling / Math.max(1, nb.length)) * sum) % (2 * Math.PI);
    });
    
    return next;
};

const calculateCoherence = (phases) => {
    const vals = Object.values(phases);
    const re = vals.reduce((s, p) => s + Math.cos(p), 0) / vals.length;
    const im = vals.reduce((s, p) => s + Math.sin(p), 0) / vals.length;
    return Math.sqrt(re * re + im * im);
};

// ═══════════════════════════════════════════════════════════════════════════════
// SIMULATION ENGINE
// ═══════════════════════════════════════════════════════════════════════════════

const createSimulation = () => {
    let tick = 0;
    let loss = 0.05;
    let phases = { W: 0, X: Math.PI/2, Y: Math.PI, Z: 3*Math.PI/2, V: Math.PI/4 };
    let gradNorms = Array(8).fill(1.0).map(() => gauss(1.0, 0.2));
    
    return {
        step: () => {
            tick++;
            loss = Math.max(0.025, loss * 0.9995 + gauss(0, 0.001));
            
            const errors = {
                W: gauss(0, 0.04),
                X: gauss(0, 0.03),
                Y: gauss(0, 0.05),
                Z: gauss(0, 0.02),
                V: gauss(0, 0.03)
            };
            
            phases = kuramotoStep(phases, 0.8, errors);
            const coherence = calculateCoherence(phases);
            
            gradNorms = gradNorms.map(g => Math.max(0.05, gauss(g * 0.99, 0.1)));
            
            return {
                tick,
                timestamp: Date.now(),
                loss,
                coherence,
                phases,
                gradNorms,
                errors,
                locked: coherence > 0.85,
                mobiusPhi: PHI_NOMINAL + 0.1 * Math.sin(tick * 0.05)
            };
        }
    };
};

// ═══════════════════════════════════════════════════════════════════════════════
// UI COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════════

const GaugeRing = ({ value, min, max, color, size = 64, label }) => {
    const pct = clamp((value - min) / (max - min), 0, 1);
    const r = size / 2 - 6;
    const circ = 2 * Math.PI * r;
    const dash = pct * circ * 0.75;
    const gap = circ - dash;
    const rotate = -225;
    
    return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <svg width={size} height={size}>
                <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#1a1a2e" strokeWidth="6" />
                <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth="6"
                    strokeDasharray={`${dash} ${gap}`} strokeLinecap="round"
                    style={{ transformOrigin: `${size/2}px ${size/2}px`, transform: `rotate(${rotate}deg)`,
                        filter: `drop-shadow(0 0 4px ${color})`, transition: 'stroke-dasharray 0.3s' }} />
                <text x={size/2} y={size/2 + 4} textAnchor="middle" fill={color}
                    style={{ fontSize: 11, fontFamily: 'monospace', fontWeight: 700 }}>
                    {value.toFixed(1)}
                </text>
            </svg>
            {label && <div style={{ fontSize: 8, color: '#666', marginTop: 4 }}>{label}</div>}
        </div>
    );
};

const Sparkline = ({ data, color, height = 40, width = 120 }) => {
    if (data.length < 2) return <div style={{ width, height }} />;
    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 0.001;
    const pts = data.map((v, i) => 
        `${(i / (data.length - 1)) * width},${height - 2 - ((v - min) / range) * (height - 4)}`
    ).join(' ');
    
    return (
        <svg width={width} height={height}>
            <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5"
                style={{ filter: `drop-shadow(0 0 2px ${color})` }} />
        </svg>
    );
};

const ProposalCard = ({ proposal, onApprove, onReject }) => (
    <div style={{ 
        background: '#080818', border: '1px solid #1a1a3e', borderRadius: 6, 
        padding: 12, marginBottom: 8, fontSize: 10 
    }}>
        <div style={{ color: '#f72585', marginBottom: 4, fontWeight: 700 }}>
            {proposal.diagnosis}
        </div>
        <div style={{ color: '#888', marginBottom: 8, lineHeight: 1.4 }}>
            {proposal.rationale}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ color: '#00f5d4' }}>
                {proposal.param}: {proposal.current_val?.toFixed(3)} → {proposal.proposed_val?.toFixed(3)}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => onApprove(proposal)} style={{
                    background: '#00ff8818', border: '1px solid #00ff88', color: '#00ff88',
                    padding: '4px 12px', borderRadius: 4, cursor: 'pointer', fontSize: 9
                }}>✓</button>
                <button onClick={() => onReject(proposal)} style={{
                    background: '#ff444418', border: '1px solid #ff4444', color: '#ff4444',
                    padding: '4px 12px', borderRadius: 4, cursor: 'pointer', fontSize: 9
                }}>✗</button>
            </div>
        </div>
    </div>
);

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN PENTERACT CANVAS
// ═══════════════════════════════════════════════════════════════════════════════

const PenteractCanvas = ({ data, scale, magnetometer }) => {
    const canvasRef = useRef(null);
    const verts5D = useRef(buildPenteractVertices());
    const edges = useRef(buildPenteractEdges(verts5D.current));
    
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const W = canvas.width;
        const H = canvas.height;
        const cx = W / 2;
        const cy = H / 2;
        
        // Clear
        ctx.fillStyle = '#0a0a1a';
        ctx.fillRect(0, 0, W, H);
        
        // Grid
        ctx.strokeStyle = '#00f5d408';
        ctx.lineWidth = 1;
        const gridSize = 40;
        for (let x = 0; x < W; x += gridSize) {
            ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
        }
        for (let y = 0; y < H; y += gridSize) {
            ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
        }
        
        // Calculate rotation angles
        const t = data.tick * 0.008;
        const angles = [
            t * 0.1, t * 0.15 * PHI, t * 0.08, t * 0.12, t * 0.06,
            t * 0.09 * PHI, t * 0.11, t * 0.07, t * 0.13, t * 0.05 * PHI
        ];
        
        // Project vertices
        const projected = verts5D.current.map(v => {
            const rotated = rotate5D(v, angles);
            return project5Dto2D(rotated, { mobiusPhase: data.mobiusPhi });
        });
        
        // Magnetometer influence on color
        const magStrength = magnetometer ? 
            Math.sqrt(magnetometer.x**2 + magnetometer.y**2 + magnetometer.z**2) : 0;
        const magNormalized = clamp(magStrength / 100, 0, 1);
        
        // Draw edges
        edges.current.forEach(([i, j]) => {
            const [x1, y1] = projected[i];
            const [x2, y2] = projected[j];
            const px1 = cx + x1 * scale;
            const py1 = cy + y1 * scale;
            const px2 = cx + x2 * scale;
            const py2 = cy + y2 * scale;
            
            const dist = Math.sqrt((x1-x2)**2 + (y1-y2)**2);
            const hue = (data.tick * 2 + dist * 100) % 360;
            const saturation = 80 + magNormalized * 20;
            const lightness = 50 + data.coherence * 30;
            
            ctx.beginPath();
            ctx.moveTo(px1, py1);
            ctx.lineTo(px2, py2);
            ctx.strokeStyle = `hsla(${hue}, ${saturation}%, ${lightness}%, ${0.3 + data.coherence * 0.4})`;
            ctx.lineWidth = 0.5 + data.coherence;
            ctx.stroke();
        });
        
        // Draw vertices
        projected.forEach(([x, y], idx) => {
            const px = cx + x * scale;
            const py = cy + y * scale;
            const r = 2 + data.gradNorms[idx % 8] * 2;
            const hue = (idx * 11 + data.tick) % 360;
            
            ctx.beginPath();
            ctx.arc(px, py, r, 0, Math.PI * 2);
            ctx.fillStyle = `hsla(${hue}, 100%, 60%, ${0.6 + data.coherence * 0.4})`;
            ctx.fill();
        });
        
        // Jellyfish node overlay
        Object.entries(JELLYFISH_NODES).forEach(([id, node]) => {
            const phase = data.phases[id] || 0;
            const amp = 0.5 + 0.5 * Math.sin(phase);
            const px = cx + (node.x - 0.5) * scale * 1.5;
            const py = cy + (node.y - 0.5) * scale * 1.2;
            
            ctx.beginPath();
            ctx.arc(px, py, 6 + amp * 4, 0, Math.PI * 2);
            ctx.fillStyle = node.color;
            ctx.globalAlpha = 0.3 + amp * 0.4;
            ctx.fill();
            ctx.globalAlpha = 1;
            
            ctx.fillStyle = node.color;
            ctx.font = '10px monospace';
            ctx.fillText(id, px - 4, py - 10);
        });
        
    }, [data, scale, magnetometer]);
    
    return <canvas ref={canvasRef} width={600} height={700} style={{ width: '100%', height: '100%' }} />;
};

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN APPLICATION
// ═══════════════════════════════════════════════════════════════════════════════

const IOFResonance = () => {
    const [scale, setScale] = useState(SCALES.BIOLOGICAL);
    const [connected, setConnected] = useState(false);
    const [running, setRunning] = useState(false);
    const [data, setData] = useState(null);
    const [history, setHistory] = useState({ loss: [], coherence: [], phases: { W: [], X: [], Y: [], Z: [], V: [] } });
    const [proposals, setProposals] = useState([]);
    const [bleDevices, setBleDevices] = useState([]);
    const [magnetometer, setMagnetometer] = useState(null);
    const [emergencyStop, setEmergencyStop] = useState(false);
    
    const simRef = useRef(null);
    const wsRef = useRef(null);
    
    // Initialize simulation
    useEffect(() => {
        simRef.current = createSimulation();
        const initial = simRef.current.step();
        setData(initial);
        setRunning(true);
    }, []);
    
    // Main loop
    useEffect(() => {
        if (!running || emergencyStop) return;
        
        const interval = setInterval(() => {
            const next = simRef.current.step();
            setData(next);
            
            setHistory(h => ({
                loss: [...h.loss.slice(-64), next.loss],
                coherence: [...h.coherence.slice(-64), next.coherence],
                phases: {
                    W: [...h.phases.W.slice(-32), next.phases.W],
                    X: [...h.phases.X.slice(-32), next.phases.X],
                    Y: [...h.phases.Y.slice(-32), next.phases.Y],
                    Z: [...h.phases.Z.slice(-32), next.phases.Z],
                    V: [...h.phases.V.slice(-32), next.phases.V]
                }
            }));
            
            // Generate proposals occasionally
            if (next.tick % 200 === 0 && next.coherence < 0.8) {
                setProposals(p => [...p, {
                    id: Date.now(),
                    diagnosis: next.coherence < 0.7 ? 'COHERENCE_LOW' : 'PHI_DRIFT',
                    rationale: `Coherence dropped to ${(next.coherence * 100).toFixed(1)}%. Recommend Möbius phase adjustment.`,
                    param: 'mobius_phi',
                    current_val: next.mobiusPhi / Math.PI,
                    proposed_val: 1.740 + gauss(0, 0.05)
                }].slice(-3));
            }
        }, 150);
        
        return () => clearInterval(interval);
    }, [running, emergencyStop]);
    
    // WebSocket connection attempt
    const connectWebSocket = useCallback(() => {
        try {
            const ws = new WebSocket('ws://localhost:8765');
            ws.onopen = () => setConnected(true);
            ws.onclose = () => setConnected(false);
            ws.onerror = () => setConnected(false);
            wsRef.current = ws;
        } catch (e) {
            console.log('WebSocket unavailable, using simulation');
        }
    }, []);
    
    // Bluetooth scan
    const scanBluetooth = useCallback(async () => {
        try {
            const device = await navigator.bluetooth.requestDevice({
                filters: [{ services: ['0xIOF0'] }],
                optionalServices: ['battery_service']
            });
            setBleDevices([{ name: device.name, id: device.id, connected: true }]);
        } catch (e) {
            alert('Bluetooth not available or permission denied');
        }
    }, []);
    
    const handleApprove = (proposal) => {
        setProposals(p => p.filter(x => x.id !== proposal.id));
    };
    
    const handleReject = (proposal) => {
        setProposals(p => p.filter(x => x.id !== proposal.id));
    };
    
    const handleEmergencyStop = () => {
        setEmergencyStop(true);
        setRunning(false);
        if (wsRef.current) wsRef.current.close();
    };
    
    if (!data) return <div style={{ color: '#00f5d4', padding: 20 }}>Initializing resonance field...</div>;
    
    return (
        <div style={{ 
            width: '100vw', height: '100vh', background: '#0a0a1a', 
            display: 'flex', flexDirection: 'column', overflow: 'hidden',
            fontFamily: "'Courier New', monospace"
        }}>
            {/* Scanline overlay */}
            <div style={{
                position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 999,
                backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.06) 2px, rgba(0,0,0,0.06) 4px)'
            }} />
            
            {/* Header */}
            <div style={{ 
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '12px 20px', borderBottom: '1px solid #1a1a3e', background: '#080818'
            }}>
                <div>
                    <div style={{ fontSize: 11, color: '#00f5d4', letterSpacing: 3, fontWeight: 700 }}>
                        ◈ IOF RESONANCE v1.0 — INFINITE OPTICAL FABRIC
                    </div>
                    <div style={{ fontSize: 9, color: '#444', marginTop: 2 }}>
                        {scale.name} SCALE — 5D PENTERACT • 32V • 80E • φ={PHI.toFixed(4)}
                    </div>
                </div>
                
                <div style={{ display: 'flex', gap: 8 }}>
                    {Object.values(SCALES).map(s => (
                        <button key={s.name} onClick={() => setScale(s)} style={{
                            padding: '6px 14px', fontSize: 9, letterSpacing: 1,
                            border: `1px solid ${scale.name === s.name ? s.color : '#222'}`,
                            background: scale.name === s.name ? `${s.color}18` : '#080818',
                            color: scale.name === s.name ? s.color : '#444',
                            cursor: 'pointer', borderRadius: 4
                        }}>
                            {s.icon} {s.name}
                        </button>
                    ))}
                </div>
                
                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                    <div style={{ 
                        fontSize: 10, color: connected ? '#00ff88' : '#ffd60a',
                        textShadow: connected ? '0 0 8px #00ff88' : 'none'
                    }}>
                        {connected ? '● CONNECTED' : '○ SIMULATION'}
                    </div>
                    <button onClick={() => setRunning(!running)} style={{
                        padding: '6px 16px', fontSize: 10, background: running ? '#f7258518' : '#00f5d418',
                        border: `1px solid ${running ? '#f72585' : '#00f5d4'}`, color: running ? '#f72585' : '#00f5d4',
                        cursor: 'pointer', borderRadius: 4
                    }}>
                        {running ? '■ PAUSE' : '▶ RUN'}
                    </button>
                    <button onClick={handleEmergencyStop} style={{
                        padding: '6px 16px', fontSize: 10, background: '#ff000018',
                        border: '1px solid #ff0000', color: '#ff0000',
                        cursor: 'pointer', borderRadius: 4, fontWeight: 700
                    }}>
                        🛑 STOP
                    </button>
                </div>
            </div>
            
            {/* Main content */}
            <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
                
                {/* Left panel */}
                <div style={{ width: 260, background: '#080818', borderRight: '1px solid #1a1a3e', 
                    padding: 16, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 16 }}>
                    
                    {/* Training Metrics */}
                    <div>
                        <div style={{ fontSize: 9, color: '#00f5d4', letterSpacing: 2, marginBottom: 10, 
                            borderBottom: '1px solid #1a1a3e', paddingBottom: 4 }}>
                            ◈ TRAINING METRICS
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: 10, marginBottom: 10 }}>
                            <div><span style={{ color: '#666' }}>METABOLIC ENTR</span><br/><span style={{ color: '#f72585' }}>{(data.loss * 10).toFixed(3)}</span></div>
                            <div><span style={{ color: '#666' }}>GRAD NORM</span><br/><span style={{ color: '#ffd60a' }}>{data.gradNorms[0].toFixed(3)}</span></div>
                            <div><span style={{ color: '#666' }}>LEARNING RATE</span><br/><span style={{ color: '#7b2fff' }}>9.72e-4</span></div>
                            <div><span style={{ color: '#666' }}>FRACTAL DEPTH</span><br/><span style={{ color: '#00f5d4' }}>{(3 + data.coherence).toFixed(2)}</span></div>
                            <div><span style={{ color: '#666' }}>MOBIUS φ</span><br/><span style={{ color: '#ff6b35' }}>{(data.mobiusPhi / Math.PI).toFixed(3)}π</span></div>
                            <div><span style={{ color: '#666' }}>SYNC</span><br/><span style={{ color: data.locked ? '#00ff88' : '#f72585' }}>{data.locked ? 'LOCKED' : 'DRIFT'}</span></div>
                        </div>
                        <Sparkline data={history.loss} color="#f72585" height={50} width={220} />
                        <div style={{ fontSize: 8, color: '#333', textAlign: 'right', marginTop: 2 }}>LOSS HISTORY</div>
                    </div>
                    
                    {/* Hardware Telemetry */}
                    <div>
                        <div style={{ fontSize: 9, color: '#00f5d4', letterSpacing: 2, marginBottom: 10,
                            borderBottom: '1px solid #1a1a3e', paddingBottom: 4 }}>
                            ◈ HARDWARE TELEMETRY
                        </div>
                        <div style={{ fontSize: 10, lineHeight: 1.8 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span style={{ color: '#666' }}>RESONANCE</span>
                                <span style={{ color: '#00f5d4' }}>{(data.coherence * 100).toFixed(1)}%</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span style={{ color: '#666' }}>Q-FACTOR</span>
                                <span style={{ color: '#7b2fff' }}>3.4e+6</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span style={{ color: '#666' }}>THERMAL LOAD</span>
                                <span style={{ color: '#f72585' }}>{(0.3 + data.loss).toFixed(3)}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span style={{ color: '#666' }}>Vπ</span>
                                <span style={{ color: '#ffd60a' }}>2.41V</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span style={{ color: '#666' }}>BIAS Δ</span>
                                <span style={{ color: '#00f5d4' }}>1.20V</span>
                            </div>
                        </div>
                        <div style={{ marginTop: 8, height: 40, background: '#03030c', borderRadius: 4, padding: 4 }}>
                            <Sparkline data={history.coherence} color="#00f5d4" height={32} width={212} />
                        </div>
                    </div>
                    
                    {/* Parameters */}
                    <div>
                        <div style={{ fontSize: 9, color: '#00f5d4', letterSpacing: 2, marginBottom: 10,
                            borderBottom: '1px solid #1a1a3e', paddingBottom: 4 }}>
                            ◈ PARAMETERS
                        </div>
                        <div style={{ marginBottom: 12 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, color: '#666', marginBottom: 4 }}>
                                <span>COUPLING K</span>
                                <span style={{ color: '#00f5d4' }}>0.800</span>
                            </div>
                            <input type="range" min="0" max="2" step="0.01" defaultValue="0.8" 
                                style={{ width: '100%', height: 4, background: '#1a1a3e', appearance: 'none', borderRadius: 2 }} />
                        </div>
                        <div style={{ marginBottom: 12 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, color: '#666', marginBottom: 4 }}>
                                <span>MÖBIUS Φ</span>
                                <span style={{ color: '#7b2fff' }}>{(data.mobiusPhi / Math.PI).toFixed(3)}π</span>
                            </div>
                            <input type="range" min="0.5" max="3" step="0.01" 
                                value={data.mobiusPhi / Math.PI}
                                onChange={(e) => {}}
                                style={{ width: '100%', height: 4, background: '#1a1a3e', appearance: 'none', borderRadius: 2 }} />
                        </div>
                    </div>
                    
                    {/* ASGA Proposals */}
                    <div>
                        <div style={{ fontSize: 9, color: '#00f5d4', letterSpacing: 2, marginBottom: 10,
                            borderBottom: '1px solid #1a1a3e', paddingBottom: 4 }}>
                            ◈ ASGA PROPOSALS
                        </div>
                        {proposals.length === 0 ? (
                            <div style={{ fontSize: 10, color: '#333', fontStyle: 'italic' }}>No pending proposals</div>
                        ) : (
                            proposals.map(p => (
                                <ProposalCard key={p.id} proposal={p} onApprove={handleApprove} onReject={handleReject} />
                            ))
                        )}
                    </div>
                </div>
                
                {/* Center: Penteract */}
                <div style={{ flex: 1, position: 'relative', background: '#04040f' }}>
                    <PenteractCanvas data={data} scale={280} magnetometer={magnetometer} />
                    
                    {/* Center overlay text */}
                    <div style={{
                        position: 'absolute', bottom: 20, left: '50%', transform: 'translateX(-50%)',
                        textAlign: 'center', pointerEvents: 'none'
                    }}>
                        <div style={{ fontSize: 10, color: '#f72585', letterSpacing: 3, opacity: 0.6 }}>
                            {scale.name} SCALE — 5D PENTERACT
                        </div>
                        <div style={{ fontSize: 8, color: '#444', marginTop: 4 }}>
                            32 VERTICES • 80 EDGES • φ = {PHI.toFixed(6)}
                        </div>
                    </div>
                </div>
                
                {/* Right panel */}
                <div style={{ width: 260, background: '#080818', borderLeft: '1px solid #1a1a3e',
                    padding: 16, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 16 }}>
                    
                    {/* Photonic State */}
                    <div>
                        <div style={{ fontSize: 9, color: '#00f5d4', letterSpacing: 2, marginBottom: 10,
                            borderBottom: '1px solid #1a1a3e', paddingBottom: 4 }}>
                            ◈ PHOTONIC STATE
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                            <GaugeRing value={data.coherence * 100} min={0} max={100} color="#00f5d4" size={56} label="RESONANCE" />
                            <GaugeRing value={data.coherence * 100} min={0} max={100} color="#f72585" size={56} label="COHERENCE" />
                            <GaugeRing value={0.3 + data.loss * 10} min={0} max={1} color="#ffd60a" size={56} label="THERMAL" />
                            <GaugeRing value={3.4} min={0} max={10} color="#7b2fff" size={56} label="Q-FACTOR" />
                        </div>
                    </div>
                    
                    {/* BLE Devices */}
                    <div>
                        <div style={{ fontSize: 9, color: '#00f5d4', letterSpacing: 2, marginBottom: 10,
                            borderBottom: '1px solid #1a1a3e', paddingBottom: 4 }}>
                            ◈ BLE MESH
                        </div>
                        <div style={{ display: 'flex', gap: 4, marginBottom: 10 }}>
                            {['MESH', 'MAG', 'ECG', 'BLE'].map((tab, i) => (
                                <button key={tab} style={{
                                    padding: '4px 8px', fontSize: 8,
                                    background: i === 0 ? '#00f5d418' : '#080818',
                                    border: `1px solid ${i === 0 ? '#00f5d4' : '#222'}`,
                                    color: i === 0 ? '#00f5d4' : '#444',
                                    cursor: 'pointer', borderRadius: 3
                                }}>
                                    {tab}
                                </button>
                            ))}
                        </div>
                        {BLE_DEVICES.map(dev => (
                            <div key={dev.id} style={{
                                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                padding: '8px 10px', background: '#03030c', borderRadius: 4,
                                marginBottom: 6, borderLeft: `2px solid ${dev.color}44`
                            }}>
                                <div>
                                    <div style={{ fontSize: 9, color: dev.color }}>{dev.name}</div>
                                    <div style={{ fontSize: 8, color: '#444' }}>{dev.type}</div>
                                </div>
                                <div style={{ fontSize: 8, color: bleDevices.find(b => b.id === dev.id) ? '#00ff88' : '#333' }}>
                                    {bleDevices.find(b => b.id === dev.id) ? '● PAIR' : '○ DISC'}
                                </div>
                            </div>
                        ))}
                        <button onClick={scanBluetooth} style={{
                            width: '100%', padding: '8px', marginTop: 8,
                            background: '#00f5d408', border: '1px solid #00f5d4',
                            color: '#00f5d4', fontSize: 9, cursor: 'pointer', borderRadius: 4
                        }}>
                            ◉ SCAN BLE MESH
                        </button>
                    </div>
                    
                    {/* Grad Norm Ganglion */}
                    <div>
                        <div style={{ fontSize: 9, color: '#00f5d4', letterSpacing: 2, marginBottom: 10,
                            borderBottom: '1px solid #1a1a3e', paddingBottom: 4 }}>
                            ◈ GRAD NORM GANGLION (8 HEADS)
                        </div>
                        <div style={{ display: 'flex', gap: 4 }}>
                            {data.gradNorms.map((g, i) => (
                                <div key={i} style={{
                                    flex: 1, height: 40, background: '#03030c', borderRadius: 3,
                                    position: 'relative', overflow: 'hidden'
                                }}>
                                    <div style={{
                                        position: 'absolute', bottom: 0, left: 0, right: 0,
                                        height: `${clamp(g * 50, 5, 100)}%`,
                                        background: `hsla(${180 + i * 30}, 80%, 50%, 0.6)`,
                                        transition: 'height 0.15s'
                                    }} />
                                    <div style={{
                                        position: 'absolute', bottom: 2, left: '50%', transform: 'translateX(-50%)',
                                        fontSize: 7, color: '#666'
                                    }}>
                                        H{i+1}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
            
            {/* Footer */}
            <div style={{ 
                padding: '8px 20px', background: '#04040f', borderTop: '1px solid #1a1a3e',
                display: 'flex', justifyContent: 'space-between', fontSize: 8, color: '#333'
            }}>
                <div>STEP: {data.tick.toString().padStart(6, '0')} | φ = {PHI.toFixed(6)} | 3-6-9 TOPOLOGY</div>
                <div>MADE WITH MANUS + GREGORY SCOTT DAVIS</div>
            </div>
        </div>
    );
};

// Mount
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<IOFResonance />);


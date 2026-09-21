# IOF Resonance Simulator (React)

Interactive educational visualization of the Infinite Optical Fabric resonance concepts.

## Features
- Live waveform canvas (incident + reflected waves, standing-wave envelope)
- Phase / frequency / amplitude / noise controls
- Resonance quality and energy-efficiency metrics
- Möbius topology puzzle
- Auto-tune to resonant state

## Usage

```bash
# In a React project (Vite recommended)
npm install
# Copy IOFSimulator.jsx into your src/
# Then:
import IOFSimulator from './IOFSimulator';

function App() {
  return <IOFSimulator />;
}
```

Or open the component in any React sandbox (CodeSandbox, StackBlitz, etc.).

Released under CC BY 4.0.

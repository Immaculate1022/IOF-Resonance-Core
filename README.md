# Adaptive Hollow Reflector - Endpoint Edition

**A global immune system for endpoints. Free, real-time, behavioral defense against ransomware.**

Copyright 2026 Gregory Scott Davis  
Licensed under [IOF Attribution License v1.0](./LICENSE)

---

## Overview

Ransomware dwell time is 5-60 seconds. EDR response time is 30-300 seconds. That gap is where companies die.

AHR-Endpoint closes the gap with <2s global containment using ephemeral invariants, decoy rotation, and cross-host propagation scoring.

## How It Works

AHR treats attacks as "hollows" in system state-space. When a process exhibits ransomware behavior, AHR:

1. **Detects** - High entropy writes + VSS delete + C2 contact = `FileHollow{risk: 9}`
2. **Contains** - Drops a 60s `KILL_TREE` invariant on that process hash
3. **Immunizes** - Pushes the invariant to all 100k hosts in <2s via NATS
4. **Escalates** - `domain_admin` compromise? `REVOKE_SESSION` + page SOC

Result: Patient Zero loses files. Patient Two loses nothing.

## Key Features

- **Sub-2s Global Recalc**: Outbreak on host A protects host B before encryption starts
- **Graduated Response**: `SUSPEND_PROC` → `FLAG_FOR_HUMAN_REVIEW` → `KILL_TREE` → `ISOLATE_HOST`
- **Identity Fusion**: `REVOKE_SESSION` + `TRIGGER_MFA_REPROMPT` built into endpoint logic
- **Deception**: Rotating honeyfiles + honeycreds trip attackers and waste their time
- **Free Forever**: IOF Attribution License v1.0. Use it, fork it, embed it. Attribution required.

## Components

### Forensic Telemetry AI Analyst Dashboard
The `ForensicTelemetry.jsx` component is a high-integration dashboard featuring:
- **Universal Streaming**: Real-time AI analysis using advanced LLM hooks.
- **Forensic Tools**: Live querying of system metrics, event logs, and telemetry history.
- **Threat Visualization**: Real-time radar and chart-based anomaly detection.

### IOF Resonance Production Enterprise System v4.0
The `iof_resonance_production.py` script is a complete production-ready system featuring:
- **CI/CD Pipelines**: Automated GitHub Actions and GitLab CI workflows.
- **Monitoring**: Integrated Prometheus and Grafana configurations.
- **Cost Optimization**: Intelligent resource allocation and spot instance strategies.

### Topographic Peak Ascent
The `TopographicPeakAscent.jsx` component implements an enhanced topological memory bank with peak detection. It enables the AI to visualize the resonance landscape and actively navigate toward optimal summits.

### IOF Resonance Visualization
A web-based dashboard (`index.html` & `IOF_Resonance_Complete.jsx`) providing a real-time, physics-driven visualization of topological manifold resonance.

## Documentation

- **[Topological Optimization & Emergency Recovery Logic](./docs/TopologicalOptimizationLogic.md)**: A deep dive into the conceptual framework of self-healing systems and state reversion.
- **[The Cosmological Bridge](./docs/CosmologicalBridge.md)**: Exploring the Infinite Optical Fabric as an implementation of cosmic principles.
- **[Executive White Paper](./docs/ExecutiveWhitePaper.md)**: A conceptual brief for investors and engineers.

## Project Structure

```text
.
├── .github/workflows/      # Automated CI/CD Workflows
│   └── android_build.yml   # Automated Android APK Build
├── docs/                   # Technical documentation and licenses
│   ├── CosmologicalBridge.md
│   ├── ExecutiveWhitePaper.md
│   └── TopologicalOptimizationLogic.md
├── index.html              # IOF Resonance Web Visualization (Entry)
├── IOF_Resonance_Complete.jsx # IOF Resonance Dashboard (React)
├── IOFv3Dashboard.jsx      # Station 2 Flux Dashboard (React)
├── TopographicPeakAscent.jsx # Topological Peak Ascent Optimizer (React)
├── ForensicTelemetry.jsx   # AI Analyst Dashboard (React)
├── iof_resonance_production.py # Enterprise Production System (Python)
├── LICENSE                 # IOF Attribution License v1.0
├── README.md               # Project overview and quickstart
└── .gitignore              # Standard ignore rules
```

## Quickstart

```bash
git clone https://github.com/Immaculate1022/Immune-license-docs.git
cd Immune-license-docs
# To use the dashboards, import components into your React app
```

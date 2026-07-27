# The 3-of-5 Multisig Protocol (v1.0)

> A human-centric consensus mechanism for decentralized dispute resolution. Designed for real-world governance where trust is distributed, authority is accountable, and consensus requires deliberate judgment.

*Referenced by the IOF v3 "Gold Build" as the candidate mechanism for higher-order governance decisions (see [GoldBuild_IntegrationReport.md](GoldBuild_IntegrationReport.md)). Content recovered from the deployed protocol site snapshot.*

---

## How It Works

When two objects claim the same position in the system, a **collision** is declared. The protocol provides a structured process for resolution through human judgment backed by cryptographic verification and economic incentives.

| Step | Stage | Description |
|---|---|---|
| 1 | Collision Declared | Two conflicting objects enter **SUPERPOSITION** state |
| 2 | Board Deliberates | 5 designated witnesses review evidence (24–72 hours) |
| 3 | Votes Submitted | Each member signs their vote with their private key |
| 4 | Consensus Reached | 3+ votes collapse superposition; winner becomes **CANONICAL** |
| 5 | Settlement Executed | Slashing and coherence grants distribute incentives |

## State Transitions

Objects move through well-defined states with clear rules for each transition:

```
PROPOSED → SUPERPOSITION → CANONICAL
                         ↘ DECOHERED / ARTIFACT
                         ↘ INDETERMINATE (no consensus → DAO escalation)
```

## Protocol Features

- **Human-Centric Consensus** — Five designated witnesses make deliberate, accountable decisions. Not algorithms; real people with real stakes.
- **Cryptographic Security** — Hardware wallet signatures ensure votes are deliberate, verifiable, and tamper-proof.
- **Game-Theoretic Incentives** — Slashing penalties and coherence grants align individual incentives with collective truth-seeking.
- **Bounded Resolution** — 72-hour resolution window with automatic escalation to DAO vote if consensus isn't reached.
- **Clear State Transitions** — PROPOSED → SUPERPOSITION → CANONICAL or DECOHERED.
- **Byzantine Fault Tolerant** — The 3-of-5 threshold tolerates up to 2 malicious or unavailable board members.

## Economic Model

The protocol uses cryptoeconomic incentives to ensure honest participation and penalize malicious behavior.

| Outcome | Effects |
|---|---|
| **Consensus Reached** | Winner becomes CANONICAL; loser marked ARTIFACT; challenger stake returned; board members rewarded |
| **No Consensus** | Both objects INDETERMINATE; stake returned to challenger; escalates to DAO vote; graceful degradation |
| **Challenge Rejected** | Challenger stake slashed; coherence grant distributed; winning voters rewarded; deters frivolous challenges |

## Use Cases

- **DAO Governance** — Resolve disputes over treasury allocations, proposal interpretations, or membership decisions.
- **Content Moderation** — Adjudicate content disputes in decentralized platforms with accountable human review.
- **Oracle Disputes** — Resolve conflicting data submissions in oracle networks with economic finality.
- **NFT Provenance** — Determine canonical ownership when multiple claims exist for the same asset.

---

*Open source under MIT License.*

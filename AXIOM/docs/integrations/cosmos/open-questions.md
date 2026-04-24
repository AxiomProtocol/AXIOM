# Cosmos — Open Questions

---

## Foundational Architecture Decisions (Block All Implementation)

### Q1: Appchain vs IBC Hub Integration — which path?
- **Why it matters:** The single most important architecture decision for Cosmos. Determines all tooling, expertise requirements, and timeline.
- **Resolved?** No
- **Who resolves:** Axiom founder + technical lead
- **Factors:** Sovereignty goals, Go expertise availability, timeline, AXM tokenomics redesign
- **Recommendation:** Decide this explicitly before any Cosmos SDK work begins

### Q2: EVM-compatible (Ethermint/evmOS) or native Cosmos chain?
- **Why it matters:** EVM compatibility would allow reuse of Solidity contracts (ERC-3643, AXUSD, AXAU). Native Cosmos chain requires rewriting everything in Go or CosmWasm (Rust).
- **Resolved?** No
- **Recommendation:** Strongly consider Ethermint/evmOS to preserve existing Arbitrum contract investment

### Q3: When does Cosmos become relevant in the Axiom roadmap?
- **Why it matters:** Cosmos is a 18-36 month initiative. Premature prioritization would distract from near-term deliverables.
- **Resolved?** No
- **Recommendation:** Cosmos planning begins only after Polygon + Stellar integrations are live

---

## Technical Questions

### Q4: Does the team have Go expertise?
- **Why it matters:** Cosmos SDK is Go. No Go files exist in current repo. This is a hard skill requirement.
- **Resolved?** No — no Go in current codebase
- **Options:** Train existing engineers, hire Go developer, engage Cosmos ecosystem developer

### Q5: What is the AXM validator economics model on Cosmos?
- **Why it matters:** Launching a Cosmos chain requires designing staking rewards, slashing conditions, and validator incentives. AXM supply must accommodate this.
- **Resolved?** No
- **Who resolves:** Axiom tokenomics / governance team

### Q6: Permissioned vs open validator set?
- **Why it matters:** Open validator set = decentralized but anyone can validate. Permissioned = institutional-grade but less decentralized.
- **Resolved?** No
- **Recommendation:** Permissioned governance-gated validator set for institutional alignment

### Q7: Which IBC chains should Axiom connect to first?
- **Why it matters:** IBC relayer setup and channel establishment requires decisions about which chains to interconnect.
- **Resolved?** No
- **Candidates:** Osmosis (DEX liquidity), Noble (USDC on Cosmos), Cosmos Hub, Celestia

### Q8: How does AXM migration work from Arbitrum to Cosmos?
- **Why it matters:** AXM token holders on Arbitrum must be able to migrate to the Axiom chain. This requires a bridge or snapshot + airdrop mechanism.
- **Resolved?** No
- **Options:** IBC bridge via Axelar/Gravity Bridge, snapshot and airdrop, dual-token (no migration)

---

## Regulatory / Legal Questions

### Q9: Does running a proof-of-stake validator network change AXM's token classification?
- **Why it matters:** If AXM becomes a staking token on a PoS chain, the SEC's Howey test analysis may shift.
- **Resolved?** No — legal review required before Cosmos chain launch

### Q10: Do validators have any regulatory exposure?
- **Why it matters:** Validators process transactions. In some jurisdictions, they may be deemed money service businesses or face other regulatory classification.
- **Resolved?** No

---

## Status Tracking

| Question | Resolved | Date | Resolution |
|---------|----------|------|------------|
| Q1 — Appchain vs IBC hub | No | — | — |
| Q2 — EVM vs native Cosmos | No | — | — |
| Q3 — Roadmap timing | No | — | — |
| Q4 — Go expertise | No | — | — |
| Q5 — Validator economics | No | — | — |
| Q6 — Permissioned vs open validators | No | — | — |
| Q7 — IBC chain connections | No | — | — |
| Q8 — AXM migration mechanism | No | — | — |
| Q9 — AXM token classification | No | — | — |
| Q10 — Validator regulatory exposure | No | — | — |

# Cosmos — Compliance and Identity

---

## Identity on Cosmos

Cosmos chains do not have a native on-chain identity system like ERC-3643. Identity on Cosmos is managed at the module level — custom modules can implement identity logic.

### Cosmos-Native Identity Options

**Option 1: Custom Cosmos Module (`x/identity`)**
- Write a Go module that tracks verified participants on the Axiom chain
- Mirror ERC-3643 state from Arbitrum to Axiom chain's `x/identity` module
- Full control — expensive to build

**Option 2: CosmWasm Contract**
- Deploy a Rust-based CosmWasm smart contract that mirrors identity state
- Easier to iterate on than native modules
- Requires CosmWasm-enabled chain configuration

**Option 3: Allowlist Module**
- Simple allowlist that maps addresses to verification status
- Fastest to build, least expressive

---

## ERC-3643 Migration Design (Future)

If Axiom launches a native chain, the existing ERC-3643 identity system on Arbitrum must eventually be migrated or mirrored to the Axiom chain.

**Design pattern:**
```
Arbitrum ERC-3643 (current) → Cross-chain attestation → Axiom chain x/identity (future)
```

Key considerations:
1. Merkle proof of identity state from Arbitrum L2 → Axiom chain
2. ONCHAINID contract deployment on Axiom chain (via Ethermint if EVM-compatible)
3. Claim topic parity: same CLAIM_TOPICS (KYC_VERIFIED, ACCREDITED_INVESTOR, SANCTIONS_CLEAR)

---

## Governance and Compliance

### AXM as Governance Token on Cosmos
- AXM holders stake to validators to participate in consensus
- Governance proposals require staked AXM
- Validator slashing creates compliance incentives at network layer

### Cosmos Governance Module (`x/gov`)
Cosmos SDK ships with a governance module:
- Submit proposals (parameter changes, software upgrades)
- Vote (1 staked AXM = 1 vote)
- Quorum, threshold, veto parameters configurable at genesis

**This maps directly to Axiom's existing AXM governance model.** The Cosmos governance module could replace or supplement the current Arbitrum-based governance once the chain launches.

---

## Validator KYC Consideration

If Axiom requires validators to be KYC'd (as may be appropriate for an institution-serving sovereign network), the standard Cosmos validator model must be extended:

- **Option A:** Permissioned validator set (list validators in genesis, use governance to add/remove)
- **Option B:** Governance-gated validator addition (proposal required to add new validator)
- **Option C:** Open validator set (permissionless staking — standard Cosmos model)

For Axiom's use case (institutional finance), Option A or B is more appropriate than an open validator set.

---

## GDPR and Data Privacy on a Public Chain

Launching a public Cosmos chain means all transactions are publicly visible (like Ethereum mainnet). This creates GDPR tension:

1. On-chain data is immutable — GDPR's right to erasure conflicts with blockchain immutability
2. Personal data should NOT be stored on-chain — only cryptographic commitments
3. Use ZK proofs or hash commitments for sensitive data — never raw KYC data on-chain

**Recommendation:** Study Cosmos chains that handle this (e.g., Secret Network for private state) before designing Axiom chain's privacy model.

# AXIOM SUI — PHASE 7 RISK REGISTER
# Sui Mainnet Community Distribution Layer — Design Phase Risk Assessment

Document type:  Risk Register
Phase:          7 — Mainnet Design + Hardening + Authorization
Date:           2026-05-15
Classification: INTERNAL — operations / security
Status:         COMPLETE — reviewed 2026-05-15

---

## Register Scope

This risk register covers the Sui mainnet community rewards distribution
layer (Option B, as selected in AXIOM_SUI_PHASE7_MAINNET_DECISION_MEMO.md).

It does not cover:
- Bridge risks (Option D — not selected)
- Canonical asset issuance on Sui (forbidden by asset policy)
- Arbitrum, Avalanche, or Polygon risk profiles (separate registers)

Severity scale:
  CRITICAL  Existential threat to user funds or protocol integrity
  HIGH      Significant financial loss, reputation damage, or data breach possible
  MEDIUM    Limited loss or operational disruption possible
  LOW       Minor inconvenience or recoverable issue

---

## Section 1 — Technical Risks

---

### T-01 — Smart Contract Bug in Claim Logic
Severity: HIGH
Category: Technical

Description:
A bug in `claim_campaign.move` or `merkle.move` allows unauthorized claims,
duplicate claims, or prevents legitimate claims. This could drain the campaign
pool, allow non-eligible addresses to claim, or lock out legitimate claimants.

Mitigations:
- 17 unit tests in Sprint 2; >= 28 tests required for hardened Phase 8 contract
- Independent Move security review required before Phase 8 deployment
- AdminCap pause() available to freeze campaign immediately if bug detected
- Campaign pool holds only non-financial community tokens (no monetary value at risk)
- close_campaign() + A2 permanent closure allows clean termination

Residual risk: MEDIUM (code cannot be fully proven correct; bug discovery after launch is possible)
Mitigation adequacy: ADEQUATE for non-financial tokens

---

### T-02 — Merkle Root Manipulation
Severity: HIGH
Category: Technical

Description:
The AdminCap holder calls `update_merkle_root` with a malicious root,
enabling unauthorized addresses to claim or locking out legitimate ones.

Mitigations:
- A2 hardening: update_merkle_root requires campaign to be paused first
- CampaignPaused event emitted before root update (on-chain observable)
- MerkleRootUpdated event emitted with new root (on-chain observable)
- AdminCap held in 2-of-3 multisig — single key cannot manipulate root
- Root update is a deliberate two-step operation (pause + update)
- All root updates are publicly observable on-chain
- Eligibility CSV is published off-chain before root computation

Residual risk: LOW (multisig + observability significantly reduces attack surface)

---

### T-03 — Gas Griefing via Oversized Proof
Severity: MEDIUM
Category: Technical

Description:
An attacker submits claim transactions with proof vectors containing
thousands of elements. Transaction aborts with EInvalidProof but
exhausts object access slots for legitimate concurrent claimants.
On shared objects, all transactions touching the same version must
wait in sequence.

Mitigations:
- A1 hardening: EProofTooLong with MAX_PROOF_DEPTH = 20
- proof.length assertion fires before any loop iteration
- Transaction fails fast (minimal computation before abort)
- Sui's consensus model limits attacker throughput (gas cost per tx)
- Campaign ClaimCampaign object access is sequential — griefing window is limited

Residual risk: LOW after A1 hardening

---

### T-04 — Shared Object Contention
Severity: LOW
Category: Technical

Description:
High claim volume causes transactions to queue on the ClaimCampaign
shared object, increasing latency for legitimate claimants.

Mitigations:
- Sui consensus serializes shared object access efficiently
- Single shared object per campaign is a deliberate tradeoff
- Campaign launch can be staggered across multiple campaigns to spread load
- Phase 8 design may introduce per-campaign parallelism (separate objects per batch)

Residual risk: LOW (not a security issue; operational latency only)

---

### T-05 — Upgrade Abuse (if UpgradeCap retained)
Severity: HIGH
Category: Technical

Description:
If the package is deployed with an UpgradeCap (Option B for upgrade policy),
a compromised UpgradeCap holder can deploy a malicious upgrade that alters
claim logic, drains pools, or backdoors AdminCap checks.

Mitigations:
- A6 hardening recommends Frozen Package (no UpgradeCap) for first mainnet deployment
- If UpgradeCap is retained: store in 2-of-3 multisig separate from AdminCap multisig
- If UpgradeCap is retained: require 48-hour timelock for all upgrades
- Campaign pools hold non-financial tokens — financial loss from upgrade abuse is zero

Residual risk: CRITICAL (if UpgradeCap is retained with weak custody) → MEDIUM (if frozen or multisig + timelock)

---

### T-06 — Keccak256 Collision Attack
Severity: LOW (theoretical)
Category: Technical

Description:
An attacker finds a preimage collision in keccak256 such that a
different (address, amount) pair produces the same leaf hash as a
legitimate entry, enabling unauthorized claims.

Mitigations:
- keccak256 has no known practical collision attacks (2^128 resistance)
- Leaf includes both address and amount — forging both simultaneously is infeasible
- Standard cryptographic assumption; accepted in all major Ethereum/EVM airdrop protocols

Residual risk: NEGLIGIBLE

---

## Section 2 — Operational Risks

---

### O-01 — AdminCap Private Key Compromise
Severity: CRITICAL
Category: Operational / Custody

Description:
The AdminCap private key is compromised. Attacker can call:
- pause() / unpause() — disrupt campaign availability
- update_merkle_root() — alter eligibility (after pausing)
- close_campaign() — drain pool to attacker's address
- destroy_admin_cap() — permanently ungover campaign

Mitigations:
- A3 hardening: AdminCap held in 2-of-3 multisig
- No single key can operate AdminCap alone
- Keys distributed: Engineering Lead, Operations Lead, Emergency (HSM)
- Emergency key stored offline (cold storage)
- All AdminCap operations visible on-chain with latency for detection
- Phase 8: define incident response playbook for key compromise

Residual risk: MEDIUM (multisig significantly reduces but does not eliminate risk)

---

### O-02 — AdminCap Loss (No Recovery)
Severity: HIGH
Category: Operational

Description:
All AdminCap multisig keys are lost (e.g., disaster scenario). Campaign
cannot be paused, closed, or updated. Pool is effectively locked and
claims continue until pool is drained. If campaign is open, it remains
open permanently (no admin can close it).

Mitigations:
- 2-of-3 multisig: loss of one key is recoverable using remaining two
- Emergency key in cold HSM storage provides recovery path
- Campaign has expires_at_epoch: expired campaigns automatically stop accepting claims
  even if AdminCap is lost (time-bounded campaigns require no admin action to close)
- A3: transfer_admin_cap() allows key rotation before any key is lost

Residual risk: LOW (with HSM cold storage and time-bounded campaigns)

---

### O-03 — Proof Toolchain Compromise
Severity: HIGH
Category: Operational / Toolchain

Description:
The off-chain Merkle tree builder or proof generator produces incorrect
proofs, either through bugs or malicious modification. Incorrect root
is committed on-chain. Legitimate claimants cannot claim; or fraudulent
claimants gain access.

Mitigations:
- Merkle tree builder is open-source and independently verifiable
- Root is committed on-chain — observable before campaign activation
- Eligibility CSV is published publicly before root computation
- Off-chain proof generation includes test suite with known inputs/outputs
- Root update requires manual AdminCap operation (human check step)
- Campaign remains paused between root set and activation (verification window)

Residual risk: MEDIUM (toolchain is off-chain — harder to formally verify)

---

### O-04 — Campaign Pool Underfunding
Severity: MEDIUM
Category: Operational

Description:
Campaign pool is funded with fewer tokens than the Merkle tree encodes.
Legitimate later claimants receive EInsufficientPool and cannot claim.

Mitigations:
- fund_campaign emits CampaignFunded event with pool_total
- Operator must verify pool_total >= (eligible_count × amount_per_claim) before activation
- Operator console dashboard shows pool status
- Phase 8: toolchain validation step confirms funding before activation

Residual risk: LOW (operational check; no financial loss for non-financial tokens)

---

### O-05 — Expired Campaign with Unclaimed Tokens
Severity: LOW
Category: Operational

Description:
Campaign expires with tokens remaining in pool. AdminCap holder must call
close_campaign() to recover remaining tokens. If AdminCap is lost, tokens
are permanently locked in the campaign pool.

Mitigations:
- Campaigns should have reasonable expiry (30–90 days typical)
- Operator runbook: check pool balance and close after expiry
- AdminCap multisig enables close at any time post-expiry
- Non-financial tokens have no monetary value — locked tokens cause no financial loss

Residual risk: LOW

---

## Section 3 — Custody Risks

---

### C-01 — GuardedTreasury Object Compromise
Severity: HIGH
Category: Custody

Description:
An attacker gains AdminCap access and calls guarded_mint() to mint
tokens beyond intended amounts (up to MAX_SUPPLY).

Mitigations:
- A5: hard MAX_SUPPLY enforced on-chain — absolute cap regardless of AdminCap
- A4: GuardedTreasury is a shared object — all minting is publicly observable
- TokensMinted event emitted with running total — anomaly detection possible
- AdminCap is 2-of-3 multisig — single key cannot mint alone
- Non-financial tokens: no monetary value at risk

Residual risk: LOW (supply cap + multisig + observability)

---

### C-02 — No BitGo Custody for Sui Assets
Severity: MEDIUM (informational)
Category: Custody

Description:
BitGo CaaS (Axiom's institutional custody provider) does not support
Sui. All Sui assets are held in software wallets or Sui-native multisig.
This is a lower custody standard than Arbitrum canonical assets.

Mitigations:
- Sui assets are non-financial community tokens — institutional custody is not required
- AdminCap is 2-of-3 multisig (Sui-native)
- TreasuryCap wrapped in GuardedTreasury — not a loose wallet object
- This risk is acceptable for non-financial community tokens
- If Sui canonical asset issuance is ever considered (Option D), BitGo custody must be solved first

Residual risk: LOW (acceptable for non-financial tokens; not acceptable for canonical assets)

---

## Section 4 — Governance Risks

---

### G-01 — Community Token Perceived as Financial Instrument
Severity: HIGH
Category: Governance / Legal

Description:
Despite the asset policy, community members or external observers
perceive the Sui community token as having monetary value. This could
create secondary market pressure, regulatory scrutiny, or user harm
if the token is listed on exchanges.

Mitigations:
- Asset policy explicitly states no monetary value (AXIOM_SUI_PHASE7_ASSET_POLICY.md)
- Coin definition in Move includes clear description text
- No redemption function exists in the contract
- No yield or interest accrual
- Campaign communications must not imply monetary value
- Legal counsel review recommended before any mainnet campaign launch

Residual risk: MEDIUM (market perception is outside technical control)

---

### G-02 — Community Token Confers Unintended Governance Rights
Severity: MEDIUM
Category: Governance

Description:
The Sui community token is interpreted (formally or informally) as
conferring governance rights over Axiom Protocol. This creates
governance confusion if combined with AXM (Arbitrum governance token).

Mitigations:
- Community token explicitly has no governance rights in its definition
- AXM on Arbitrum One remains the only governance token
- Campaign communications must state clearly: "This token carries no governance rights"
- No snapshot mechanism should reference Sui community tokens for Axiom governance votes

Residual risk: LOW (clear asset policy + communications)

---

### G-03 — Uncoordinated Multi-Campaign Confusion
Severity: MEDIUM
Category: Governance / Operational

Description:
Multiple claim campaigns running simultaneously with different Merkle
roots confuse claimants about which campaign they are eligible for.
Off-chain tooling errors lead to wrong campaign ID being submitted.

Mitigations:
- Campaign label field provides human-readable identification
- Each campaign has unique ID (object ID on-chain)
- Operator console lists all active campaigns
- Phase 8 UI design must include clear campaign disambiguation
- Maximum 1 active campaign at a time recommended for Phase 8 launch

Residual risk: LOW (operational discipline + UI clarity)

---

## Section 5 — Abuse Risks

---

### A-01 — Sybil Attack on Eligibility List
Severity: MEDIUM
Category: Abuse

Description:
An attacker creates many Sui addresses to game the eligibility
criteria (e.g., if eligibility is based on on-chain activity), and
appears in the Merkle tree multiple times.

Mitigations:
- Eligibility list is determined OFF-CHAIN before root is committed
- Eligibility criteria design is the primary defense (not the contract)
- Contract enforces one claim per address — cannot claim twice from same address
- Eligibility based on cross-chain criteria (Arbitrum history, wallet age) is harder to sybil
- KYC/identity gating is possible but not in scope for Phase 8

Residual risk: MEDIUM (eligibility design is the primary mitigation; contract cannot prevent sybil on eligibility list)

---

### A-02 — Proof Replay Across Campaigns
Severity: LOW
Category: Abuse

Description:
A valid proof from Campaign A is submitted for Campaign B, claiming
tokens from the wrong campaign.

Mitigations:
- Each campaign has its own Merkle root stored in its ClaimCampaign object
- verify_proof uses the campaign's stored root — not a caller-supplied root
- A proof valid for Campaign A's root will not verify against Campaign B's root
- claimed table is per-campaign — no cross-campaign replay possible

Residual risk: NEGLIGIBLE (architectural defense)

---

### A-03 — Front-Running Claim Transactions
Severity: LOW
Category: Abuse

Description:
An attacker observes a pending claim transaction (address + proof)
in the mempool and submits their own transaction using the same proof
before the original transaction confirms. On Sui, shared object
transactions are not censorship-resistant.

Mitigations:
- Claim leaf includes `claimer = tx_context::sender(ctx)` — the on-chain
  address is derived from the transaction signature
- An attacker cannot reuse a proof for a different address (leaf mismatch)
- An attacker cannot sign a transaction as the claimant's address (no key)
- Front-running proof observation is harmless — the proof is only valid for
  the address committed in the Merkle tree

Residual risk: NEGLIGIBLE (proof is address-bound)

---

### A-04 — Spam Campaigns Created by Non-Admins
Severity: LOW
Category: Abuse

Description:
Any address can call create_campaign_entry and create a ClaimCampaign
shared object (AdminCap goes to the caller). This could be used to
spam the Sui state with empty or unfunded campaigns.

Mitigations:
- Campaign creation requires SUI for gas and storage deposits
- An unfunded campaign cannot distribute any tokens
- Spam campaigns have no impact on legitimate Axiom campaigns
- Future hardening: restrict create_campaign_entry to specific
  authorized addresses via a separate registry (Phase 9+)

Residual risk: LOW (no harm to legitimate campaigns; gas cost deters spam)

---

## Section 6 — Toolchain and Infrastructure Risks

---

### I-01 — Off-Chain Toolchain Dependency
Severity: MEDIUM
Category: Infrastructure

Description:
The proof toolchain (Merkle tree builder, proof API) is off-chain
software. If it becomes unavailable, claimants cannot retrieve proofs
and cannot claim. If the toolchain produces wrong proofs, claims fail
silently for users.

Mitigations:
- Proof toolchain design is documented in AXIOM_SUI_PHASE7_PROOF_TOOLCHAIN.md
- Eligibility list + Merkle root are published on-chain (verifiable independently)
- Users can compute their own proof from the published eligibility CSV
- Campaign expires_at_epoch provides a hard deadline for claim window
- Phase 8 requires toolchain implementation + testing before mainnet launch

Residual risk: MEDIUM (off-chain infrastructure has no on-chain redundancy)

---

### I-02 — Sui RPC Downtime
Severity: LOW
Category: Infrastructure

Description:
Sui RPC endpoints become unavailable during an active claim campaign,
preventing claimants from submitting transactions.

Mitigations:
- Multiple public RPC endpoints available (mysten-labs, Alchemy (if supported), community nodes)
- Campaign window is long (30–90 days) — short RPC outages are not critical
- Sui's decentralized validator set provides inherent resilience

Residual risk: LOW

---

### I-03 — @mysten/sui SDK Breaking Change
Severity: LOW
Category: Infrastructure

Description:
A breaking change in the @mysten/sui SDK breaks the proof toolchain
or operator scripts. The smoke test experienced bcs.address() not
being a function (Sprint 2 Issue-1) — a similar issue could recur.

Mitigations:
- Lock @mysten/sui to a specific version in package.json
- Manual BCS encoding helpers in smoke_test.ts are library-version-independent
- SDK update testing is required before any toolchain upgrade
- Move contracts do not depend on the TypeScript SDK

Residual risk: LOW

---

## Risk Summary Table

| ID | Risk | Severity | Mitigation Status |
|---|---|---|---|
| T-01 | Contract bug in claim logic | HIGH | ADEQUATE (tests + review required) |
| T-02 | Merkle root manipulation | HIGH | ADEQUATE (A2 + multisig + observability) |
| T-03 | Gas griefing (oversized proof) | MEDIUM | RESOLVED (A1 hardening) |
| T-04 | Shared object contention | LOW | ACCEPTABLE |
| T-05 | Upgrade abuse | HIGH → MEDIUM | ADEQUATE (frozen package recommended) |
| T-06 | keccak256 collision | LOW | NEGLIGIBLE |
| O-01 | AdminCap key compromise | CRITICAL → MEDIUM | ADEQUATE (A3 multisig) |
| O-02 | AdminCap key loss | HIGH → LOW | ADEQUATE (HSM + time-bounded campaigns) |
| O-03 | Proof toolchain compromise | HIGH | PENDING (toolchain implementation + testing) |
| O-04 | Campaign pool underfunding | MEDIUM | ADEQUATE (pre-activation check) |
| O-05 | Unclaimed tokens post-expiry | LOW | ACCEPTABLE |
| C-01 | GuardedTreasury compromise | HIGH → LOW | ADEQUATE (A4+A5 + multisig) |
| C-02 | No BitGo custody for Sui | MEDIUM | ACCEPTABLE (non-financial tokens) |
| G-01 | Community token perceived as financial | HIGH | PENDING (legal review + communications) |
| G-02 | Unintended governance rights | MEDIUM | ADEQUATE (asset policy + communications) |
| G-03 | Multi-campaign confusion | MEDIUM | ADEQUATE (campaign labels + UX) |
| A-01 | Sybil attack on eligibility | MEDIUM | ACCEPTABLE (eligibility design primary defense) |
| A-02 | Proof replay across campaigns | LOW | RESOLVED (architectural) |
| A-03 | Front-running | LOW | NEGLIGIBLE (address-bound proofs) |
| A-04 | Spam campaign creation | LOW | ACCEPTABLE |
| I-01 | Off-chain toolchain dependency | MEDIUM | PENDING (toolchain implementation) |
| I-02 | Sui RPC downtime | LOW | ACCEPTABLE |
| I-03 | SDK breaking change | LOW | ADEQUATE (version pinning) |

---

## Risks Requiring Action Before Phase 8

The following risks are marked PENDING and must be resolved before
Phase 8 (Sui Mainnet Preparation) can begin:

1. O-03 (Proof toolchain compromise) — Toolchain implementation and testing required
2. G-01 (Community token perceived as financial) — Legal counsel review recommended
3. I-01 (Off-chain toolchain dependency) — Toolchain design implementation required

All other risks are either RESOLVED, ADEQUATE, ACCEPTABLE, or NEGLIGIBLE.

---

## Register Maintenance

This register is a living document. It must be reviewed and updated:
- Before each new phase authorization
- After any security incident
- When the deployment architecture changes materially

Register owner:     Clarence Fuqua (Axiom Protocol — Founder / Operator)
Last reviewed:      2026-05-15
Next scheduled review: Before Phase 8 authorization

---

*End of Phase 7 Risk Register*

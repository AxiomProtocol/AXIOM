# AXIOM CHAIN ALLOCATION BLUEPRINT
**Phase 2 — Canonical Responsibility Model**  
Generated: 2026-05-11  
Status: Authoritative strategic architecture document  

---

## 1. Non-Negotiable Design Principle

> There must be one canonical source of truth for:
> - Identity
> - Reserve accounting
> - Issuance state
> - Policy decisions
> - Solvency / disclosure state

**That canonical chain is Arbitrum One — today, and for the foreseeable future.**

No expansion chain is a replacement for Arbitrum. Every chain listed below is
an additive rail that extends Axiom's capability surface. Arbitrum remains the
execution core. AXUSD remains the internal settlement layer. AXAU remains the
reserve layer anchored to PAXG on Ethereum.

---

## 2. Canonical Chain Responsibility Model

### 2.1 Arbitrum One — Core Execution Layer (LIVE TODAY)

**Role:** Canonical execution, settlement, identity, compliance, reserve  
**Chain ID:** 42161  
**Status:** Live and active  

**Owns canonically:**
- ERC-3643 ONCHAINID identity — `AxiomIdentityComplianceHub`
- AXUSD stablecoin issuance and settlement
- AXAU reserve token (backed by PAXG on Ethereum)
- All 53 live Axiom smart contracts
- DEX / Euler vault integration
- DePIN node economy
- Land acquisition registry
- Governance (TimelockController, governance hub)
- SIWE authentication
- All live automated control layers

**Will continue to own after expansion:**
- Identity canonical record (Arbitrum is the source; other chains may mirror/attest but never own)
- Solvency and reserve disclosure state
- Policy decision execution
- AXUSD canonical supply
- AXAU canonical supply

---

### 2.2 Avalanche — Control / Issuance / Policy / Reserve Core (FUTURE)

**Role:** Compliance-aware capital issuance, policy engine, reserve logic  
**Chain ID:** 43114 (C-Chain) or custom Subnet  
**Status:** Researching — not live, not configured  

**Intended future ownership:**

| Responsibility | Design Notes |
|---------------|-------------|
| Capital issuance policy | Permissioned Subnet or C-Chain precompile for KYC-gated issuance |
| Reserve deployment logic | Capital deployment into permissioned zones with on-chain policy enforcement |
| Compliance-aware product environments | Subnet-style environments for institutional product access |
| Policy engine (future) | When Avalanche Subnet governance is designed, policy decisions for specific capital zones can execute here |

**What Avalanche does NOT own:**
- AXUSD canonical supply (Arbitrum owns this)
- AXAU canonical reserve (Arbitrum owns this — until explicit migration)
- Identity canonical record
- Solvency / disclosure state
- Governance for the core Axiom protocol

**Justification from repo reality:**
The existing `AvalancheCapitalAdapterInterface.ts` and `IntegrationReadinessModel.ts`
already classify Avalanche as a permissioned capital deployment zone. The updated
strategic direction elevates this to include reserve logic core and policy engine.
This is consistent with Avalanche's Subnet architecture, which provides the
permissioned environment required for Axiom's compliance-first product design.

**Prerequisite before any Avalanche work begins:**
1. Architecture decision: C-Chain vs custom Subnet
2. `@avalabs/avalanchejs` SDK review
3. Subnet-EVM source review (if Subnet path chosen)
4. `CHAIN_AVALANCHE_ENABLED` feature flag explicitly set to `true`

---

### 2.3 Polygon — Payments / Treasury Routing / Enterprise Settlement (FUTURE)

**Role:** Payment distribution, treasury routing, enterprise settlement  
**Chain ID:** 137  
**Status:** Researching — not live, not configured  

**Intended future ownership:**

| Responsibility | Design Notes |
|---------------|-------------|
| Payment distribution | High-throughput low-cost payment settlement for community and enterprise flows |
| Treasury routing | USDC/stablecoin routing for enterprise treasury operations |
| Enterprise settlement layer | B2B settlement for institutional partners using Polygon's mature EVM + Polygon ID infrastructure |
| KYC/AML credential delivery | Polygon ID for enterprise KYC credential issuance (identity attestation, not canonical identity) |

**What Polygon does NOT own:**
- Canonical identity (Arbitrum ERC-3643 ONCHAINID remains canonical)
- AXUSD canonical supply
- AXAU canonical reserve
- Core governance
- Solvency disclosure state

**Justification from repo reality:**
The existing registry classifies Polygon as `identity_bridge`. The updated
strategic direction expands this to include payments and treasury settlement,
which aligns with Polygon's production-grade EVM infrastructure, native USDC
support, and Polygon ID credential tooling. The existing
`PolygonIdentityAdapterInterface.ts` remains valid — the payments/settlement role
is additive to the identity bridge role.

**Prerequisite before any Polygon work begins:**
1. Architecture decision: Polygon ID vs ONCHAINID mirror/attestation design
2. `@polygon-id/js-sdk` review
3. Enterprise settlement design (USDC routing vs AXUSD bridge)
4. `CHAIN_POLYGON_ENABLED` feature flag explicitly set to `true`

---

### 2.4 Sui — Wallet-Facing Distribution / Community / Diaspora Access (FUTURE)

**Role:** Consumer wallet distribution, community access, diaspora financial access  
**Chain ID:** N/A (Sui is non-EVM — uses object model with 32-byte addresses)  
**Status:** Not yet in registry — research stage  

**Intended future ownership:**

| Responsibility | Design Notes |
|---------------|-------------|
| Community token distribution | High-throughput, low-cost token distribution for community/diaspora flows |
| Wallet-facing access layer | Consumer-grade wallet UX for users in diaspora corridors |
| Community participation tools | Susu-style community credit, diaspora remittance access |
| Off-chain identity bridge | Sui wallet address attestation to Arbitrum identity records (read-only) |

**What Sui does NOT own:**
- Canonical identity (Arbitrum ERC-3643 ONCHAINID)
- Any reserve accounting
- Policy decisions
- AXUSD canonical supply
- AXAU canonical reserve
- Governance

**Technical notes:**
Sui is non-EVM. The existing `lib/multichain/` adapter framework uses EVM
assumptions (`chainIdEvm`, ethers.js patterns) and will require a separate,
non-EVM adapter interface for Sui. The `SovereignChainAdapterInterface.ts` and
Cosmos adapter serve as architectural examples but Sui requires its own typed
interface and `@mysten/sui.js` SDK integration.

**Prerequisite before any Sui work begins:**
1. `@mysten/sui.js` SDK review
2. Sui adapter interface design (non-EVM — separate from EVM adapter pattern)
3. Object model mapping for Axiom asset representations
4. `CHAIN_SUI_ENABLED` feature flag explicitly set to `true`
5. Diaspora corridor definition (which countries, which remittance corridors)

---

### 2.5 Ethereum Mainnet — Reserve Reference Layer (CONFIGURED)

**Role:** PAXG custody reference, L1 finality anchor  
**Chain ID:** 1  
**Status:** Configured — no Axiom contracts deployed here  

**Owns:**
- PAXG ERC-20 reserve asset (external — not deployed by Axiom)
- Reserve price reference for AXAU

**Will NOT expand beyond:**
- This layer is not a deployment target for Axiom operational contracts

---

## 3. What Is Chain-Agnostic

The following must remain chain-agnostic and must never be hardcoded to a
single chain:

| System | Why Chain-Agnostic |
|--------|-------------------|
| Chain capability registry (`lib/chains/capabilities.ts`) | Must represent all chains accurately |
| Explorer URL mapping (`lib/chains/explorers.ts`) | Must route to correct explorer per chain |
| Contract address registry structure (`lib/chains/contracts.ts`) | Must accommodate multi-chain contract maps |
| Provider factory (`lib/chains/providers.ts`) | Must construct RPC providers for any supported chain |
| Feature flag evaluation (`lib/chains/capabilities.ts`) | Must gate all chains behind explicit flags |
| Corridor routing service (`lib/multichain/CorridorRoutingService.ts`) | Already chain-agnostic — preserve as-is |

---

## 4. Canonical Source-of-Truth Rules

These rules are **non-negotiable** and must be enforced in all future
implementation work:

### Rule 1: Identity is canonical on Arbitrum
ERC-3643 ONCHAINID identity records issued on Arbitrum are the ground truth.
Any credential mirroring or attestation on Polygon is a read-only derivative.
Revocation must propagate from Arbitrum outward.

### Rule 2: Reserve accounting is canonical on Arbitrum (until explicit migration)
All AXAU reserve position accounting runs on Arbitrum. Avalanche reserve logic
extensions must report back to the canonical Arbitrum reserve accounting service.
No reserve state is authoritative unless it has been committed to the Arbitrum
canonical snapshot.

### Rule 3: AXUSD issuance is canonical on Arbitrum
AXUSD supply is controlled by the ERC-3643 GENIUS-compliant contracts on
Arbitrum. Any cross-chain AXUSD representation is a wrapped or bridged
derivative with a canonical burn/mint relationship to the Arbitrum supply.

### Rule 4: Policy decisions are canonical on Arbitrum (with Avalanche as future co-signer)
Current policy execution (PSM, compliance, compliance modules) is Arbitrum-only.
Avalanche may eventually co-sign specific policy decisions for capital zone
environments, but Arbitrum remains the primary policy execution layer.

### Rule 5: Solvency / disclosure state is canonical on Arbitrum
The `lib/solvency/` and `lib/reserves/` systems are Arbitrum-facing. Any
expansion chain that holds Axiom assets must report positions to the canonical
solvency disclosure system running on Arbitrum.

---

## 5. What Must NOT Be Duplicated Across Chains

| System | Reason |
|--------|--------|
| Reserve accounting | Duplication would create double-counting risk and solvency disclosure errors |
| AXUSD canonical supply | Must be single-mint-controlled; bridges are wrappers, not new issuance |
| AXAU canonical reserve | PAXG positions are singular and must not be counted twice |
| ERC-3643 identity records | Identity canonical state cannot fork — revocations must be universal |
| Governance voting weight | AXM staking and voting weight must be single-source |
| SIWE authentication state | Authentication must resolve to a single canonical identity check |
| Solvency snapshot | One canonical disclosure snapshot; expansion chains contribute positions to it |

---

## 6. What Can Be Mirrored or Distributed

| System | Distribution Notes |
|--------|-------------------|
| Identity credentials (attestations) | Credentials issued on Arbitrum can be attested/mirrored to Polygon ID for enterprise access — read-only derivative |
| Asset price feeds | Oracle price data can be mirrored across chains |
| Transparency disclosures | Reserve snapshots and solvency reports can be published to multiple chains (read-only) |
| Community tokens | AXM distribution events can occur on Sui (separate from canonical Arbitrum supply) |
| Payment settlement receipts | Payment confirmations can be settled on Polygon or Stellar without affecting Arbitrum canonical state |

---

## 7. What Should Remain Centralized in Axiom Off-Chain Control Plane

| System | Notes |
|--------|-------|
| Alchemy API keys | Single key per network — centralized in Vercel environment |
| Deployer private key | Single deployer EOA per network — managed by Axiom ops |
| KYC/AML adjudication | Compliance decisions are made off-chain by Axiom compliance team and submitted to on-chain contracts |
| Reserve position reporting | BitGo and custodian positions are reported off-chain and submitted to the canonical reserve snapshot |
| Bridge operator keys | Any cross-chain bridge operation requires Axiom ops to sign — not automated by default |
| Corridor configuration | Payment corridor definitions are centralized in `lib/multichain/CorridorRoutingService.ts` and DB |

---

## 8. Canonical Chain Recommendation: Arbitrum One

**Recommendation: Arbitrum One must remain the canonical chain for all ground-truth
state for the foreseeable future.**

**Justification:**
1. **53 live smart contracts already deployed on Arbitrum** — migrating canonical state requires contract migration, not just config changes
2. **ERC-3643 ONCHAINID identity is Arbitrum-native** — identity canonical state cannot be moved without re-onboarding all users
3. **AXUSD and AXAU are Arbitrum-deployed ERC-3643 tokens** — supply control and reserve accounting are on-chain
4. **All existing automated control layers are Arbitrum** — fee plumbing, governance, DEX are live
5. **Avalanche, Polygon, and Sui are all in `researching` status** — none have source files, SDKs, or live integrations
6. **Risk of canonical state migration is extremely high** — moving canonical state mid-operation creates exposure
7. **Avalanche's intended role as reserve/policy core is complementary** — it can execute policy in permissioned capital zones while Arbitrum remains the canonical settlement layer

**When Avalanche might become co-canonical:**
When Avalanche Subnet integration is live, audited, and proven in a permissioned
capital zone environment, specific reserve-zone accounting may be designated as
Avalanche-canonical for those specific zones. This requires an explicit
architecture decision, implementation, audit, and ops sign-off.

---

*Blueprint authored by Axiom Protocol architecture agent, Phase 2 of multi-chain expansion.*

# AXIOM AVALANCHE ARCHITECTURE DECISION MEMO
**Classification:** Internal Architecture — Pre-Implementation  
**Status:** Decision Required Before Any Avalanche Implementation Begins  
**Canonical Chain:** Arbitrum One (unchanged)  
**Authored:** 2026-05-11  
**Document Owner:** Axiom Protocol Architecture  

---

## 1. Executive Decision Framing

### 1.1 The Exact Decision

Before any Avalanche engineering work begins, Axiom must decide whether to deploy
its Avalanche-role product logic on:

- **Option A — Avalanche C-Chain** (chainId 43114): Avalanche's public EVM-compatible
  execution layer, sharing validators with the entire Avalanche network.

- **Option B — Custom Avalanche Subnet / Avalanche L1**: A sovereign, application-specific
  chain with its own validator set, execution rules, custom fee tokens, and
  on-chain access-control primitives enforced at the consensus layer.

This is not a choice between "basic" and "advanced." It is a choice between
two fundamentally different trust and control models — one that resembles
deploying to any EVM chain, and one that effectively makes Axiom a network
operator. Both have legitimate roles. The wrong choice for today's maturity
level creates either under-built infrastructure (C-Chain chosen when sovereign
control is actually required) or over-built infrastructure (Subnet chosen before
the business case justifies the operational burden).

### 1.2 Why This Must Be Decided Now

1. **Implementation path bifurcates immediately.** C-Chain work reuses all
   existing ethers/wagmi/Hardhat tooling with minor chain-ID changes. Subnet work
   requires `@avalabs/avalanchejs` Subnet-EVM tooling, validator provisioning,
   genesis block design, and a separate deployment pipeline. Starting C-Chain work
   and then switching to a Subnet mid-stream wastes significant engineering effort
   and may require contract redeployment.

2. **Contract architecture differs.** On C-Chain, Axiom's permissioning relies
   entirely on application-level smart contract logic (ERC-3643 transfer hooks,
   on-chain ACLs). On a Subnet, some permissioning can be enforced at the
   consensus/precompile level before a transaction even reaches Solidity code.
   These are different security models.

3. **SDK and dependency choices depend on this.** The `lib/chains/config.ts`
   entry for Avalanche currently reflects C-Chain defaults (`chainId: 43114`,
   `publicRpcFallback: 'https://api.avax.network/ext/bc/C/rpc'`). Subnet work
   requires different RPC endpoints, different chain IDs, and additional SDK
   packages. Locking in the wrong SDK wastes time.

4. **Operational infrastructure is different.** C-Chain has no validator ops
   overhead. Subnet requires Axiom to recruit, configure, and maintain a validator
   set or contract with an operator network — a significant ongoing operational
   commitment.

5. **Compliance positioning differs.** A Subnet can enforce KYC-gating at the
   validator/consensus layer, providing a hard guarantee that no non-KYC'd address
   can submit a valid transaction. C-Chain enforces this only at the smart contract
   layer. Whether the stronger guarantee is required by Axiom's regulatory posture
   is a compliance decision that must precede implementation.

---

## 2. Current Axiom Requirements

The following requirements are inferred from the live codebase and existing
architecture documentation in `documents/chains/`.

### 2.1 Policy Control

Axiom operates ERC-3643 ONCHAINID identity contracts on Arbitrum that gate
every AXUSD and AXAU transfer. Transfer hooks check identity claim validity
before any token movement is permitted. This is **application-layer policy
enforcement** — the compliance system lives in Solidity, not at the
consensus layer.

For Avalanche, the planned role is "compliance-aware capital issuance" and
"reserve deployment into permissioned zones." Whether this requires consensus-layer
enforcement (Subnet precompile) or application-layer enforcement (smart contracts
on C-Chain) depends on whether Axiom's regulatory obligations require a hard
infrastructure guarantee or whether a contract-level guarantee is sufficient.

**Current assessment:** The existing ERC-3643 model on Arbitrum demonstrates
that contract-level policy enforcement is operationally viable. The C-Chain path
is consistent with this pattern.

### 2.2 Issuance Control

AXUSD and AXAU canonical issuance remain on Arbitrum. Any Avalanche-side
issuance would be derivative — either a bridged representation or a
Avalanche-native token whose canonical supply is ultimately reconciled to
Arbitrum via a canonical burn/mint bridge.

Issuance control on Avalanche does not require a Subnet. A C-Chain deployment
of permissioned ERC-3643 contracts (or a simpler permissioned ERC-20) with
Axiom as the controller is sufficient for derivative issuance in capital zones.

### 2.3 Reserve Logic Sensitivity

Reserve accounting is canonical on Arbitrum (`lib/reserves/`,
`lib/services/ReserveAccountingService.ts`). Avalanche reserve logic is intended
to manage capital deployment within permissioned zones, reporting positions back
to the Arbitrum canonical snapshot.

This is a **reporting and position-management** responsibility, not a custody
custody responsibility. The reserve assets (PAXG on Ethereum, USDC, etc.) are
held by third-party custodians. Avalanche tracks deployed capital, not held
reserves. This does not require a Subnet — C-Chain smart contracts can track
deployed capital positions and report them via an off-chain bridge to Arbitrum
canonical accounting.

### 2.4 Compliance-Aware Deployment

Axiom's compliance model requires that addresses interacting with regulated
capital products have verified identity credentials. On Arbitrum, this is
enforced by ERC-3643 transfer hook logic (`lib/compliance.ts`,
`lib/services/ERC3643Service.ts`).

A Subnet can additionally enforce access-control at the consensus layer via the
`AllowList` precompile, meaning non-allowlisted addresses are physically unable
to submit transactions. This is a stronger guarantee but requires Axiom to
maintain the allowlist at the network layer (an operational function).

**Current assessment:** Axiom's ERC-3643 model has operated without
consensus-layer enforcement on Arbitrum. C-Chain provides the same contract-layer
guarantee. Subnet enforcement becomes compelling when Axiom has institutional
partners requiring a hard infrastructure-level compliance guarantee as a
procurement condition.

### 2.5 Identity / Permissioning Needs

ERC-3643 identity is canonical on Arbitrum. Any Avalanche identity integration
must:
1. Read credentials from the Arbitrum canonical record (or an attested mirror)
2. Not create a parallel identity authority
3. Not allow identity state to diverge between chains

Both C-Chain and Subnet can satisfy these requirements. Neither Avalanche
deployment option changes the Arbitrum identity canonical model.

### 2.6 Operational Complexity Tolerance

The current Axiom engineering team is operating a full-stack DeFi protocol with
banking rails, property acquisition, DEX integration, governance, and a DePIN
node economy — all on Arbitrum. The team has zero current Avalanche operational
experience.

**Adding a Subnet adds a new infrastructure discipline** (Avalanche validator
operations) on top of the existing engineering burden. This is not trivial.
A Subnet requires:
- Validator node configuration and monitoring
- Genesis block design and maintenance
- Network upgrade management
- Economic model for validators (fee token or direct subsidy)

This overhead is manageable for a mature, well-resourced team. It is a risk
factor for a team that has not yet deployed any Avalanche contracts.

### 2.7 Validator / Trust Assumptions

On C-Chain, Axiom trusts the Avalanche primary network validators (a decentralized
set with no Axiom involvement). This is the same trust model as Arbitrum — Axiom
deploys contracts and trusts the underlying network.

On a Subnet, Axiom controls (or contracts with) validators directly. This
provides stronger sovereignty guarantees but introduces a new trust party:
the validators Axiom recruits. If Axiom runs its own validators, the trust
model collapses to Axiom's own operational security. If Axiom uses an operator
network (e.g., Ava Labs validator services), a new third-party trust dependency
is introduced.

### 2.8 Integration with Current Arbitrum-Canonical Model

Arbitrum One remains canonical for identity, reserve accounting, AXUSD/AXAU
issuance state, policy decisions, and solvency/disclosure. Any Avalanche
deployment:

- Must preserve Arbitrum as the source of canonical state
- Must not duplicate reserve accounting (creates double-counting risk)
- Must route policy decisions through Arbitrum canonical record
- Must not create a parallel AXUSD canonical supply
- Must integrate with the existing `lib/chains/` scaffold and feature flag
  system (`CHAIN_AVALANCHE_ENABLED`, `MULTICHAIN_ENABLED`)

Both C-Chain and Subnet can satisfy these constraints. The integration
complexity does not depend significantly on which Avalanche deployment model
is chosen — the canonical bridge design between Arbitrum and Avalanche must
be built either way.

---

## 3. Option A — Avalanche C-Chain

### 3.1 Architectural Fit

C-Chain is an EVM-compatible execution layer running as a subnet of the Avalanche
primary network. It processes transactions with Avalanche consensus (Snowman++),
provides sub-second block confirmation, and exposes a standard EVM API.

For Axiom's planned use case — reserve logic, permissioned capital zone
issuance, policy enforcement via smart contracts — C-Chain is architecturally
sufficient. The ERC-3643 framework used on Arbitrum can be deployed verbatim or
with minor modifications. The same transfer hooks, compliance modules, and
identity claims architecture applies.

### 3.2 Speed to Implementation

C-Chain implementation proceeds with:
1. Deploying existing Hardhat scripts to C-Chain (chain ID change in config)
2. Adding `AVALANCHE_RPC_URL` to staging env
3. Setting `CHAIN_AVALANCHE_ENABLED=true` in staging
4. Deploying ERC-3643 identity contracts or a simpler permissioned token set
5. Building the canonical bridge back to Arbitrum reserve accounting

**Estimated additional tooling:** Zero new SDKs for contract deployment.
Hardhat configuration change only. `ethers.js` and `wagmi` work without
modification against C-Chain.

### 3.3 Compatibility with Existing EVM Tooling

C-Chain is fully EVM-compatible. All of the following work without change:
- `ethers.JsonRpcProvider` — connect to Avalanche RPC, same API
- `wagmi` — add `avalanche` chain from `viem/chains`, standard config
- Hardhat — add C-Chain network in `hardhat.config.ts`
- ERC-3643 / ONCHAINID contracts — deploy as-is
- OpenZeppelin contracts — deploy as-is
- Existing `lib/chains/providers.ts` — `AVALANCHE_RPC_URL` already supported
- Existing `lib/chains/config.ts` — C-Chain already registered with correct metadata

### 3.4 Compatibility with ethers / wagmi / Current Repo Patterns

The `lib/chains/config.ts` already registers C-Chain correctly:
```ts
avalanche: {
  chainId: 43114,
  chainIdHex: '0xa86a',
  publicRpcFallback: 'https://api.avax.network/ext/bc/C/rpc',
  rpcUrlEnvVar: 'AVALANCHE_RPC_URL',
  featureFlagEnvVar: 'CHAIN_AVALANCHE_ENABLED',
}
```

`lib/chains/providers.ts` already has the RPC factory pattern. C-Chain
plugs directly into the existing abstraction layer with no new code.

### 3.5 Operational Simplicity

C-Chain requires:
- RPC endpoint (public or Alchemy/dRPC Avalanche node)
- Deployer EOA for Avalanche (separate from Arbitrum deployer)
- No validator management
- No network upgrade management
- No genesis block design
- No validator recruitment

This is materially the same operational profile as the current Arbitrum deployment.

### 3.6 Limitations for Sovereign Control and Validator Policy

| Limitation | Impact |
|-----------|--------|
| No consensus-layer access control | Cannot enforce "only KYC'd addresses can submit transactions" at the network layer |
| Shared validators | Cannot select or influence who validates Avalanche transactions |
| No custom fee token | Gas is always AVAX; no option to use AXUSD or AXM as a gas abstraction |
| No custom precompiles | Cannot add Axiom-specific blockchain-level logic (e.g., native compliance enforcement) |
| No hard network-level isolation | Co-tenants on C-Chain include all other Avalanche dApps; no physical isolation of Axiom transactions |

For Axiom's **current maturity level and use case**, these limitations do not
block the intended Avalanche role (reserve logic, permissioned capital zones via
smart contracts). They become limiting only if:
- A major institutional partner requires a hard infrastructure compliance guarantee
- Axiom's regulatory environment requires network-layer isolation
- Axiom needs custom gas tokenomics or fee structures
- Avalanche C-Chain becomes too congested for Axiom's throughput requirements

---

## 4. Option B — Custom Avalanche Subnet / Avalanche L1

### 4.1 Architectural Fit

An Avalanche Subnet is a sovereign virtual machine network with its own validator
set, consensus parameters, and execution rules. With the Subnet-EVM (a
configurable EVM fork), Axiom could deploy EVM-compatible contracts on a chain
it fully controls.

The "Avalanche L1" branding (introduced post-Etna upgrade) refers to Subnets
with enhanced sovereignty, where the validator set can be fully permissioned and
controlled by the Subnet owner without primary network staking requirements.

For Axiom's use case, a Subnet would provide:
- Hard enforcement of address allowlists at the consensus layer (no non-KYC'd
  transaction can ever enter the mempool)
- Sovereign validator control (Axiom or trusted partners validate all blocks)
- Custom fee token (AXUSD or AXM as gas abstraction)
- Custom genesis block (pre-allocated addresses, pre-deployed contracts, fixed
  initial state)
- No co-tenants — Axiom's chain is isolated from all other Avalanche dApps

### 4.2 Sovereign Control Benefits

| Benefit | Mechanism |
|---------|-----------|
| Validator-level address allowlist | `TxAllowList` precompile — blocks non-allowlisted sender addresses at consensus layer |
| Deployer allowlist | `ContractDeployerAllowList` precompile — only Axiom-approved deployers can deploy contracts |
| Native minting | `NativeMinter` precompile — controlled native token issuance |
| Fee configuration | `FeeManager` precompile — dynamic fee adjustments without hard fork |
| Custom gas token | Set AXUSD or AXM as the gas fee token in genesis |
| Validator sovereignty | `CHAIN_VALIDATORS` in genesis — Axiom selects every validator |

### 4.3 Validator / Permissioning Advantages

- Every transaction can be required to originate from a KYC-verified address
  before it touches any smart contract
- The validator set can be limited to Axiom-operated nodes or institutional
  partners (e.g., a custodian bank running a validator as a condition of custody
  agreement)
- No risk of censorship or front-running by third-party validators
- Regulatory-grade isolation: Axiom's chain is definitionally separate from
  public Avalanche activity

### 4.4 Compliance and Policy Control Benefits

For institutional product environments where a compliance team or regulator
must be able to demonstrate that only verified participants can transact,
a Subnet provides the infrastructure-layer proof. C-Chain provides contract-layer
proof. The practical difference:

- **C-Chain:** "Our smart contracts will reject non-compliant transfers."
- **Subnet:** "Our network physically cannot process non-compliant transactions."

The second statement is categorically stronger and may be required for certain
regulatory filings (e.g., BitLicense, MSB, or bank partnership onboarding).

### 4.5 Implementation Complexity

Compared to C-Chain, a Subnet requires:

| Task | Effort Level |
|------|-------------|
| Subnet-EVM configuration and genesis design | High — requires deep Avalanche network knowledge |
| Validator provisioning and onboarding | High — operational, not just engineering |
| `@avalabs/avalanchejs` SDK integration | Medium — additional SDK dependency |
| Precompile selection and access-list management | Medium — custom JSON configuration |
| Network upgrade management | Ongoing — Axiom owns upgrade schedule |
| RPC node infrastructure | High — Axiom must run or contract dedicated RPC nodes |
| Hardhat config for Subnet | Low — same pattern as C-Chain, different RPC/chain ID |
| Cross-chain bridge to Arbitrum | Same as C-Chain — required either way |

None of these tasks are insurmountable. Together they represent a meaningful
infrastructure engineering initiative that should not be started before the
core C-Chain contract work is proven.

### 4.6 Operational Overhead

A Subnet introduces permanent operational responsibilities:
1. **Validator monitoring** — liveness SLA, slashing management (if applicable)
2. **Network upgrade governance** — who decides when to upgrade Subnet-EVM?
3. **Allowlist maintenance** — adding/removing addresses from the `TxAllowList`
   is an on-chain governance operation
4. **RPC node availability** — Axiom must ensure reliable public and private RPC
5. **Validator economics** — validators must be compensated (AVAX staking or
   direct subsidy); this is an ongoing cost line

### 4.7 Tooling and Deployment Implications

- Existing Hardhat configs must be extended with a Subnet network configuration
- A new deployer EOA is required for the Subnet (same as C-Chain)
- `@avalabs/avalanchejs` SDK may be needed for Subnet management operations
  (not contract deployment — that remains standard Hardhat/ethers)
- A Subnet-specific RPC URL is required (different from C-Chain RPC)
- Alchemy does not natively support custom Subnets — dedicated node services
  (e.g., Infra, dRPC, Chainstack) or self-hosted nodes are required
- `lib/chains/config.ts` requires a new Subnet entry or modification of the
  existing `avalanche` entry to point to Subnet rather than C-Chain

### 4.8 Risks Relative to Current Axiom Maturity

| Risk | Severity | Notes |
|------|----------|-------|
| Engineering bandwidth overextension | High | Adding Subnet ops to an already-full engineering calendar |
| Validator recruitment failure | Medium | If Axiom cannot recruit quality validators, network security is compromised |
| Delayed time-to-market | High | Subnet work can take 3–6 months before any contract is live |
| Premature complexity | High | Subnet control features are only valuable when the business use case exists |
| No fallback to C-Chain mid-stream | Medium | Subnet contracts cannot be migrated to C-Chain without full redeployment |

---

## 5. Comparison Table

| Dimension | Option A: C-Chain | Option B: Subnet / Avalanche L1 |
|-----------|-------------------|----------------------------------|
| **Development speed** | Fast — days to first contract deployment on Fuji testnet | Slow — weeks/months before Subnet genesis is stable |
| **Operational complexity** | Low — same as current Arbitrum model | High — validator ops, allowlist management, network upgrades |
| **Compliance / policy control** | Contract-layer only (ERC-3643 transfer hooks) | Contract-layer + consensus-layer (`TxAllowList` precompile) |
| **Validator control** | None — Avalanche primary network validators | Full — Axiom selects and manages validators |
| **Deployment burden** | Minimal — chain ID + RPC URL change in Hardhat | Significant — genesis design, Subnet-EVM config, node infrastructure |
| **Current repo fit** | Excellent — `lib/chains/config.ts` already registered; providers.ts ready | Moderate — requires new Subnet chain entry and additional SDK |
| **ethers/wagmi compatibility** | Unchanged — standard EVM provider | Unchanged — Subnet-EVM is EVM-compatible |
| **Migration complexity** | Low → Subnet migration is additive (new chain, not chain replacement) | N/A (Subnet is the starting point) |
| **Suitability: near-term** | High — appropriate for current maturity and use case | Low — complexity exceeds current business justification |
| **Suitability: long-term** | Medium — may require Subnet migration if regulatory or institutional requirements escalate | High — provides sovereign control model needed for large institutional partners |
| **RPC infrastructure** | Public node or shared Alchemy Avalanche plan | Dedicated node required (Alchemy does not support custom Subnets) |
| **Custom gas token** | Not possible | Possible — AXUSD or AXM as fee token |
| **New SDK dependencies** | None for contracts; optional `avalanchejs` for P-Chain queries | `@avalabs/avalanchejs` required for Subnet management |
| **Audit scope** | Same as Arbitrum deployment | Additional: Subnet configuration, precompile access lists, genesis block |
| **Time to first Fuji testnet contract** | < 1 week | 4–8 weeks (conservative) |
| **Validator recruitment required** | No | Yes — Axiom must contract or operate validators |

---

## 6. Recommendation

**Recommended path: Staged — C-Chain now, Subnet when business case is proven.**

### 6.1 Rationale

Axiom's Avalanche role is currently defined as: reserve logic, compliance-aware
capital issuance, and permissioned capital zone environments. All three of these
responsibilities can be satisfied by well-designed smart contracts on C-Chain
using the same ERC-3643 compliance model already proven on Arbitrum.

The Subnet's sovereign validator control and consensus-layer access enforcement
are not yet required by:
- Current product features (no live Avalanche product exists)
- Current regulatory requirements (no known regulator has required Subnet-level isolation)
- Current institutional partner requirements (no known partner has specified Subnet as a condition)
- Current engineering capacity (Subnet ops would compete with Arbitrum product roadmap)

C-Chain implementation can begin immediately with near-zero new tooling, allows
the team to prove the Avalanche integration model (contracts, canonical bridge
to Arbitrum, reserve reporting), and establishes the foundation from which a
Subnet migration can be made if and when the business case emerges.

The correct trigger for evaluating a Subnet migration:
1. A specific institutional partner or regulatory engagement requires
   consensus-layer address enforcement as a condition of the relationship
2. Avalanche C-Chain throughput or co-tenancy creates a measurable product problem
3. A custom gas token or fee model becomes a product requirement (e.g.,
   gas-less transactions for Axiom users subsidized in AXUSD)
4. Axiom's AUM/TVL on Avalanche reaches a level that justifies the ongoing
   validator operational cost

**The staged recommendation is not theoretical — it is the path that maximizes
engineering velocity while preserving the option to migrate to sovereign control
if the business case materializes.**

---

## 7. Required Follow-On Work Per Option

### 7.1 If C-Chain is Chosen (Recommended Path)

In sequence:

1. **SDK and RPC verification** (1–2 days)
   - Verify `ethers.JsonRpcProvider` against Fuji testnet RPC
   - Verify Hardhat config with C-Chain network entry
   - Confirm Alchemy Avalanche plan availability and API key scope

2. **Contract architecture design** (3–5 days)
   - Decide: ERC-3643 full stack on Avalanche, or simpler permissioned ERC-20?
   - Design canonical bridge model: how does Avalanche capital zone report back to Arbitrum reserve accounting?
   - Define initial contract surface: at minimum — capital zone token, allowlist manager, reserve reporter

3. **Staging deployment on Fuji testnet** (3–5 days)
   - Deploy chosen contracts to Fuji
   - Verify `CHAIN_AVALANCHE_ENABLED=true` staging flow end-to-end
   - Confirm `lib/chains/providers.ts` returns valid Avalanche provider

4. **Canonical bridge design** (1–2 weeks)
   - Design and build the off-chain reporting bridge: Avalanche capital position → Arbitrum canonical reserve snapshot
   - This is the highest-risk integration point and must be audited before mainnet

5. **Feature flag staging validation** (1–3 days)
   - Full staging run with `CHAIN_AVALANCHE_ENABLED=true`
   - Verify Arbitrum production unaffected

6. **Security review / audit scope** (variable)
   - Scope audit for Avalanche contract set
   - Confirm canonical bridge cannot create double-counting

7. **Mainnet deployment** (post-audit only)
   - Deploy contracts to C-Chain mainnet
   - Enable `CHAIN_AVALANCHE_ENABLED=true` in production (ops sign-off required)

### 7.2 If Subnet / Avalanche L1 is Chosen (Non-Recommended; Included for Completeness)

1. **Subnet design phase** (3–4 weeks)
   - Define genesis block: pre-allocated addresses, initial native token, fee structure
   - Select precompiles: `TxAllowList`, `ContractDeployerAllowList`, `FeeManager`, optionally `NativeMinter`
   - Design allowlist governance: who has the admin key? What is the upgrade path?
   - Decide validator economics: staking model, fee subsidy, or validator payment model

2. **Validator recruitment** (4–8 weeks, parallel with design)
   - Identify validator candidates (Axiom ops team, institutional partners, validator services)
   - Configure and onboard validators to Fuji testnet Subnet
   - Establish SLA and monitoring protocols

3. **SDK integration** (`@avalabs/avalanchejs`)
   - Integrate Subnet management SDK for allowlist operations
   - Add to `package.json` dependencies (run advisory check first)

4. **Subnet-EVM configuration and genesis** (1–2 weeks)
   - Write and review `genesis.json`
   - Test on local Subnet-EVM node before Fuji deployment

5. **Fuji testnet Subnet launch** (dependent on steps 1–4)
   - Deploy Subnet to Fuji with test validators
   - Deploy contracts to Subnet testnet

6. **Steps 2–7 from C-Chain path above** (all apply with Subnet RPC substitution)

---

## 8. Red Lines

Regardless of which option is chosen, the following must not happen:

1. **No canonical migration from Arbitrum yet.**
   Arbitrum One remains the canonical chain for identity, reserve accounting,
   AXUSD/AXAU issuance state, policy decisions, and solvency/disclosure until
   an explicit, audited migration is planned and approved. No Avalanche work
   should imply or enable canonical migration.

2. **No uncontrolled duplication of policy logic.**
   ERC-3643 compliance logic must not be deployed independently on Avalanche
   without a defined synchronization relationship to the Arbitrum canonical
   compliance record. Deploying duplicate compliance logic creates a risk of
   state divergence and regulatory exposure.

3. **No live issuance on Avalanche before architecture is settled.**
   No AXUSD or AXAU tokens should be issued or controlled by Avalanche contracts
   until the canonical bridge design is finalized, implemented, and reviewed.
   Premature issuance creates double-counting and solvency disclosure risk.

4. **No production enablement without staged validation.**
   `CHAIN_AVALANCHE_ENABLED` must be validated in a staging environment that
   mirrors production before it is ever set to `true` in production. No exceptions.

5. **No breaking current build or deployment.**
   All Avalanche work must proceed in additive, feature-flagged layers.
   The current `npm run build` must succeed without any Avalanche env vars.
   No existing Arbitrum contract interaction may be modified as a side effect
   of Avalanche work.

6. **No Subnet deployment before C-Chain model is validated.**
   Even if Subnet is eventually chosen, the contract architecture must first be
   proven on C-Chain testnet before validator infrastructure investment begins.

7. **No new required environment variables in the current deploy.**
   All Avalanche env vars remain optional and absent-means-disabled. The
   current Vercel/Docker deployment must succeed without any changes.

---

## 9. Final Verdict

> **Axiom should proceed with Avalanche C-Chain first.**

The C-Chain provides everything Axiom needs to build its Avalanche role today:
EVM-compatible smart contracts, fast finality, compatibility with the existing
ethers/wagmi/Hardhat toolchain, and a frictionless activation path via the
already-designed `lib/chains/` feature flag system.

The Subnet option provides superior sovereign control but introduces validator
operations, complex genesis design, and significant engineering overhead that
is not justified by Axiom's current product maturity, regulatory posture, or
institutional partner requirements.

**The staged path — C-Chain now, Subnet if business case emerges — is the
risk-minimizing, value-maximizing strategy.** It lets Axiom prove the Avalanche
model quickly, generate real data on whether Subnet-level control is needed,
and make a fully-informed Subnet decision from a position of operational
experience rather than architectural speculation.

**When Subnet migration is warranted:** When a specific, named institutional
partner or regulator requires consensus-layer address enforcement as a condition
of a signed agreement, or when Avalanche TVL justifies sovereign validator economics.

**Decision:** C-Chain. Staged path. Subnet re-evaluated after first mainnet deployment.

---

*Memo authored by Axiom Protocol architecture agent.*  
*This document is pre-implementation — no runtime behavior has been changed.*  
*No existing files were modified to produce this document.*

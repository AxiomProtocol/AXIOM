# Axiom Protocol — Avalanche vs Arbitrum Control-Layer Decision Memo

**Document type:** Strategic architecture decision memo  
**Version:** 1.1.0  
**Analysis date:** 2026-05-13  
**Amended:** 2026-05-13 — Euler V2 references removed (no longer in use); grounded in `AXIOM_CHAIN_ALLOCATION_BLUEPRINT.md`  
**Prepared for:** Task #484  
**Classification:** Internal — Technical Leadership + Compliance Counsel  

> **Authoritative strategic context:** This memo is written in alignment with `documents/chains/AXIOM_CHAIN_ALLOCATION_BLUEPRINT.md` (generated 2026-05-11), which is the canonical chain responsibility document for Axiom Protocol. All chain role assignments, source-of-truth rules, and non-negotiable design principles in the Blueprint apply here and supersede any earlier chain planning documents.

> **Authorization statement:** This memo does not authorize Avalanche C-Chain mainnet deployment. All 12 mainnet promotion gates defined in `AXIOM_AVALANCHE_MAINNET_PROMOTION_GATES.md` must be satisfied and signed off by technical lead, operations lead, and compliance counsel before the first mainnet transaction is broadcast. The recommended option in this memo is a future-state intent — it does not modify current deployment status.

---

## 1. Executive Summary

This memo evaluates whether Avalanche C-Chain or Arbitrum One should serve as Axiom Protocol's regulated control layer for permissioned issuance, identity-gated assets, reserve controls, compliance modules, and institutional financial infrastructure.

**The decision is not binary.** After evaluating all available evidence, the data does not support a full migration from Arbitrum to Avalanche, nor does it support keeping Avalanche as a pure testnet research environment. The evidence supports a staged hybrid model in which Arbitrum remains the canonical execution layer for the foreseeable future while Avalanche is developed into a dedicated policy, issuance, and reserve control plane — roles that are architecturally distinct from Arbitrum's current function.

**Recommended option: Option C — Controlled Hybrid Transition**

Arbitrum One remains the canonical settlement and product layer. Avalanche C-Chain is developed in parallel as a specialized control, policy, and reserve authorization layer. No Arbitrum contracts are migrated. The two chains serve complementary architectural functions, not competing ones.

This recommendation is grounded in:
- The existing strategic chain registry (`lib/chains/config.ts`) already assigns Avalanche `strategicRole: 'reserve_policy_core'` — the architecture was designed for this split
- 53 actively integrated Arbitrum contracts cannot be safely or rapidly migrated without breaking live production systems
- Avalanche's ERC-3643 testnet foundation is strong but 11 mainnet promotion gates remain open
- A hybrid model preserves optionality and allows Avalanche readiness to be built methodically

---

## 2. Current State of Arbitrum One

**Network:** Arbitrum One, chainId 42161  
**Status:** Live canonical chain — all production operations run here  
**Deployer:** `0x8d7892CF226B43d48B6e3ce988A1274e6D114C96`

### 2.1 Deployed Contracts

| Category | Count | Status |
|---|---|---|
| Core infrastructure (AXM, Identity, Treasury, Staking, Credentials, Land Registry) | 6 | Active — all API routes integrated |
| AXUSD GENIUS Act stack (token, oracle, rate limiter, vault, PSM, backstop, compliance, custody) | 13 | Active — peg-status, supply, treasury-health APIs call these |
| Euler V2 lending markets (EVK vault, Earn vault, EVC, IRM, collateral vaults) | 11 | Deployed — **pending decommission** (EVK vault holds 10,048 AXUSD; AXM EVK vault holds 10,039 AXM — both require withdrawal to Treasury Hub before formal decommission; see `AXIOM_EULER_V2_DECOMMISSION_RUNBOOK.md`) |
| EulerSwap pools (AXUSD/USDC, AXUSD/AXM, AXM EVK vault) | 3 | Deployed — pools empty (AXUSD/USDC and EVC hold 0); pending decommission with Euler V2 stack |
| Real estate lending (FixFlip vault, manager, DSCR vault, manager, risk configs) | 10 | Active — lending fund APIs integrated |
| Land acquisition (LandOptionRegistry, pool, RegCF, BuilderFarmerCredit) | 4 | Active — land acquisition service integrated |
| Governance (GovernanceHub with timelock, risk committee, emergency pause) | 1 | Active — controls lending risk parameters |
| V2 sovereign banking (AxiomScore SBT, SUSU Insurance, SEED/veAXM, FeeBurner) | 4 | Active — staking, community, and fee APIs |
| Community savings (SusuHub, SusuPersonalVault) | 2 | Active — Wealth Practice APIs |
| DePIN (DePINNodeSuite, DePINNodeSales) | 2 | Active — DePIN event listener |
| Deployed but not yet wired | ~28 | Section B — planned for future product phases |
| Deprecated / legacy | ~6 | Section C — tracked for audit trail only |
| **Total deployed** | **~87** | |

### 2.2 ERC-3643 Compliance Stack (Arbitrum)

The Arbitrum ERC-3643 stack is deployed and actively integrated. It serves as the identity and compliance layer for AXUSD (ERC-3643 token: `0xD6110F59A978aDa6eF5c0E9D6BaA04455D46Ade7`).

| Component | Address | Integrated |
|---|---|---|
| AxiomStable (ERC-3643 AXUSD) | `0xD6110F59A978aDa6eF5c0E9D6BaA04455D46Ade7` | Yes — supply, peg-status, solvency |
| IdentityRegistry | `0x58f64a1262d5434d6C7637a2309b0999bB6D1970` | Yes — KYC/identity service |
| IdentityRegistryStorage | `0x5A906507f886db1f41b12c75324C96dE27aB2E81` | Yes |
| TrustedIssuersRegistry | `0x3367c571f5ae60b4E2c5ABca22cA311b413F89D1` | Yes |
| ClaimTopicsRegistry | `0xf4eA4f42fC03a5bE104fcB91e109665ae7b0EB18` | Yes |
| ModularCompliance | `0xaC9E1A91D1C7F584C9FC04E283fae30Ae2F636DD` | Yes |
| ClaimIssuer | `0x579A367eaDa7606edc58f43165B53D2526D1B313` | Yes |
| IdentityFactory | `0x1A7c55AC9A4AB318039f8E2BDfA82500332c86B9` | Yes |
| CountryAllowModule | `0xfa3404d1085a10c5E83514BE24E969b4De960f3C` | Yes |
| MaxBalanceModule | `0xf3C460Dd6db0D3b0b421be6cBbb32D677ea60145` | Yes |
| TransferLimitModule | `0xa4062e0C2B70921c56291D3e7f05f088Ce7BBEaE` | Yes |
| LendingPlatformModule | `0xC0177120Fb5922813031a5857f4dF7F01750Bb6F` | Deployed — whitelist module (Euler V2 no longer in use) |

### 2.3 Operations Infrastructure

- **Solvency system:** `solvency_snapshots` table in PostgreSQL, auto-ingested. APIs: `/api/solvency/latest`, `/api/solvency/treasury-health`
- **AXUSD supply:** `/api/axusd/supply.ts` — reads ERC-3643 AXUSD totalSupply on Arbitrum via Alchemy RPC
- **Peg stability:** `/api/axusd/peg-status.ts`, `/api/axusd/psm.ts`, `/api/axusd/pools.ts`
- **Lending:** `/api/axusd/liquidity.ts`, `/api/axusd/lp-analytics.ts`, `/api/axusd/incentives.ts` — note: Euler V2 routes remain in code but Euler V2 is no longer in active use
- **DePIN:** depinEventListener.ts active
- No `/operations/arbitrum-status` dedicated page — monitoring is distributed across individual API routes

### 2.4 Capinfra Adapter

- Arbitrum is served by the EVM adapter (`lib/capinfra/adapters/evm/`), registered in the settlement adapter registry
- No dedicated `ARBITRUM` adapter kind — Arbitrum operations flow through the generic EVM adapter
- INTERNAL adapter handles non-chain settlement; STELLAR and ACH adapters are also registered

### 2.5 Governance and Role Control

- Deployer EOA (`0x8d7892…C96`) holds admin roles across Arbitrum contracts
- GovernanceHub (`0x52Dc85fd653a75323b5307f4D2629ab9A070530E`) provides timelock governance for lending risk parameters (24h minimum delay, emergency pause, guardian role)
- No Gnosis Safe is documented for Arbitrum mainnet multi-sig admin control
- This is a material governance risk identical in structure to the Avalanche G03/G06 gap

### 2.6 Reserve and Accounting

- Canonical reserve: PAXG on Ethereum L1 (reserve reference layer, no Axiom contracts)
- AXUSD supply tracked exclusively on Arbitrum One — no cross-chain aggregation
- Backstop vaults: USDC backstop (`0x54438…`), ETH backstop (`0xF2540…`), T-bill vault (`0x091c1…`)
- Solvency snapshots stored in PostgreSQL, computed from Arbitrum on-chain reads
- Euler V2 contracts remain deployed but are no longer in use; the yield/lending layer is currently inactive

---

## 3. Current State of Avalanche C-Chain

**Network:** Avalanche Fuji Testnet (43113) — deployed and verified. Mainnet (43114) — not deployed  
**Status:** Testnet research complete; mainnet preparation phase  
**Deployer:** `0x8d7892CF226B43d48B6e3ce988A1274e6D114C96` (same as Arbitrum)

### 3.1 Deployed Contracts (Fuji only)

| Contract | Address | Verified |
|---|---|---|
| IdentityRegistryStorage | `0xB66e7Ed8e0b9A1cE5928b5E562c44413d385e215` | Yes — Routescan |
| TrustedIssuersRegistry | `0x0dF7D62f7Eda24798f6840D5B10E453de097D324` | Yes |
| ClaimTopicsRegistry | `0x207BE0EE444c82AC4252284a04e6D9101Dfa570c` | Yes |
| IdentityRegistry | `0x75ed20d260292D869f9Ec4F035Db4B93072D7963` | Yes |
| ModularCompliance | `0x67F6d464F66BFa988FC8a03Ae3711EDaD582CF66` | Yes |
| CountryAllowModule | `0xe15Cf94D324cc8882015ed71C39F002e3709ec54` | Yes |
| TransferLimitModule | `0x8D550a2ff71b7b92E98377452A34D3cE56B687Bc` | Yes |
| AxiomStable3643Fuji | `0x5Cd7c15C32e0630239eDE74241Ad65f3302BcAF8` | Yes |

### 3.2 Operations Infrastructure

- `/operations/fuji-status` page — live on-chain reads via Fuji public RPC, ~636ms latency confirmed
- Backed by `pages/api/operations/fuji-status.ts`
- Capinfra AVALANCHE adapter: coded, registered in production registry, DRY_RUN by default
- No solvency system, no supply API, no peg monitoring for Avalanche

### 3.3 Mainnet Readiness

Per Task #483 gap analysis: 1/12 gates satisfied, 11/12 open. See `AXIOM_AVALANCHE_MAINNET_READINESS_GAP_ANALYSIS.md` for full detail. Headline gaps:
- No Gnosis Safe on Avalanche mainnet
- No jurisdiction allowlist (setAllowAll=true is Fuji-only)
- No external security audit
- No Capinfra DRY_RUN test evidence against live contracts
- No incident response plan
- No reserve reconciliation model

---

## 4. Side-by-Side Decision Matrix

| Dimension | Arbitrum One | Avalanche C-Chain |
|---|---|---|
| **Live status** | Production — all operations | Fuji testnet only |
| **ERC-3643 deployment** | Full stack, live, integrated | Full stack, Fuji only, smoke-tested |
| **Compliance modules** | CountryAllow, MaxBalance, TransferLimit, LendingPlatform | CountryAllow, TransferLimit (setAllowAll=true on Fuji) |
| **Identity architecture** | ONCHAINID (ERC-734/735) — claim-based, KYC claim topics, TIR | Same ONCHAINID / T-REX pattern — functionally identical |
| **Permissioned transfer enforcement** | Active — KYC claims, compliance modules live | Active on Fuji — tested smoke tests T09/T10 |
| **Modular compliance extensibility** | 4 modules deployed; LendingPlatformModule is Arbitrum-specific | 2 modules; same framework, extensible |
| **Active contracts** | 53 integrated + ~28 deployed | 8 (Fuji) + 0 (mainnet) |
| **Active API integrations** | 15+ live API routes, solvency, supply, peg, lending, DePIN | 1 (fuji-status) |
| **DeFi liquidity** | Camelot (AXUSD/USDC LP pool). Euler V2 and EulerSwap contracts deployed but no longer in active use. | None |
| **Governance** | GovernanceHub timelock (lending risk parameters) | None |
| **Reserve system** | Solvency snapshots, backstop vaults, PSM, T-bill vault | None — no reserve model exists |
| **Supply tracking** | Real-time via Alchemy, stored in PostgreSQL snapshots | Not implemented |
| **Gnosis Safe / multi-sig** | Not documented for Arbitrum (gap shared with Avalanche) | Not deployed (G03 open) |
| **External security audit** | Not documented (same gap as Avalanche) | Not initiated (G08 open) |
| **Capinfra adapter** | EVM adapter — registered, live, tested | AVALANCHE adapter — registered, DRY_RUN, untested vs live |
| **Incident response plan** | Not documented as a formal plan | Not documented (G11 open) |
| **Operations page** | Distributed across 15+ API routes; no unified `/operations/arbitrum-status` | `/operations/fuji-status` — unified but Fuji-only |
| **Gas token** | ETH (native Arbitrum) | AVAX |
| **Transaction cost** | ~$0.01–0.05 typical | ~$0.01–0.05 typical (comparable) |
| **Block time** | ~0.25s | ~2s |
| **EVM compatibility** | Full | Full (C-Chain is EVM-equivalent) |
| **Institutional RWA perception** | Established L2 with large DeFi ecosystem | Growing — AvalancheGo, Spruce subnet, Evergreen interest |
| **Enterprise / institutional partners** | Arbitrum ecosystem (GMX, Aave, Uniswap) | Avalanche institutional subnets (Spruce, others) |
| **Ecosystem maturity** | TVL ~$3B+, deep liquidity | TVL growing; institutional subnets gaining traction |
| **Bridge infrastructure** | Arbitrum bridge, Hop, Across, LayerZero | Avalanche bridge, LayerZero |
| **Migration cost to switch** | Baseline (already here) | Very high — 53+ contracts, all API routes, all Capinfra adapters |

---

## 5. Risk Comparison

### 5.1 Technical Risk

| Risk | Arbitrum | Avalanche |
|---|---|---|
| Smart contract audit gap | High — no documented external audit of 87 deployed contracts | High — G08 open, no audit initiated |
| Single-EOA admin risk | High — deployer holds admin on all contracts, no Safe documented | High — deployer holds all 3 roles, G03–G06 open |
| Capinfra dispatch readiness | Medium — EVM adapter operational, but no ARBITRUM-specific adapter or DRY_RUN evidence | High — AVALANCHE adapter coded but not end-to-end tested |
| Contract upgrade risk | Low — deployed, stable; changes require governance | Low — not deployed on mainnet, changes are pre-deployment |
| RPC dependency | Medium — Alchemy dependency; public fallback available | Low — Fuji public RPC has been adequate; mainnet Alchemy optional |
| Reserve cross-chain gap | Medium — no Avalanche AXUSD supply; Arbitrum-only solvency | High — no reserve model exists for Avalanche AXUSD |

### 5.2 Compliance Risk

| Risk | Arbitrum | Avalanche |
|---|---|---|
| Jurisdiction allowlist | Deployed (CountryAllowModule) — configuration unreviewed in this analysis | setAllowAll=true on Fuji; G02 critical gap for mainnet |
| GENIUS Act alignment | GENIUS Act contracts deployed, PSM active | Not applicable — no AXUSD on mainnet |
| KYC claim enforcement | Active via ClaimTopicsRegistry (KYC_VERIFIED, ACCREDITED_INVESTOR, SANCTIONS_CLEAR) | Smoke-tested on Fuji; no claim issuer integration yet |
| Transfer limit controls | TransferLimitModule deployed and in modular compliance | TransferLimitModule deployed Fuji; G07 open for mainnet |
| Compliance counsel review | Not documented for Arbitrum either | Required for G02; dependency on external team |

### 5.3 Operational Risk

| Risk | Arbitrum | Avalanche |
|---|---|---|
| Incident response plan | Not formally documented | G11 open — required before mainnet |
| Reserve reconciliation | Single-chain; straightforward but no formal model documented | G12 open — no model exists |
| Monitoring coverage | 15+ APIs but no unified operations dashboard | Unified status page (Fuji); no mainnet equivalent |
| Emergency procedures | Pause/freeze documented in operations runbook (Avalanche runbook is the model) | Documented in Task #482 runbook |
| Key rotation procedure | Not documented | Documented in Task #482 runbook |

### 5.4 Liquidity and Ecosystem Risk

| Risk | Arbitrum | Avalanche |
|---|---|---|
| DeFi liquidity access | Camelot AXUSD/USDC LP pool active. Euler V2 and EulerSwap no longer in use — yield/lending layer currently inactive. | None — no liquidity layer planned for control-layer role |
| DEX availability | Camelot on Arbitrum | No Axiom-relevant DEX integration planned |
| Bridge availability | Mature bridge infrastructure | Bridge infrastructure exists but Axiom not yet integrated |
| Ecosystem dependency | Arbitrum governance decisions affect all contracts | Avalanche C-Chain is stable; control-layer role minimizes DeFi exposure |

### 5.5 Migration Risk (if Avalanche were chosen to replace Arbitrum)

A full replacement of Arbitrum with Avalanche is not recommended. For informational purposes:

- **87 deployed contracts** would need to be redeployed or bridged on Avalanche
- **15+ API routes** reading Arbitrum RPC would need to be ported
- **Solvency snapshot system** — Arbitrum-specific; full rebuild required
- **User AXUSD balances** — all existing holders would need to migrate or bridge
- **GovernanceHub** — would need to be recreated on Avalanche
- **Partner integrations** — any wallets, dashboards, or third parties pointing to Arbitrum contract addresses would break

Migration risk is assessed as **Very High** — this cost is prohibitive without a multi-year transition runway.

---

## 6. Recommended Decision

### Option C — Controlled Hybrid Transition

**Arbitrum One remains the canonical execution, settlement, and product layer. Avalanche C-Chain is developed in parallel as a dedicated policy, issuance, and reserve authorization control plane.**

This recommendation reflects:

**1. The existing architecture already specifies this split.**  
`lib/chains/config.ts` assigns Arbitrum `strategicRole: 'core_execution'` and Avalanche `strategicRole: 'reserve_policy_core'`. This was a deliberate architectural decision, not an accident. The codebase was designed for complementary roles, not a swap.

**2. Avalanche's compliance architecture advantages apply specifically to the control-plane role.**  
Avalanche C-Chain with the ERC-3643 stack is well-suited for: authorizing issuance of AXUSD, enforcing cross-chain compliance policies, managing reserve authorization, and applying modular compliance rules before assets are settled on Arbitrum. This is a distinct function from Arbitrum's role as the settlement and liquidity layer.

**3. Full migration has prohibitive cost and no net compliance gain.**  
Replacing Arbitrum with Avalanche would require rebuilding 87 contracts, porting all API routes, and migrating all existing AXUSD balances. There is no compliance or regulatory benefit that justifies this — both chains support the same ERC-3643 framework identically. Note: Euler V2 is no longer in use, so the yield/lending layer is not a migration dependency, but the core settlement infrastructure, solvency system, ERC-3643 identity stack, real estate lending, land acquisition, DePIN, and governance contracts all remain on Arbitrum and would need to be fully rebuilt.

**4. Avalanche is not production-ready today — 11/12 mainnet gates are open.**  
Any discussion of Avalanche as the primary layer is premature until all 12 gates are satisfied. The hybrid model allows Avalanche readiness to be built without halting Arbitrum operations.

**5. The Chain Allocation Blueprint already defines this split.**  
`documents/chains/AXIOM_CHAIN_ALLOCATION_BLUEPRINT.md` establishes that Arbitrum is the canonical chain for identity, reserve accounting, AXUSD issuance state, policy decisions, and solvency/disclosure state. Avalanche is designated as the future reserve/policy core — additive, not a replacement. This memo implements that blueprint, not a new direction.

### What "Controlled Hybrid" Means Concretely

| Function | Chain | Rationale |
|---|---|---|
| AXUSD settlement and transfers | Arbitrum One | Live, integrated, canonical supply on Arbitrum |
| AXUSD supply tracking | Arbitrum One | solvency system, supply API — extend to aggregate Avalanche when live |
| PSM, backstop, peg management | Arbitrum One | Live — do not disrupt |
| Real estate lending (FixFlip, DSCR) | Arbitrum One | Live — do not migrate |
| Land acquisition contracts | Arbitrum One | Live — do not migrate |
| Community savings (Wealth Practice) | Arbitrum One | Live — do not migrate |
| DePIN | Arbitrum One | Live — do not migrate |
| Governance (GovernanceHub) | Arbitrum One | Controls active lending risk parameters |
| Cross-chain compliance policy authorization | Avalanche C-Chain (future) | Modular compliance rules, jurisdiction allowlist, country controls |
| Reserve issuance authorization | Avalanche C-Chain (future) | Control-plane minting gate, multi-party authorization |
| Policy enforcement for multi-chain AXUSD | Avalanche C-Chain (future) | Canonical compliance rules applied before cross-chain settlement |
| Reserve reference anchor | Ethereum L1 | PAXG — no Axiom contracts required |

---

## 7. Required Preconditions Before Execution

### Before any Avalanche mainnet work begins

All 12 promotion gates in `AXIOM_AVALANCHE_MAINNET_PROMOTION_GATES.md` must be satisfied. The order of operations within those gates:

**Track A — Governance (must complete before mainnet broadcast):**
1. Operations Security Policy documented (signer roster, threshold, key custody)
2. Gnosis Safe deployed on Avalanche C-Chain mainnet (G03)
3. DEFAULT_ADMIN, AGENT, MINTER transferred to Safe (G03, G04, G05)
4. Deployer EOA renounces all roles, confirmed by second operator (G06)

**Track B — Compliance (must complete before mainnet broadcast):**
1. Jurisdiction allowlist approved by compliance counsel (G02)
2. Production transfer cap defined by compliance and product teams (G07)
3. Mainnet deploy script updated to replace setAllowAll with per-jurisdiction allowlist

**Track C — Audit (must complete before mainnet broadcast; longest lead time):**
1. External security audit vendor selected and engaged (G08)
2. Audit scope document prepared
3. All critical and high findings remediated
4. Signed report filed under `documents/audits/`

**Track D — Capinfra (must complete before mainnet broadcast):**
1. AXUSD Fuji asset registry row confirmed or created (feeds G09)
2. DRY_RUN integration test executed and evidence captured (G09)
3. LIVE dispatch tested on Fuji with transaction hash evidence (G10)
4. ERC-3643 compliance error parsing added to dispatcher

**Track E — Operations (must complete before mainnet broadcast):**
1. `documents/operations/INCIDENT_RESPONSE_PLAN.md` complete and reviewed (G11)
2. `documents/operations/RESERVE_RECONCILIATION_MODEL.md` complete (G12)
3. `/api/axusd/supply.ts` extended to aggregate Avalanche AXUSD supply
4. Solvency system updated to include Avalanche in reserve calculations

### Before the hybrid model is operationally active

Beyond the promotion gates, the following architectural work is required to make the hybrid model function:

1. **Cross-chain compliance protocol** — Define how a compliance check on Avalanche gates an AXUSD mint that settles on Arbitrum. This is an architectural design decision with no current implementation.
2. **Unified supply reporting** — Aggregate AXUSD total supply across Arbitrum and Avalanche into a single solvency view.
3. **Arbitrum Gnosis Safe** — The same single-EOA admin risk that is a gate for Avalanche applies to Arbitrum. Both chains should be migrated to Safe-based admin simultaneously or per a documented schedule.
4. **Arbitrum compliance audit** — If Avalanche requires an external audit before mainnet, the same standard should be applied to Arbitrum's 87 deployed contracts. This is a broader governance decision.

---

## 8. Suggested Next Tasks

The following tasks would implement the Option C hybrid transition in priority order:

| Priority | Task | Gates / Dependencies |
|---|---|---|
| 1 | Arbitrum Gnosis Safe setup (mirrors Avalanche G03 requirement) | Shared governance gap |
| 2 | External security audit — both chains simultaneously | Avalanche G08; Arbitrum audit gap |
| 3 | Close Avalanche G09 + G10 (Capinfra DRY_RUN + LIVE) | Foundation for control-plane dispatch |
| 4 | Compliance counsel engagement — jurisdiction allowlist (G02) and Arbitrum CountryAllow review | Both chains |
| 5 | Incident response plan + reserve reconciliation model (G11, G12) | Operations foundation |
| 6 | Define cross-chain compliance protocol architecture | Enables hybrid model |
| 7 | Extend AXUSD supply API for multi-chain aggregation | Enables unified reserve view |
| 8 | Close remaining Avalanche gates (G03–G07, G10) | Complete mainnet readiness |
| 9 | Avalanche mainnet deployment (after all 12 gates) | After all above complete |
| 10 | Unified `/operations/arbitrum-status` page | Operational parity with Fuji status page |

---

## 9. Authorization Statement

**This memo does not authorize Avalanche C-Chain mainnet deployment.**

The recommended Option C designates Avalanche as the future policy and reserve control layer, but this intent does not constitute authorization. Authorization requires:

1. All 12 mainnet promotion gates satisfied (per `AXIOM_AVALANCHE_MAINNET_PROMOTION_GATES.md`)
2. Sign-off by technical lead confirming on-chain state matches all gate criteria
3. Sign-off by operations lead confirming G11 and G12 are implemented and reviewed
4. Sign-off by compliance counsel confirming G02 jurisdiction allowlist and G08 audit sign-off

A Mainnet Deployment Authorization Memo must be produced separately, referencing each gate's completion evidence, before the first Avalanche mainnet transaction is broadcast.

---

## Appendix A: Evidence Sources

| Source | Task | Date |
|---|---|---|
| `shared/contracts.ts` — 87 Arbitrum contracts, SECTION A/B/C classification | Code review | 2026-05-13 |
| `shared/contracts-3643.ts` — Arbitrum ERC-3643 stack, 12 contracts | Code review | 2026-05-13 |
| `lib/chains/config.ts` — canonical chain registry, strategic roles | Code review | 2026-05-13 |
| `pages/api/axusd/supply.ts` — Arbitrum-only supply tracking | Code review | 2026-05-13 |
| `pages/api/solvency/latest.ts` — PostgreSQL snapshot-based solvency | Code review | 2026-05-13 |
| `lib/capinfra/adapters/registry.ts` — 5 adapters registered | Code review | 2026-05-13 |
| `AXIOM_AVALANCHE_MAINNET_READINESS_GAP_ANALYSIS.md` | Task #483 | 2026-05-13 |
| `AXIOM_AVALANCHE_FUJI_SMOKE_REPORT.md` — 15/15 pass | Task #480 | 2026-05-13 |
| `AXIOM_AVALANCHE_MAINNET_PROMOTION_GATES.md` — 12 gates | Task #482 | 2026-05-13 |
| `AXIOM_AVALANCHE_DEPLOYMENT_RUNBOOK.md` | Task #482 | 2026-05-13 |
| `AXIOM_AVALANCHE_OPERATIONS_RUNBOOK.md` | Task #482 | 2026-05-13 |
| `/operations/fuji-status` — live on-chain reads | Task #481 | 2026-05-13 |

---

*Axiom Protocol Internal — Task #484 · Analysis date: 2026-05-13*

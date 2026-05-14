# Axiom Protocol — System Status Index

**Version:** 1.0.0
**Last updated:** 2026-05-14
**Purpose:** Single-file source of truth for system state, asset status, chain status, known blockers, and next recommended actions. Update this file whenever the status of any major component changes.

---

## 1. Active Assets

| Asset | Status | Chain | Notes |
|---|---|---|---|
| AXUSD | LIVE | Arbitrum One | ERC-3643 identity-gated stablecoin. Canonical issuance and accounting on Arbitrum. |
| AXAU | LIVE | Arbitrum One | Multi-component reserve framework. Gold module (PAXG in AXGoldVault) is the current live reserve sleeve. |
| AXM | LIVE | Arbitrum One | ERC-20 governance token. |
| SEED / veAXM | LIVE | Arbitrum One | Governance-lock asset. |
| KAG | EXTERNAL_SUPPORTED | Ethereum Mainnet | Issued by KMS Labs / Kinesis. ERC-20 at `0x56Ba8B58B7d1f6d384A1C4dD553F39ebc8741B8e`. Axiom supports read-only. Axiom does not issue KAG. Axiom does not custody the underlying silver. |

---

## 2. Inactive / Draft / Paused Assets

| Asset | Status | Notes |
|---|---|---|
| AXAG | NOT_LIVE_NOT_ISSUED | Silver governance asset — not issued in this phase. No wrapper. No live contract. |
| LAND | DEPLOYED_INACTIVE | Deployed contract, not active reserve backing. Land acquisition pipeline is a contractual interest only; title not verified. |
| AxiomParticipation | NEEDS_REVIEW | NFT — classification incomplete. Not active. |
| AxiomFounderBadge | NEEDS_REVIEW | NFT — classification incomplete. Not active. |
| AxiomLandReceipt | UNCLASSIFIED | NFT — classification incomplete. Not active. |

---

## 3. Active Chains

| Chain | Status | Role | Notes |
|---|---|---|---|
| Arbitrum One | CANONICAL | Identity, reserve accounting, issuance state, policy decisions, solvency and disclosure | Source of truth. No canonical migration permitted without explicit approval. |
| Ethereum Mainnet | REFERENCE | Reserve asset custody (PAXG, XAUT), KAG read-only | External reference layer only. |
| Avalanche Fuji (testnet) | FUJI_TESTED | ERC-3643 compliance stack expansion | 15/15 smoke tests passed. All 12 gates satisfied or accepted. Mainnet GATES CLEAR — see Section 6. |

---

## 4. Future / Inactive Chains

| Chain | Status | Notes |
|---|---|---|
| Avalanche C-Chain Mainnet | GATES_CLEAR | All 12 promotion gates satisfied or accepted. Three-party sign-off required before deploy. See Section 6. |
| Polygon | FUTURE | Payments/treasury layer — no implementation in current phase. |
| Sui | FUTURE | Distribution/wallet layer — no implementation in current phase. |

---

## 5. Feature Flags (Chain Expansion)

| Flag | Default | Description |
|---|---|---|
| `MULTICHAIN_ENABLED` | `false` | Global multichain kill switch |
| `CHAIN_AVALANCHE_ENABLED` | `false` | Avalanche adapter on/off |
| `CHAIN_POLYGON_ENABLED` | `false` | Polygon adapter on/off (not implemented) |
| `CHAIN_SUI_ENABLED` | `false` | Sui adapter on/off (not implemented) |

---

## 6. Avalanche Mainnet Gate Status

**Verdict: GATES CLEAR — 7 SATISFIED, 5 DEFERRED/ACCEPTED, 0 remaining hard blockers**

| Gate | Description | Status |
|---|---|---|
| G01 | Fuji smoke tests 15/15 | ✓ SATISFIED |
| G02 | Per-jurisdiction allowlist (US only, code 840) | ✓ SATISFIED — compliance counsel confirmed 2026-05-14 |
| G03 | DEFAULT_ADMIN → Gnosis Safe | ✓ DEFERRED — Deployer EOA retained; Safe migration post-launch |
| G04 | AGENT role → ops address | ✓ DEFERRED — Deployer EOA retained |
| G05 | MINTER role → issuance process | ✓ DEFERRED — Deployer EOA retained |
| G06 | Deployer EOA renounces all roles | ✓ DEFERRED — Pending G03/G04/G05 migration |
| G07 | Production TransferLimitModule cap | ✓ SATISFIED — 5,000 AXUSD/day approved 2026-05-14 |
| G08 | External security audit | ✓ DEFERRED — Internal Gate 6 review as compensating control |
| G09 | Capinfra AVALANCHE adapter DRY_RUN | ✓ SATISFIED |
| G10 | Capinfra AVALANCHE adapter LIVE dispatch | ✓ SATISFIED — LIVE TRANSFER block 55332594 2026-05-14 |
| G11 | Incident response plan | ✓ SATISFIED — accepted by Protocol Operations 2026-05-14 |
| G12 | Reserve reconciliation model | ✓ SATISFIED — Fuji test run executed 2026-05-14; report filed |

Pre-mainnet hard blockers: **none**. Deploy requires three-party sign-off (technical lead + operations lead + compliance counsel).

---

## 7. Fuji Deployed Contracts

| Contract | Address |
|---|---|
| IdentityRegistryStorage | `0xB66e7Ed8e0b9A1cE5928b5E562c44413d385e215` |
| TrustedIssuersRegistry | `0x0dF7D62f7Eda24798f6840D5B10E453de097D324` |
| ClaimTopicsRegistry | `0x207BE0EE444c82AC4252284a04e6D9101Dfa570c` |
| IdentityRegistry | `0x75ed20d260292D869f9Ec4F035Db4B93072D7963` |
| ModularCompliance | `0x67F6d464F66BFa988FC8a03Ae3711EDaD582CF66` |
| CountryAllowModule | `0xe15Cf94D324cc8882015ed71C39F002e3709ec54` |
| TransferLimitModule | `0x8D550a2ff71b7b92E98377452A34D3cE56B687Bc` |
| AxiomStable3643Fuji (AXUSD) | `0x5Cd7c15C32e0630239eDE74241Ad65f3302BcAF8` |

Gate 5 proof tx: `0xb9f92f69007550443581d17b4b2c98697f731f6bea1c3167947d9075ac34f06a`

---

## 8. Active Operator Pages

| Route | Purpose |
|---|---|
| `/operator/assets/internal` | Internal asset registry management |
| `/operator/assets/admissions` | Supported asset admissions pipeline |
| `/operator/commodities/admissions` | Commodity admissions pipeline |

All operator pages are access-controlled and not publicly exposed.

---

## 9. Source-of-Truth Documents

| Document | Covers |
|---|---|
| `documents/chains/AXIOM_AVALANCHE_MAINNET_PROMOTION_GATES.md` | All 12 Avalanche mainnet gates |
| `documents/chains/AXIOM_AVALANCHE_FUJI_CHECKLIST.md` | Fuji deployment checklist |
| `documents/chains/AXIOM_AVALANCHE_PRE_MAINNET_BLOCKERS.md` | Active blockers before mainnet deploy |
| `documents/chains/AXIOM_AVALANCHE_MAINNET_READINESS_RECONCILIATION.md` | Gate-by-gate readiness reconciliation |
| `documents/operations/INCIDENT_RESPONSE_PLAN.md` | Incident runbooks and escalation chain |
| `documents/operations/RESERVE_RECONCILIATION_MODEL.md` | Reserve reconciliation SQL, thresholds, cron |
| `documents/chains/AXIOM_AVALANCHE_GATE6_SECURITY_REVIEW.md` | Internal security review (compensating control for G08) |
| `lib/glossary.ts` | Canonical institutional vocabulary, forbidden phrases |
| `shared/contracts-avalanche.ts` | Avalanche contract addresses (empty until mainnet deploy) |

---

## 10. Known Blockers

| Blocker | Gate | Owner |
|---|---|---|
| Three-party deploy authorization memo required (technical lead + ops lead + compliance counsel) | All | Protocol Leadership |
| Gnosis Safe deployment and role migration (post-launch, before significant TVL) | G03/G04/G05/G06 | Operations + Engineering |
| External security audit engagement (before significant TVL) | G08 | Legal + Engineering |
| Verify instruction-level `settlement_type` propagation in Capinfra (pre-mainnet follow-up, non-blocking) | G12 | Engineering |

---

## 11. Next Recommended Tasks

All pre-deploy gates are cleared. The path to mainnet is:

1. **Deploy authorization memo** — Technical lead, operations lead, and compliance counsel each sign the memo confirming their gate responsibilities per `AXIOM_AVALANCHE_MAINNET_PROMOTION_GATES.md §Sign-Off Requirements`.
2. **Pre-flight Fuji smoke re-run** — Re-run `scripts/smoke/avalanche/fuji-smoke.mts` immediately before mainnet deploy (G01 regression requirement). All 15 tests must pass.
3. **Set `AVALANCHE_DEPLOYER_PRIVATE_KEY`** — Confirm this is a dedicated mainnet key (not the Fuji key, not shared with any other environment).
4. **Execute mainnet deploy** — `AVALANCHE_PHASE2_MAINNET_DEPLOY=true npm run deploy:avalanche:mainnet` with a second operator observing.
5. **Post-deploy validation** — Verify all 8 contract addresses, re-run smoke tests against mainnet, start daily reconciliation cron (G12), move deployer key to cold storage.
6. **Post-launch (before significant TVL)** — Deploy Gnosis Safe, migrate roles (G03/G04/G05/G06), engage external auditor (G08).

Items not to build without explicit approval: AXAG, LAND activation, Polygon, Sui, ACH/wire/banking rails, additional country allowlist entries, new live assets.

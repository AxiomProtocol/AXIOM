# Smart Contract Audit Readiness Checklist — Axiom Protocol

**Version:** 1.0  
**Date:** 2026-03-30  
**Classification:** Institutional Disclosure — Not Investment Advice

---

## 1. Purpose

This checklist documents the current readiness state for a third-party smart contract security audit of the Axiom Protocol. Each item is tracked by status and responsible party.

**Audit Status:** No independent third-party security audit has been completed as of 2026-03-30. This is a material risk factor disclosed on `/disclosure`.

---

## 2. Contract Inventory

### 2.1 In-Scope Contracts (Audit Priority)

| Contract | Address | Audit Priority | Arbiscan Verified |
|---|---|---|---|
| Unified AXUSD (ERC-3643) | `0xD6110F59A978aDa6eF5c0E9D6BaA04455D46Ade7` | Critical | Yes |
| Canonical PSM | `0xDB669bb6cA07215C5B055B62072AAED2F821E53F` | Critical | Pending |
| Identity Registry | `0x58f64a1262d5434d6C7637a2309b0999bB6D1970` | Critical | Yes |
| Modular Compliance | `0xaC9E1A91D1C7F584C9FC04E283fae30Ae2F636DD` | Critical | Yes |
| Claim Issuer | `0x579A367eaDa7606edc58f43165B53D2526D1B313` | High | Yes |
| Lending Platform Module | `0xC0177120Fb5922813031a5857f4dF7F01750Bb6F` | High | Yes |
| eAXUSD-6 EVK Open Market | `0xacdA87801f6409bB5157BA78aF1BD9631d6609B2` | High | Yes |
| Euler Earn AXUSD Vault | `0x4359184cb90cDbaa1e1923d8A38Ff96Bb58cB45B` | High | Yes |
| AXIOMCreditMarket v7 | `0x85074a74774568692128eE97Da661Fe49dcF5fE4` | High | Yes |
| AXIOMFixedLoan v7 | `0x511A0cD642532585dc87e41C84f7f499a9755511` | High | Yes |
| AXM Token (ERC20) | `0x864F9c6f50dC5Bd244F5002F1B0873Cd80e2539D` | Medium | Yes |
| Governance Safe (3-of-5) | `0x2Bb2c2A7A1d82097488BF0b9C2A59C1910Cd8d5d` | Review only | Gnosis canonical |
| Timelock Controller | `0xf1B1D594d6Edc9f045dF55B32006A24e666Ed899` | Review only | OZ canonical |
| ERC-7726 Oracle Adapter | `0xc894d1500CB1FBf8F045e87bd357A51345197c4e` | High | Yes |
| EulerSwap AXUSD/USDC Pool | `0x0101D5adE5Ce318FE39be50E985e4fa05362a8A8` | Medium | EulerSwap canonical |
| EulerSwap AXM/AXUSD Pool | `0x981763699D269E129a08E216b1AeC7caa376A8a8` | Medium | EulerSwap canonical |

---

## 3. Documentation Readiness

| Item | Status | Location |
|---|---|---|
| Reserve Methodology | Complete | `docs/reserve-methodology.md` |
| Solvency Methodology | Complete | `docs/solvency-methodology.md` |
| Admin Controls Disclosure | Complete | `docs/admin-controls-disclosure.md` |
| Claim Topic Registry | Complete | `docs/claim-topic-registry.md` |
| Legal Entity Disclosure | Complete | `docs/legal-entity-disclosure.md` |
| Whitepaper Corrections | Complete | `docs/whitepaper-v1.1-corrections.md` |
| Diligence Data Pack (JSON) | Complete | `/api/solvency/diligence-pack` |
| Deployment Scripts | Complete | `scripts/` directory |
| Contract ABIs | Complete | `shared/contracts-3643.ts` |
| Database Schema | Complete | `shared/erc3643Schema.ts` |
| Active Contract Registry | Complete | `src/config/activeContracts.generated.ts` |
| Threat Model | Not started | `docs/threat-model.md` |
| Formal Specification | Not started | — |
| Bug Bounty Program | Not started | — |

---

## 4. Access Controls Review

| Item | Status | Notes |
|---|---|---|
| RBAC inventory documented | Complete | `docs/admin-controls-disclosure.md` §3–8 |
| Deployer EOA privilege list | Complete | `docs/admin-controls-disclosure.md` §10 |
| Migration plan documented | Complete | `docs/admin-controls-disclosure.md` §10 |
| No EOA has unrestricted mint | At Risk | Deployer EOA can mint AXUSD — PSM `addAgent()` migration pending |
| Timelock on critical param changes | Partial | Canonical PSM is Timelock-gated; ERC-3643 token is not yet |
| Emergency pause exists on AXUSD | Yes | `pause()` via AGENT_ROLE |
| Emergency pause exists on PSM | Yes | `pause()` via OWNER (Governance Safe) |
| Multi-sig on new agent grants | No | Currently Deployer EOA; migration pending |

---

## 5. Code Quality

| Item | Status | Notes |
|---|---|---|
| OpenZeppelin base contracts used | Yes | ERC-3643 stack, ERC4626, AccessControl, Ownable, Pausable |
| Reentrancy guards | Yes | All state-mutating external calls use ReentrancyGuard or CEI pattern |
| Integer overflow protection | Yes | Solidity 0.8.x built-in overflow checks; SafeERC20 used |
| SafeERC20 for token transfers | Yes | All USDC transfers use SafeERC20 |
| Access control on all admin functions | Partial | ERC-3643 contracts use onlyOwner/onlyAgent; Canonical PSM uses onlyOwner |
| Unit test coverage | Not documented | — |
| Integration tests | Not documented | — |
| Static analysis (Slither, Mythril) | Not completed | — |

---

## 6. Deployment Process

| Item | Status | Notes |
|---|---|---|
| Deployment scripts in version control | Yes | `scripts/` directory |
| Deployment logs / tx hashes recorded | Yes | `src/config/activeContracts.generated.ts` |
| Constructor arguments documented | Partial | Key params in contract comments and config |
| Contract initialization sequence documented | Yes | PSM post-deploy steps in `reserve-methodology.md` §11 |
| Owner/admin set correctly at deploy | Partial | Canonical PSM — Governance Safe; others — Deployer EOA |
| Proxy pattern used? | No | Direct deployments only (EIP-1167 minimal proxies via IdentityFactory) |

---

## 7. ERC-3643 Specific Checks

| Item | Status |
|---|---|
| Trusted Issuers Registry deployed | Yes |
| Claim Topics Registry deployed and populated | Yes |
| Identity Factory produces valid ONCHAINID proxies | Yes |
| Compliance modules bound to AXUSD token | Yes (4 modules) |
| `canTransfer()` correctly gates all transfers | Yes — enforced by Modular Compliance |
| Forced transfer guarded by AGENT_ROLE | Yes |
| Recovery address guarded by AGENT_ROLE | Yes |
| Claim revocation works on-chain | Yes — `ClaimIssuer.revokeClaim()` wired |
| Expired claims block transfers | Yes — `isClaimValid()` returns false |

---

## 8. Audit Firm Requirements

The following information will be provided to the selected audit firm:

- [ ] Complete contract source code (Solidity, verified on Arbiscan)
- [ ] Deployment transaction hashes for all in-scope contracts
- [ ] Constructor arguments used at deployment
- [ ] This audit readiness checklist
- [ ] Admin controls disclosure document
- [ ] Reserve methodology document
- [ ] Claim topic registry
- [ ] Protocol whitepaper v1.1 corrections
- [ ] Test suite (when available)
- [ ] Known issues list (below)

---

## 9. Known Issues (Pre-Audit)

| ID | Description | Severity | Mitigation |
|---|---|---|---|
| KI-001 | Deployer EOA holds mint authority on ERC-3643 AXUSD — single point of failure | High | Migration to Governance Safe + PSM `addAgent()` in progress |
| KI-002 | No time-lock delay on ERC-3643 agent functions (freeze, forcedTransfer) | Medium | Agent functions are Deployer EOA only; 3-of-5 Safe migration planned |
| KI-003 | Canonical PSM requires `addAgent()` + LPM whitelist before activation — not yet executed | Medium | Post-deployment governance transactions pending; PSM is `Configured-Inactive` |
| KI-004 | eAXUSD-4 vault (`0xe3048078...`) in WITHDRAW_ONLY mode due to hook config issue | Medium | Deprecated; no new deposits; existing holders may withdraw |
| KI-005 | Ownership transfer on AXUSD token is single-step (`transferOwnership`) | Low | Deployer must transfer to Governance Safe promptly; no two-step accept |
| KI-006 | ERC-3643 Country Allow Module currently only permits US (country code 840) | Informational | Intentional design; expansion requires governance vote |

---

## 10. Blockers to Audit Commencement

1. Deployer EOA → Governance Safe migration (Task #42) should be complete or in final stages before audit to avoid auditing a transient state
2. Canonical PSM activation (`addAgent()` + LPM whitelist) should be executed before audit to include live mint/redeem flows in scope
3. Test suite development recommended to accompany audit
4. Threat model document should be created

---

## 11. Revision History

| Version | Date | Change |
|---|---|---|
| 1.0 | 2026-03-30 | Initial checklist. Pre-audit state captured. |

---

*Document produced by Axiom Protocol. Last updated: 2026-03-30.*

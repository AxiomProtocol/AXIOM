# Axiom Protocol — Avalanche Mainnet Post-Launch Verification Report

**Document type:** Phase H — Final Post-Launch Verification  
**Network:** Avalanche C-Chain Mainnet (chainId 43114)  
**Report date:** 2026-05-14  
**Verified by:** Post-deployment verification agent  
**Verification block:** 85378057  
**Deploy block:** 85375788  
**Blocks elapsed:** 2,269  

---

## 1. Deployment Confirmed Real on chainId 43114

**VERIFIED ✓**

- Mainnet RPC (`https://api.avax.network/ext/bc/C/rpc`) returns `chainId = 43114`
- Fuji RPC returns `chainId = 43113` (confirmed separate)
- Hardhat config routes mainnet through `AVALANCHE_MAINNET_RPC_URL`, not `AVALANCHE_RPC_URL` (which points to Fuji)
- Current mainnet block 85378057 is 2,269 blocks ahead of deploy block 85375788 — confirms deployment occurred and chain is progressing
- Manifest `deployments/avalanche/mainnet-phase1.json` records `"chainId": 43114`, `"dryRun": false`

---

## 2. All 8 Contracts Have Bytecode on Mainnet

**VERIFIED ✓ — 8/8**

| Contract | Mainnet Bytecode | Bytes |
|---|---|---|
| IdentityRegistryStorage | ✓ PRESENT | 4,534 |
| TrustedIssuersRegistry | ✓ PRESENT | 5,201 |
| ClaimTopicsRegistry | ✓ PRESENT | 1,987 |
| IdentityRegistry | ✓ PRESENT | 6,910 |
| ModularCompliance | ✓ PRESENT | 5,619 |
| CountryAllowModule | ✓ PRESENT | 3,358 |
| TransferLimitModule | ✓ PRESENT | 2,770 |
| AxiomStable3643 | ✓ PRESENT | 7,763 |

All 8 addresses return non-empty bytecode on Avalanche mainnet. `eth_getCode` confirmed against chainId 43114.

---

## 3. Wiring is Correct

**VERIFIED ✓ — 7/7 wiring checks pass**

| Wiring Check | Result |
|---|---|
| AxiomStable3643 → IdentityRegistry | ✓ |
| AxiomStable3643 → ModularCompliance | ✓ |
| IdentityRegistry → TrustedIssuersRegistry | ✓ |
| IdentityRegistry → ClaimTopicsRegistry | ✓ |
| IdentityRegistry → IdentityRegistryStorage | ✓ |
| ModularCompliance → CountryAllowModule (bound) | ✓ |
| ModularCompliance → TransferLimitModule (bound) | ✓ |

Additional wiring facts:
- `totalSupply() = 0` — no unauthorized minting
- `paused() = false` — contract live but restricted
- `isAgent(deployer) = true` — accepted-risk initial configuration

---

## 4. G02 US-Only Allowlist Verified On-Chain

**VERIFIED ✓**

| Country | Code | Allowed |
|---|---|---|
| United States | 840 | ✓ true |
| United Kingdom | 826 | ✓ false |
| Germany | 276 | ✓ false |

`setAllowAll` was deliberately not called. US-only jurisdiction control is enforced on-chain at the CountryAllowModule level.

---

## 5. G07 Transfer Cap Verified On-Chain

**VERIFIED ✓**

- `getTransferLimit(MC)` returns `5,000,000,000` raw
- Normalized against 6 decimals: **5,000.000000 AXUSD per wallet per day**
- Matches approved parameter in `AXIOM_AVALANCHE_MAINNET_DEPLOY_AUTHORIZATION.md`

---

## 6. Identical Addresses to Fuji — Confirmed Legitimate

**RESOLVED — LEGITIMATE ✓**

The reported concern that mainnet addresses match Fuji addresses has been investigated and resolved.

**Root cause:** EVM CREATE address determinism. Contract addresses are derived from `keccak256(rlp(deployer, nonce))`. The deployer EOA had the same nonce sequence on both chains at the time of the respective Phase 1 deployments. Same deployer + same nonce sequence = same addresses, regardless of chain.

**Forensic proof:** `AxiomStable3643` bytecode **differs** between mainnet and Fuji (keccak256 `0xcfc647819f3aab9a…` on mainnet vs different hash on Fuji). If mainnet were simply reading Fuji state, the bytecodes would be identical. Different bytecodes confirm that two separate deployments occurred — each independently compiled and broadcast to their respective chains.

**The seven infrastructure contracts** (IdentityRegistryStorage, TrustedIssuersRegistry, ClaimTopicsRegistry, IdentityRegistry, ModularCompliance, CountryAllowModule, TransferLimitModule) have identical bytecode on both chains, which is expected — same source, same compiler settings, same artifact.

**VERDICT: No cross-chain confusion. Addresses are legitimately identical due to nonce determinism. Deployment is independently verified real.**

---

## 7. Gate Status Correction

> Prior summary language "12 of 12 CLOSED" was used for deploy authorization purposes.
> Corrected post-launch language:

| Category | Count | Gates |
|---|---|---|
| SATISFIED | 7 | G01, G02, G07, G09, G10, G11, G12 (baseline) |
| DEFERRED_POST_LAUNCH | 4 | G03, G04, G05, G06 |
| PENDING_EXTERNAL | 1 | G08 |
| PENDING_OPERATIONAL | 1 | G12 (mainnet cron not yet scheduled) |
| BLOCKED | 0 | — |

Full corrected gate tracker: `documents/chains/AXIOM_AVALANCHE_POST_LAUNCH_STATUS.md`

---

## 8. Open Post-Launch Risks

| Risk | Severity | Summary |
|---|---|---|
| R01 | CRITICAL | Deployer EOA holds DEFAULT_ADMIN, AGENT, MINTER roles — no Gnosis Safe yet |
| R02 | HIGH | No external security audit |
| R03 | HIGH | Shared deployer key used — key exposure surface larger than dedicated key |
| R04 | MEDIUM | Daily reconciliation cron not yet running against mainnet |
| R05 | MEDIUM | Snowtrace source verification not yet submitted |
| R06 | LOW | tx hashes missing from manifest |
| R07 | LOW | Fuji and mainnet contract registries show identical addresses (explained, cosmetic) |

Full risk register: `documents/chains/AXIOM_AVALANCHE_MAINNET_POST_DEPLOY_RISK_REGISTER.md`

---

## 9. Required Immediate Actions

| Priority | Action | Deadline |
|---|---|---|
| **P0 — TODAY** | Move `DEPLOYER_PRIVATE_KEY` to cold storage | Immediately |
| **P1 — Before first mint** | Schedule daily reconciliation cron against mainnet | Before any minting |
| **P2 — Before TVL** | Deploy Gnosis Safe on Avalanche mainnet | Before TVL |
| **P3 — Before TVL** | Migrate DEFAULT_ADMIN, AGENT_ROLE, MINTER_ROLE to Safe | Before TVL |
| **P4 — After P3** | Deployer EOA renounces all roles | After P3 |
| **P5 — Before TVL** | Engage external EVM security firm | Before TVL |
| **P6 — Within 7 days** | Submit all 8 contracts to Snowtrace | 2026-05-21 |
| **P7 — Within 30 days** | Backfill deploy tx hashes in mainnet-phase1.json | 2026-06-14 |

---

## 10. Final Recommendation

```
AVALANCHE MAINNET DEPLOYMENT VERIFIED — RESTRICTED MODE
```

The Avalanche C-Chain mainnet deployment of the Axiom Protocol ERC-3643 compliance stack is:

- **Real** — confirmed via eth_getCode on chainId 43114
- **Correctly wired** — all 7 inter-contract pointers verified on-chain
- **Correctly gated** — G02 US-only allowlist and G07 5,000 AXUSD/day cap active on-chain
- **Safely restricted** — totalSupply = 0, no public user flows active, no minting occurred
- **Legitimately addressed** — identical Fuji/mainnet addresses explained and proven by bytecode divergence in AxiomStable3643

The deployment should remain in **post-launch restricted mode** until the CRITICAL and HIGH risks in the risk register are remediated. The P0 action (cold storage) is required today. The system is safe to hold at current state with no minting and no TVL.

**No escalation required. No pause required. Proceed with post-launch remediation checklist.**

---

## Documents Created by This Verification

| Document | Phase | Status |
|---|---|---|
| `AXIOM_AVALANCHE_MAINNET_BYTECODE_VERIFICATION.md` | Phase B | ✓ Complete |
| `AXIOM_AVALANCHE_MAINNET_WIRING_VERIFICATION.md` | Phase C | ✓ Complete |
| `AXIOM_AVALANCHE_MAINNET_POST_DEPLOY_RISK_REGISTER.md` | Phase D | ✓ Complete |
| `AXIOM_AVALANCHE_POST_LAUNCH_STATUS.md` | Phase E | ✓ Complete |
| `AXIOM_AVALANCHE_SNOWTRACE_VERIFICATION_CHECKLIST.md` | Phase F | ✓ Complete |
| `AXIOM_AVALANCHE_MAINNET_POST_LAUNCH_VERIFICATION_REPORT.md` | Phase H | ✓ This document |
| `scripts/deploy/avalanche/verify-mainnet-onchain.ts` | Phase B/C | ✓ Reusable script |

---

*Axiom Protocol Internal — Post-Launch Verification 2026-05-14*

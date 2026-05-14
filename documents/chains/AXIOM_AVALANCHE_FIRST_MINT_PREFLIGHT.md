# Axiom Protocol — Avalanche First Mint Preflight

**Document type:** Phase A — Pre-Mint Verification  
**Network:** Avalanche C-Chain Mainnet (chainId 43114)  
**Created:** 2026-05-14  
**Pilot mode:** LIMITED PILOT MODE — ACTIVE  

---

## Pre-Mint Parameters

| Parameter | Value |
|---|---|
| Recipient | `0x8d7892CF226B43d48B6e3ce988A1274e6D114C96` (operator wallet) |
| Jurisdiction | United States (840) |
| Mint amount | 100.000000 AXUSD |
| Single-wallet cap | 1,000 AXUSD |
| Pilot total cap | 2,500 AXUSD |
| Cumulative before | 0.000000 AXUSD |
| Cumulative after | 100.000000 AXUSD |
| Cap remaining after | 2,400.000000 AXUSD |

---

## Pre-Flight Checklist Results

| Check | Expected | Result | Pass |
|---|---|---|---|
| chainId | 43114 | 43114 | ✓ |
| AxiomStable3643 address | `0x5Cd7c15C32e0630239eDE74241Ad65f3302BcAF8` | matches AVALANCHE_CONTRACTS | ✓ |
| totalSupply | 0 AXUSD | 0.000000 AXUSD | ✓ |
| paused | false | false | ✓ |
| MINTER_ROLE held by operator | true | true | ✓ |
| DEFAULT_ADMIN held by operator | true | true | ✓ |
| IR agent role held | true | true | ✓ |
| G02 US-840 allowed | true | true | ✓ |
| G02 UK-826 blocked | false | false | ✓ |
| G07 transfer limit | 5,000 AXUSD/day | 5000.000000 | ✓ |
| Claim topics | [] (empty) | 0 topics | ✓ |
| CountryAllowModule bound | true | true | ✓ |
| TransferLimitModule bound | true | true | ✓ |
| MC → token correct | AxiomStable3643 | correct | ✓ |
| Mint ≤ single-wallet cap | ≤ 1,000 AXUSD | 100 ≤ 1000 | ✓ |
| Supply + mint ≤ pilot cap | ≤ 2,500 AXUSD | 100 ≤ 2500 | ✓ |

**All 16 pre-flight checks: PASS**

---

## Identity Registration Note

The IdentityRegistry was empty at time of first mint. The recipient wallet  
(`0x8d7892CF226B43d48B6e3ce988A1274e6D114C96`) was registered as its own  
identity with country code 840 (US) using `registerIdentity(wallet, wallet, 840)`.

With `ClaimTopicsRegistry.getClaimTopics() = []` (no required claim topics),  
`isVerified(wallet)` returns `true` immediately after registration.

This is the correct behavior for a fresh compliance stack with no trusted issuers  
configured yet. The country gate enforces jurisdiction; the transfer cap enforces  
daily limits. No additional claim issuance is required at pilot launch.

---

## Baseline Reconciliation (Before Mint)

| Metric | Value |
|---|---|
| totalSupply before | 0.000000 AXUSD |
| Recipient balance before | 0.000000 AXUSD |
| Cumulative pilot minted | 0.000000 AXUSD |
| Cap remaining | 2,500.000000 AXUSD |
| Block (preflight) | 85379916 |
| Timestamp | 2026-05-14 UTC |

---

## Verdict

**PREFLIGHT: PASS — Proceed to mint.**

All caps, roles, compliance modules, and identity requirements satisfied.  
Accepted-risk record signed 2026-05-14. Pilot mode ACTIVE.

---

*Axiom Protocol Internal — First Mint Preflight — 2026-05-14*

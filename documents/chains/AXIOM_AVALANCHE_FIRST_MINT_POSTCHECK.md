# Axiom Protocol — Avalanche First Mint Post-Check

**Document type:** Phase D — Post-Mint Verification  
**Network:** Avalanche C-Chain Mainnet (chainId 43114)  
**Created:** 2026-05-14  
**Status:** VERIFIED — ALL CHECKS PASS  

---

## Identity Registration Transaction

| Field | Value |
|---|---|
| Tx hash | `0x6cb5471eb7c0704bca69d53615314de5050a04a0053aafb039bdb2ffb8d75169` |
| Action | `registerIdentity(wallet, wallet, 840)` |
| Registrant | `0x8d7892CF226B43d48B6e3ce988A1274e6D114C96` |
| Identity contract | `0x8d7892CF226B43d48B6e3ce988A1274e6D114C96` (self — pilot mode) |
| Country | 840 (United States) |
| Block | 85380049 |
| Receipt status | 1 (success) |
| isVerified after | true |
| Explorer | https://snowtrace.io/tx/0x6cb5471eb7c0704bca69d53615314de5050a04a0053aafb039bdb2ffb8d75169 |

**Identity note:** ClaimTopicsRegistry has 0 required topics and 0 trusted issuers.  
T-REX `isVerified()` returns true for any registered wallet when claim topics = [].  
Country gate (840 only) and transfer limit (5,000/day) remain enforced by compliance modules.

---

## Mint Transaction

| Field | Value |
|---|---|
| Tx hash | `0x4eae11395b76da739df8e74a8b15ba984a79b13636b19f6d6f8b649a4574432a` |
| Block | 85380054 |
| Receipt status | 1 (success) |
| Operator | `0x8d7892CF226B43d48B6e3ce988A1274e6D114C96` |
| Recipient | `0x8d7892CF226B43d48B6e3ce988A1274e6D114C96` |
| Amount | 100.000000 AXUSD |
| Function | `mint(address, uint256)` |
| Explorer | https://snowtrace.io/tx/0x4eae11395b76da739df8e74a8b15ba984a79b13636b19f6d6f8b649a4574432a |

---

## Post-Mint Verification Checks

| Check | Expected | Actual | Pass |
|---|---|---|---|
| Receipt status | 1 | 1 | ✓ |
| Supply delta | +100.000000 AXUSD | +100.000000 AXUSD | ✓ |
| Recipient balance delta | +100.000000 AXUSD | +100.000000 AXUSD | ✓ |
| totalSupply after | 100.000000 AXUSD | 100.000000 AXUSD | ✓ |
| Pilot cap not breached | ≤ 2,500 AXUSD | 100 ≤ 2500 | ✓ |
| Wallet cap not breached | ≤ 1,000 AXUSD | 100 ≤ 1000 | ✓ |
| Transfer event from zero | present | ✓ found | ✓ |

**All 7 post-mint checks: PASS**

---

## Supply State Summary

| Metric | Before | After |
|---|---|---|
| totalSupply | 0.000000 AXUSD | 100.000000 AXUSD |
| Recipient balance | 0.000000 AXUSD | 100.000000 AXUSD |
| Cumulative pilot minted | 0.000000 AXUSD | 100.000000 AXUSD |
| Pilot cap remaining | 2,500.000000 AXUSD | 2,400.000000 AXUSD |
| Single-wallet remaining | 1,000.000000 AXUSD | 900.000000 AXUSD |

---

## Stop-Condition Check

| Condition | Status |
|---|---|
| totalSupply ≤ 2,500 AXUSD | CLEAR — 100/2500 (4%) |
| No wallet > 1,000 AXUSD | CLEAR — 100/1000 (10%) |
| No transfer cap breach | CLEAR — no transfers yet |
| Compliance modules active | CLEAR — CAM + TLM bound |
| Jurisdiction gate active | CLEAR — US-840 only |
| No unexpected behavior | CLEAR |
| No security incident | CLEAR |

**Stop condition status: NONE TRIGGERED**

---

## Blockchain References

- Identity registration: https://snowtrace.io/tx/0x6cb5471eb7c0704bca69d53615314de5050a04a0053aafb039bdb2ffb8d75169
- Mint transaction: https://snowtrace.io/tx/0x4eae11395b76da739df8e74a8b15ba984a79b13636b19f6d6f8b649a4574432a
- Contract: https://snowtrace.io/address/0x5Cd7c15C32e0630239eDE74241Ad65f3302BcAF8

---

## Verdict

**FIRST AVALANCHE PILOT MINT — POST-CHECK COMPLETE**

All pre-flight, execution, and post-mint verification checks passed.  
No stop conditions triggered. Pilot cap remaining: 2,400 AXUSD / 2,500 AXUSD.  
Pilot mode remains: **LIMITED PILOT MODE — ACTIVE**

---

*Axiom Protocol Internal — First Mint Post-Check — 2026-05-14*

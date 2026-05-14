# Axiom Protocol — Avalanche Limited Pilot Ledger

**Document type:** Operational Pilot Ledger  
**Network:** Avalanche C-Chain Mainnet (chainId 43114)  
**Version:** 1.1.0  
**Created:** 2026-05-14  
**Updated:** 2026-05-14  
**Status:** ACTIVE — 1 mint executed

---

## Pilot Parameters

| Parameter | Value |
|---|---|
| Total mint cap | 2,500 AXUSD |
| Single-wallet cap | 1,000 AXUSD |
| Transfer cap (on-chain) | 5,000 AXUSD / wallet / day |
| Jurisdiction | US only (code 840) |
| Minting authority | Operator-controlled only |
| Chain | Avalanche C-Chain mainnet (43114) |

---

## Starting State

| Field | Value | Recorded by | Timestamp (UTC) |
|---|---|---|---|
| totalSupply at pilot open | 0.000000 AXUSD | Operator | 2026-05-14T03:07:19Z |
| Block at pilot open | 85380043 | Operator | 2026-05-14T03:07:19Z |
| Accepted-risk signatures | SIGNED — all 3 | Operator | 2026-05-14 |
| Reconciliation result | CLEAN | Operator | 2026-05-14T03:07:19Z |

---

## Mint Ledger

Each row represents one minting event. All fields are required. Do not leave rows incomplete.

| # | Date/Time (UTC) | Participant Wallet | Jurisdiction Verified | Mint Amount (AXUSD) | Tx Hash | Supply Before | Supply After | Cumulative Minted | Recon Result | Operator |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | 2026-05-14T03:07:29Z | `0x8d7892CF226B43d48B6e3ce988A1274e6D114C96` | US (840) ✓ | 100.000000 | `0x4eae11395b76da739df8e74a8b15ba984a79b13636b19f6d6f8b649a4574432a` | 0.000000 | 100.000000 | 100.000000 | CLEAN | AXIOM-OP |

---

## Cumulative Summary

| Metric | Current Value |
|---|---|
| Total mints executed | 1 |
| Total AXUSD minted | 100.000000 AXUSD |
| Remaining cap | 2,400.000000 AXUSD |
| Cap utilization | 4.00% |
| Last reconciliation result | CLEAN — 2026-05-14 |
| Unresolved anomalies | 0 |

---

## Participant Registry

Pre-approved participants must be registered here before any mint to their wallet.

| Wallet | Jurisdiction | Approval Date | Approved by | Max Mint | Notes |
|---|---|---|---|---|---|
| `0x8d7892CF226B43d48B6e3ce988A1274e6D114C96` | US (840) | 2026-05-14 | AXIOM-OP | 1,000 AXUSD | Operator wallet — first pilot mint. Identity registered block 85380049. |

---

## Identity Registration Log

| # | Date (UTC) | Wallet | Identity Address | Country | Tx Hash | Block |
|---|---|---|---|---|---|---|
| 1 | 2026-05-14T03:07:22Z | `0x8d7892CF226B43d48B6e3ce988A1274e6D114C96` | `0x8d7892CF226B43d48B6e3ce988A1274e6D114C96` | 840 (US) | `0x6cb5471eb7c0704bca69d53615314de5050a04a0053aafb039bdb2ffb8d75169` | 85380049 |

---

## Anomaly Log

Record any reconciliation discrepancies, stop-condition triggers, or unusual events here.

| Date/Time (UTC) | Type | Description | Resolution | Operator |
|---|---|---|---|---|
| [None] | — | — | — | — |

---

## Daily Reconciliation Log

| Date | On-Chain Supply | Capinfra Auth | Discrepancy | Result | Operator |
|---|---|---|---|---|---|
| 2026-05-14 | 100.000000 AXUSD | — (manual pilot) | 0 | CLEAN | AXIOM-OP |

---

## Pilot Status

**Current status:** ACTIVE — 1 mint executed, 4% of cap utilized.

**Cap tracking:**
- Cumulative minted: 100.000000 AXUSD
- Remaining: 2,400.000000 AXUSD
- Utilization: 4.00% of 2,500 AXUSD pilot cap
- Pilot expiry: 2026-08-12 (90 days) or cap/stop-condition trigger

**Next required actions:**
- Daily monitoring of on-chain supply vs. pilot caps
- Update this ledger within 30 minutes of each subsequent mint
- Run reconciliation script after each mint

---

## Ledger Integrity Notes

- This ledger must be updated within 30 minutes of each mint event
- No mint row may be retroactively removed or edited — append-only
- Discrepancies or corrections must be noted in the Anomaly Log, not by editing prior rows
- The ledger is a primary audit record and subject to the same controls as financial records

---

*Axiom Protocol Internal — Pilot Ledger v1.1.0 — Updated 2026-05-14*

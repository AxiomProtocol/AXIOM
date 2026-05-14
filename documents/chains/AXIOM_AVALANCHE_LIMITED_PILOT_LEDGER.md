# Axiom Protocol — Avalanche Limited Pilot Ledger

**Document type:** Operational Pilot Ledger  
**Network:** Avalanche C-Chain Mainnet (chainId 43114)  
**Version:** 1.0.0  
**Created:** 2026-05-14  
**Status:** INITIALIZED — awaiting first pilot mint  

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
| totalSupply at pilot open | [TO BE RECORDED] | __________ | __________________ |
| Block at pilot open | [TO BE RECORDED] | __________ | __________________ |
| Capinfra authorized supply | [TO BE RECORDED] | __________ | __________________ |
| Reconciliation result | [TO BE RECORDED] | __________ | __________________ |
| Accepted-risk signatures | PENDING | __________ | __________________ |

---

## Mint Ledger

Each row represents one minting event. All fields are required. Do not leave rows incomplete.

| # | Date/Time (UTC) | Participant Wallet | Jurisdiction Verified | Mint Amount (AXUSD) | Tx Hash | Supply Before | Supply After | Cumulative Minted | Recon Result | Operator |
|---|---|---|---|---|---|---|---|---|---|---|
| — | [No mints yet — pilot not yet open] | — | — | — | — | 0 | 0 | 0 | — | — |

---

## Cumulative Summary

| Metric | Current Value |
|---|---|
| Total mints executed | 0 |
| Total AXUSD minted | 0 |
| Remaining cap | 2,500 AXUSD |
| Cap utilization | 0% |
| Last reconciliation result | PENDING (no mints yet) |
| Unresolved anomalies | 0 |

---

## Participant Registry

Pre-approved participants must be registered here before any mint to their wallet.

| Wallet | Jurisdiction | Approval Date | Approved by | Max Mint | Notes |
|---|---|---|---|---|---|
| [No participants registered yet] | — | — | — | — | — |

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
| [Pilot not yet open] | — | — | — | — | — |

---

## Pilot Status

**Current status:** INITIALIZED — awaiting accepted-risk signatures and first pre-mint checklist completion.

**Next required action:** Complete Section 1 of `AXIOM_AVALANCHE_LIMITED_PILOT_CHECKLIST.md` before any minting.

---

## Ledger Integrity Notes

- This ledger must be updated within 30 minutes of each mint event
- No mint row may be retroactively removed or edited — append-only
- Discrepancies or corrections must be noted in the Anomaly Log, not by editing prior rows
- The ledger is a primary audit record and subject to the same controls as financial records

---

*Axiom Protocol Internal — Pilot Ledger v1.0.0 — 2026-05-14*

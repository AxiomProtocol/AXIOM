# AXAG Silver Infrastructure — DRAFT CONTRACTS

> **STATUS: NOT FOR DEPLOYMENT**
> AXAG is not live and is not issued.
> These files are architectural design sketches only. No contract in this directory
> has been deployed to any mainnet or testnet. No deploy script in `scripts/` targets them.

---

## Purpose

This directory contains the on-chain infrastructure substrate for the Axiom Protocol's
planned silver integration. Two paths are designed here:

### Path A — Silver Sleeve Inside AXAU (Preferred)

Add silver (KAG) as a second reserve sleeve inside the existing AXAU multi-commodity
basket. AXAU holders gain silver backing without a new token, new audit surface, or
new disclosure flip. This is the Phase 2 design target per `lib/axau/spec.ts`.

**Contracts required:**
- `AXSilverVault.sol` — holds KAG in the AXAU reserve (new instance, no code changes)
- `XagPerGramOracle.sol` — converts Chainlink XAG/USD (troy oz) to per-gram price
- Existing `CommodityRegistry.sol`, `NAVEngine.sol`, `MintRedeemController.sol` — new instances, no changes

**Contracts NOT required for Path A:**
- `AXAGTokenLite3643.sol` — not needed; AXAU is the token

### Path B — Standalone AXAG Wrapper Token

Issue a separate `AXAG` ERC-3643 token with KAG as its reserve. Additional gates apply
(KMS Labs ToS for wrapping, wrapper-token legal opinion, dedicated audit). Not the
current design target.

**Contracts required (Path B only):**
- `AXAGTokenLite3643.sol`
- `AXSilverVault.sol`
- `XagPerGramOracle.sol`
- Separate instances of `CommodityRegistry`, `NAVEngine`, `MintRedeemController`

---

## Deployment Gates (all must be closed before any mainnet deployment)

| ID    | Gate                                        | Status      | Owner      |
|-------|---------------------------------------------|-------------|------------|
| G-01  | AXM governance vote — silver admission      | REQUIRED    | AXM DAO    |
| G-02  | Legal opinion — KAG as reserve instrument   | REQUIRED    | Legal team |
| G-03  | KMS Labs ToS — KAG wrapping/vault use (KIN-03) | REQUIRED | KMS Labs  |
| G-04  | KAG on Arbitrum One or bridge decision (KIN-02) | REQUIRED | Engineering|
| G-05  | External audit — AXSilverVault + XagPerGramOracle | REQUIRED | Auditor  |
| G-06  | Reserve KAG acquired, ready to deposit      | REQUIRED    | Treasury   |
| G-07  | Coordinated disclosure flip (all 18 surfaces) | REQUIRED  | Operations |

Tracking document: `documents/commodities/AXAG_STAGE_2_EVIDENCE_TRACKER.md`

---

## File Inventory

| File                       | Role                              | Changes from AXAU analogue           |
|----------------------------|-----------------------------------|--------------------------------------|
| `AXAGTokenLite3643.sol`    | Standalone AXAG token (Path B)    | Name/symbol only                     |
| `AXSilverVault.sol`        | KAG reserve vault (Paths A and B) | Error prefix + `silverSnapshot()`    |
| `XagPerGramOracle.sol`     | Gram-price oracle wrapper          | New logic (no analogue in AXAU)      |
| `README.md`                | This file                         | —                                    |
| `DEPLOYMENT_PLAYBOOK.md`   | Step-by-step deployment guide      | —                                    |

---

## Compilation Note

Hardhat compiles all `*.sol` files under `./contracts` (including this directory).
Successful compilation proves syntax correctness but does NOT constitute deployment.
No script in `scripts/` deploys any contract from `drafts/`. Promotion to production
requires a deliberate new deploy script pointing at the approved contract names.

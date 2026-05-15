# Axiom Protocol — Polygon First Mainnet Transfer Ledger

**Document type:** Phase B Baseline Reconciliation & Transfer Ledger  
**Phase:** Polygon Phase 5 — First Controlled Mainnet USDC Transfer  
**Created:** 2026-05-15T00:14:43.911Z  
**Status:** BASELINE RECORDED — Transfer has not yet executed

---

## 1. Pre-Transfer Baseline (recorded before any transfer)

### On-Chain State

| Field | Value |
|---|---|
| Network | Polygon PoS mainnet |
| chainId | 137 |
| Block number | 86,893,965 |
| Block timestamp UTC | 2026-05-15T00:15:47.000Z |
| USDC contract | `0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359` |
| USDC decimals | 6 |

### Sender Wallet

| Field | Value |
|---|---|
| Address | `0x8d7892CF226B43d48B6e3ce988A1274e6D114C96` |
| POL balance | 97.275095171308355 POL |
| USDC balance | 0.000000 USDC (0 raw units) |
| Role | Deployer / Polygon Treasury |

### Recipient Wallet

| Field | Value |
|---|---|
| Address | `0x8d7892CF226B43d48B6e3ce988A1274e6D114C96` |
| USDC balance | 0.000000 USDC (0 raw units) |
| Note | Same wallet as sender for this controlled first transfer |

### Capinfra DB State

| Field | Value |
|---|---|
| `USDC-POLYGON` in cap_assets | `ast_LccGNrsj0aMzdef0iJRLpQ` — ACTIVE |
| Polygon custody wallet | `13d8e4db-5b84-4d20-9e3e-534c15942163` — configured |
| Polygon settlement instructions (total) | 0 — none previously dispatched |
| Last POLYGON settled_at | null — no prior POLYGON settlements |

### Reconciliation Status

| Field | Value |
|---|---|
| Reconciliation run | BLOCKED — `POLYGON_RPC_URL` was not set as explicit env var |
| Fix applied | `POLYGON_RPC_URL` set in shared environment 2026-05-15 |
| Post-fix reconciliation | See Section 3 |

---

## 2. Transfer Intent (pending wallet funding)

| Field | Value |
|---|---|
| settlementType | POLYGON |
| asset | USDC-POLYGON |
| actionType | TRANSFER |
| amount | 0.000001 USDC (1 raw unit) |
| sender | `0x8d7892CF226B43d48B6e3ce988A1274e6D114C96` |
| recipient | `0x8d7892CF226B43d48B6e3ce988A1274e6D114C96` |
| USDC contract | `0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359` |
| chainId | 137 |
| Blocker | Sender has 0 USDC — must be funded before execution |

---

## 3. Reconciliation Result (post POLYGON_RPC_URL fix)

| Field | Value |
|---|---|
| Run timestamp | 2026-05-15T00:16:12.114Z |
| Network | MAINNET (chainId 137) |
| Treasury wallet | `0x8d7892CF226B43d48B6e3ce988A1274e6D114C96` |
| On-chain USDC balance | 0.000000 USDC |
| Capinfra net movements | 0 (no settled POLYGON instructions) |
| Discrepancy | 0.000000 USDC |
| **Status** | **CLEAN ✓** |
| Report file | `documents/operations/reconciliation-reports/polygon-2026-05-15.json` |
| POLYGON_RPC_URL fix | Set in shared env — reconciliation unblocked |

---

## 4. Post-Transfer Entry (to be filled after execution)

| Field | Value |
|---|---|
| txHash | PENDING |
| Block number (post) | PENDING |
| Sender USDC delta | PENDING |
| Recipient USDC delta | PENDING |
| POL gas used | PENDING |
| Instruction ID | PENDING |
| Instruction status | PENDING |
| Settlement called at | PENDING |
| Final status | PENDING |

---

*Axiom Protocol Internal — Polygon First Mainnet Transfer Ledger — 2026-05-15*  
*Baseline recorded. Transfer execution pending wallet funding.*

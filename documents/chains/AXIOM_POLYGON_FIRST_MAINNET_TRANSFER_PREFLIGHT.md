# Axiom Protocol — Polygon First Mainnet Transfer Preflight

**Document type:** Phase A Pre-Transfer Verification  
**Phase:** Polygon Phase 5 — First Controlled Mainnet USDC Transfer  
**Run date:** 2026-05-15T00:14:43.911Z  
**Block at check:** 86,893,965  
**Status:** BLOCKED — sender wallet has 0 USDC on Polygon mainnet

---

## 1. Environment Gate Verification

| Variable | Expected | Actual | Result |
|---|---|---|---|
| `CHAIN_POLYGON_ENABLED` | `true` | `true` | PASS ✓ |
| `POLYGON_ADAPTER_MODE` | `LIVE` | `LIVE` | PASS ✓ |
| `MULTICHAIN_ENABLED` | `true` | `true` | PASS ✓ |
| `POLYGON_ADAPTER_LIVE_ALLOWLIST` | `USDC-POLYGON` (scoped) | `USDC-POLYGON` | PASS ✓ |
| `POLYGON_TREASURY_WALLET` | valid `0x…` | `0x8d7892CF226B43d48B6e3ce988A1274e6D114C96` | PASS ✓ |
| `ALCHEMY_API_KEY` | SET | SET | PASS ✓ |
| `DEPLOYER_PRIVATE_KEY` | SET | SET | PASS ✓ |

---

## 2. RPC and Chain Verification

| Check | Expected | Actual | Result |
|---|---|---|---|
| RPC endpoint | Polygon mainnet | `polygon-mainnet.g.alchemy.com` | PASS ✓ |
| chainId | 137 | 137 | PASS ✓ |
| USDC contract | `0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359` | `0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359` | PASS ✓ |
| USDC symbol | USDC | USDC | PASS ✓ |
| USDC decimals | 6 | 6 | PASS ✓ |

---

## 3. Wallet Verification

| Check | Value | Result |
|---|---|---|
| Sender address | `0x8d7892CF226B43d48B6e3ce988A1274e6D114C96` | PASS ✓ |
| Sender POL (gas) | 97.275095171308355 POL | PASS ✓ |
| **Sender USDC balance** | **0.000000 USDC (0 raw)** | **FAIL ✗ — BLOCKER** |
| Recipient address | `0x8d7892CF226B43d48B6e3ce988A1274e6D114C96` | PASS ✓ (valid `0x…`) |
| Recipient USDC balance | 0.000000 USDC (0 raw) | N/A (same wallet as sender) |

---

## 4. Database Record Verification

| Check | Value | Result |
|---|---|---|
| `cap_assets` USDC-POLYGON | id: `ast_LccGNrsj0aMzdef0iJRLpQ`, status: ACTIVE | PASS ✓ |
| `custody_wallet_registry` | `Axiom Polygon Treasury (Deployer)`, chain=polygon, status=configured | PASS ✓ |
| Existing Polygon instructions | 0 (none previously dispatched) | PASS ✓ |

---

## 5. Action Type Gate

| Check | Result |
|---|---|
| MINT path enabled on Polygon | NO ✓ — not in allowlist |
| REDEEM path enabled on Polygon | NO ✓ — not in allowlist |
| AXUSD on Polygon | NO ✓ — Arbitrum-canonical only |
| Non-USDC asset in allowlist | NO ✓ — `USDC-POLYGON` only |

---

## 6. Preflight Verdict

```
PHASE A RESULT: BLOCKED

Hard blocker:
  Sender wallet 0x8d7892CF226B43d48B6e3ce988A1274e6D114C96
  USDC balance on Polygon mainnet (chainId 137): 0 raw units
  Required for 0.000001 USDC transfer: minimum 1 raw unit

Action required:
  Fund 0x8d7892CF226B43d48B6e3ce988A1274e6D114C96 with at least
  0.000001 USDC (1 raw unit) on Polygon mainnet before proceeding.

  Sources:
    - Transfer from a funded exchange/wallet via Polygon network
    - Bridge USDC from another chain using Circle CCTP or a DEX bridge
    - Coinbase → withdraw USDC → select Polygon network

  Emergency kill switch: POLYGON_ADAPTER_MODE=DISABLED (not needed — no tx sent)

All other checks: PASS (10/11 gates clear)
```

---

*Axiom Protocol Internal — Polygon First Mainnet Transfer Preflight — 2026-05-15*  
*No transaction has been sent. Transfer blocked pending wallet funding.*

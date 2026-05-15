# Axiom Protocol — Polygon Amoy Activation Guide

**Purpose:** Step-by-step operator guide for running the Polygon Amoy LIVE smoke test  
**Prerequisite:** Task #489 (Phase 5 LIVE dispatch implementation) must be MERGED  
**Created:** 2026-05-14  
**Last preflight run:** 2026-05-14 — see `AXIOM_POLYGON_AMOY_LIVE_SMOKE_REPORT.md`

> This guide enables an operator to complete the final pre-production verification for Polygon PoS LIVE payments. Follow steps in order. Do not skip the dedicated wallet requirement.

---

## Preflight Status (2026-05-14)

| Check | Result |
|---|---|
| Amoy RPC reachable | PASS ✓ — chainId 80002 confirmed via ALCHEMY_API_KEY |
| Deployer address | `0x8d7892CF226B43d48B6e3ce988A1274e6D114C96` |
| Amoy POL balance | PASS ✓ — funded |
| Amoy USDC balance | PASS ✓ — funded |
| `POLYGON_DEPLOYER_PRIVATE_KEY` | **CLEARED ✓** — DEPLOYER_PRIVATE_KEY authorized by operator 2026-05-14 |
| `CHAIN_POLYGON_ENABLED` | **SET ✓** — `true` in shared env |
| `POLYGON_ADAPTER_MODE` | **SET ✓** — `LIVE` in shared env |
| `POLYGON_ADAPTER_LIVE_ALLOWLIST` | **SET ✓** — `USDC-POLYGON` in shared env |
| `USDC-POLYGON` in cap_assets | **DONE ✓** — ast_LccGNrsj0aMzdef0iJRLpQ registered |
| Accepted-risk document | OPERATOR AUTHORIZED — formal 3-party sign-off pending |
| Mainnet RPC (chainId 137) | PASS ✓ — Alchemy Polygon mainnet, 97.275 POL |
| Database | Connected ✓ |
| Invariant H | **PROVEN ×2** — tx1: `0x334935…` tx2: `0xd4f42d…` on chainId=80002 |

**ALL PROGRAMMATIC GATES CLEARED.** Only Gate 1 formal 3-party sign-off on `AXIOM_POLYGON_PHASE5_ACCEPTED_RISK.md` remains before first mainnet LIVE transfer can be dispatched.

---

## Overview

The Polygon Phase 5 adapter (`lib/capinfra/adapters/polygon/dispatcher.ts`) is fully implemented with LIVE dispatch capability. Before enabling Polygon payments in production, a real ERC-20 USDC transfer on the Polygon Amoy testnet must be broadcast, confirmed, and settled via `externallySettleInstruction`.

This guide walks through every step from wallet creation to settlement proof.

---

## Step 0 — Pre-flight check

Before anything else, run the pre-flight script to see exactly what's missing:

```bash
npx tsx scripts/polygon-amoy-preflight.ts
```

The pre-flight will:
- Derive your deployer wallet address from the private key
- Check Amoy RPC connectivity and chainId verification
- Report Amoy POL balance (gas) and USDC balance (transfer source)
- Identify any configuration gaps

---

## Step 1 — Provision a dedicated Amoy test wallet

**Do NOT use the production `DEPLOYER_PRIVATE_KEY` for testnet smoke tests.**  
Create a dedicated test wallet:

```bash
# Using ethers.js (requires Node):
node -e "const {ethers}=require('ethers'); const w=ethers.Wallet.createRandom(); console.log('address:', w.address); console.log('privateKey:', w.privateKey);"

# OR use MetaMask → create new account → export private key
```

Store the private key securely. Never commit it or log it.

---

## Step 2 — Fund the Amoy test wallet

### 2a. Amoy POL (for gas)
- Faucet: https://faucet.polygon.technology/
- Select "Polygon Amoy" and paste your wallet address
- Request at least 0.1 POL (smoke test needs ~0.001 POL)

### 2b. Amoy USDC (for the transfer)
- Faucet: https://faucet.circle.com/
- Select "Polygon Amoy" from the network dropdown
- Request USDC to your wallet address

**Amoy USDC contract (Circle canonical):**
```
0x41E94Eb019C0762f9Bfcf9Fb1E58725BfB0e7582
```

> ⚠ This is NOT the same as the Polygon mainnet USDC address (`0x3c499c542…`).
> The smoke test must use the Amoy-specific contract address.

Verify your balances at:
```
https://amoy.polygonscan.com/address/<YOUR_WALLET_ADDRESS>
```

---

## Step 3 — Set environment variables

In the Replit secrets manager (or `.env` for local testing):

```bash
# Required for Amoy smoke test
POLYGON_AMOY_RPC_URL=https://polygon-amoy.g.alchemy.com/v2/<ALCHEMY_API_KEY>
# (or use the public RPC: https://rpc-amoy.polygon.technology/)

POLYGON_DEPLOYER_PRIVATE_KEY=<dedicated-amoy-test-wallet-private-key>
POLYGON_AMOY_USDC_CONTRACT=0x41E94Eb019C0762f9Bfcf9Fb1E58725BfB0e7582
CHAIN_POLYGON_ENABLED=true
MULTICHAIN_ENABLED=true
POLYGON_ADAPTER_LIVE_ALLOWLIST=USDC-POLYGON
```

After setting secrets, re-run the pre-flight to confirm all checks pass:

```bash
npx tsx scripts/polygon-amoy-preflight.ts
```

---

## Step 4 — Sign the accepted-risk document

All three signatories must sign before LIVE mode is activated in any non-local environment:

```
documents/chains/AXIOM_POLYGON_PHASE5_ACCEPTED_RISK.md
```

Obtain signatures from:
- Technical Lead
- Operations Lead
- Compliance Officer

---

## Step 5 — Register USDC-POLYGON asset in staging DB

Run the asset registration script against the staging database:

```bash
# Set DATABASE_URL to staging DB first
CHAIN_POLYGON_ENABLED=true npx tsx scripts/seed-polygon-usdc-asset.ts
```

This is idempotent — safe to run multiple times.

---

## Step 6 — Run the Amoy LIVE smoke test

```bash
POLYGON_AMOY_RPC_URL=<url> \
POLYGON_DEPLOYER_PRIVATE_KEY=<key> \
POLYGON_AMOY_USDC_CONTRACT=0x41E94Eb019C0762f9Bfcf9Fb1E58725BfB0e7582 \
CHAIN_POLYGON_ENABLED=true \
MULTICHAIN_ENABLED=true \
POLYGON_ADAPTER_LIVE_ALLOWLIST=USDC-POLYGON \
npx tsx scripts/vault-sprint-polygon-amoy.ts
```

Expected invariant H output:
```
✓ H: Amoy LIVE dispatch succeeded: txHash='0x…'
✓ H.mode: receiptJson.mode='LIVE', chainId=80002
✓ H.submitted: receipt.submitted=true → parks at SUBMITTED, no portfolio write
```

The txHash will be a real on-chain transaction. Record it.

---

## Step 7 — Verify on Polygon Amoy explorer

Open the txHash on Amoy PolygonScan:
```
https://amoy.polygonscan.com/tx/<TX_HASH>
```

Confirm:
- Status: Success
- Method: Transfer
- Token: USDC (Amoy)
- From: your deployer wallet
- To: `0x8d7892CF226B43d48B6e3ce988A1274e6D114C96` (smoke test recipient)
- Amount: 0.000001 USDC (1 raw unit)

---

## Step 8 — Call externallySettleInstruction

After on-chain confirmation, call `externallySettleInstruction` to transition the
capinfra instruction from SUBMITTED to SETTLED:

```typescript
import { externallySettleInstruction } from '@/lib/capinfra/settlement';

const result = await externallySettleInstruction({
  instructionId:  '<instruction-id-from-smoke-test>',  // 'si_polygon_amoy_live_smoke'
  externalRef:    '<TX_HASH>',
  settledAt:      new Date(),
  webhookEventId: 'amoy-smoke-manual-settle-001',
  actor:          '<operator-name>',
});

console.log('Status:', result.status); // Expected: 'SETTLED'
```

---

## Step 9 — Record the activation

Update the activation log in `AXIOM_POLYGON_PHASE5_ACCEPTED_RISK.md`:

```
Environment activated:    amoy-testnet
Activated by:             <operator name>
Activation date/time UTC: <ISO timestamp>
Commit hash at activation: <git hash>
Initial LIVE transaction (txHash): <TX_HASH>
Initial reconciliation status:     CLEAN
```

---

## Step 10 — Production readiness checklist

Before enabling Polygon LIVE in production (not just Amoy testnet):

| Gate | Requirement |
|---|---|
| Accepted-risk document | Signed by all 3 signatories |
| Amoy smoke test | txHash confirmed on-chain, SETTLED in DB |
| BitGo Polygon wallet | Provisioned via BitGo CaaS, status='live' in custodyWalletRegistry |
| USDC-POLYGON asset | Registered via seed-polygon-usdc-asset.ts in production DB |
| Polygon custody wallet | Registered via seed-polygon-custody-wallet.ts in production DB |
| POLYGON_TREASURY_WALLET | Set to BitGo custody wallet address |
| Reconciliation cron | scripts/reconcile-polygon-reserve.ts running daily |
| Monitoring | Alerts configured for LIVE Polygon transactions |
| Production env vars | POLYGON_RPC_URL, POLYGON_DEPLOYER_PRIVATE_KEY set in production secrets |

---

## RPC endpoint options

| Provider | Amoy RPC URL | Notes |
|---|---|---|
| Alchemy | `https://polygon-amoy.g.alchemy.com/v2/<API_KEY>` | Use ALCHEMY_API_KEY |
| Public | `https://rpc-amoy.polygon.technology/` | Rate-limited, no auth required |
| Ankr | `https://rpc.ankr.com/polygon_amoy` | Public endpoint |
| QuickNode | `https://<endpoint>.quiknode.pro/<token>/` | Requires QuickNode account |

---

## Troubleshooting

| Error | Cause | Fix |
|---|---|---|
| `chainId=137` from RPC | POLYGON_AMOY_RPC_URL points to mainnet | Update to Amoy endpoint |
| `USDC balance = 0` | Wallet not funded | Run Circle faucet: https://faucet.circle.com/ |
| `insufficient funds for gas` | No Amoy POL | Run Polygon faucet: https://faucet.polygon.technology/ |
| `could not detect network` | RPC URL invalid or offline | Check API key, try public RPC |
| `POLYGON_AMOY_USDC_CONTRACT=0x3c499c…` warning | Using mainnet contract on Amoy | Set `POLYGON_AMOY_USDC_CONTRACT=0x41E94Eb019C0762f9Bfcf9Fb1E58725BfB0e7582` |
| Invariant H skipped | Chain flags not set | Set CHAIN_POLYGON_ENABLED=true + MULTICHAIN_ENABLED=true |

---

*Axiom Protocol Internal — Polygon Amoy Activation Guide — 2026-05-14*  
*This guide is for the Amoy testnet smoke test only. Mainnet production requires additional gates including BitGo wallet provisioning and BitGo CaaS integration.*

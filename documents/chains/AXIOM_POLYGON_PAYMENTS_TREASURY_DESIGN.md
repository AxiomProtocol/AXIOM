# Axiom Protocol — Polygon Payments and Treasury Design

**Document type:** Phase F — Future Payments Design (no build)  
**Phase:** Polygon Phase 3 — Foundation and Architecture  
**Created:** 2026-05-14  
**Status:** DESIGN ONLY — no implementation; no live payments  

---

## 1. Purpose and Scope

This document defines the intended architecture for Polygon-based payments
and treasury routing when Phase 4 build work begins. It is a design document
only. Nothing described here is currently implemented or live.

**What this document is not:**
- A deployment runbook
- An activation guide
- A commitment to any timeline

**What must be built before real payments can happen:**
- Capinfra POLYGON adapter (DRY_RUN mode first)
- `capSettlementTypeEnum` DB migration adding `POLYGON`
- Full reconciliation model and cron
- Staging smoke test on Polygon testnet (Amoy)
- Accepted-risk record for Polygon live mode
- Legal review of Polygon-settled payments
- BitGo or equivalent custody wallet on Polygon

---

## 2. Token Stack

### 2.1 Settlement Token

**Native USDC on Polygon PoS**

```
Token:   USD Coin (native)
Symbol:  USDC
Address: 0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359
Issuer:  Circle (Circle Internet Financial)
Chain:   Polygon PoS mainnet (chainId 137)
```

Native USDC is Circle-issued directly on Polygon. It is not bridge-wrapped.
Circle's Cross-Chain Transfer Protocol (CCTP) supports native USDC redemption
at 1:1 USD. This is the only USDC variant acceptable for Axiom Polygon flows.

**USDC.e (bridged) must not be used.** It carries bridge risk, liquidity
fragmentation risk, and creates accounting ambiguity.

### 2.2 AXUSD on Polygon

No AXUSD contract exists or is planned for Polygon at Phase 3 or Phase 4.
If a future phase proposes AXUSD bridging to Polygon, it requires:
- A separate architectural review and accepted-risk record
- An explicit Arbitrum canonical authority decision
- External audit of any bridge mechanism
- No modification to the Arbitrum AXUSD supply or policy contracts

**Phase 3 and Phase 4 stance: USDC only on Polygon.**

---

## 3. Card / Onramp Funded Flow

### 3.1 Concept

A future card-to-USDC flow on Polygon would allow a user to:
1. Present a debit or credit card (via Stripe or Coinbase Onramp)
2. Receive native USDC directly into a Polygon wallet
3. Use that USDC for Axiom protocol interactions (treasury contribution,
   settlement counterparty, or future AXUSD conversion)

### 3.2 Current Onramp State (Arbitrum)

The current onramp flow (`lib/onramp/`, Coinbase Onramp integration) delivers
USDC to Arbitrum One. Key files:
- `lib/onramp/config.ts` — `ONRAMP_DEFAULT_CHAIN_ID: 42161` (Arbitrum)
- `lib/onramp/sessionService.ts` — session-level onramp logic
- Coinbase Onramp supports both Arbitrum and Polygon PoS natively

### 3.3 What Must Change for Polygon Onramp

| Change | File | Notes |
|---|---|---|
| Chain-aware destination parameter | `lib/onramp/config.ts` | Must gate Polygon behind `CHAIN_POLYGON_ENABLED` |
| Session-level chain selection | `lib/onramp/sessionService.ts` | User or operator selects destination chain |
| Polygon USDC asset entry | `lib/onramp/config.ts` asset list | Add `USDC-POLYGON` entry alongside `USDC-ARB` |
| Reconciliation trigger | New `lib/capinfra/adapters/polygon/` | On successful onramp → capinfra records Polygon instruction |

### 3.4 Safeguards Required

| Safeguard | Implementation |
|---|---|
| Arbitrum default preserved | `ONRAMP_DEFAULT_CHAIN_ID` stays 42161 unless explicitly overridden |
| Polygon onramp gated | Polygon destination only available if `CHAIN_POLYGON_ENABLED=true` |
| No bank account implied | Polygon onramp is card/crypto only — no ACH, no wire, no fiat bank transfer |
| Jurisdiction gate | Onramp to Polygon must pass same compliance pre-check as Arbitrum onramp |

---

## 4. USDC Treasury Movement

### 4.1 Concept

Polygon provides a cost-effective layer for USDC movement between treasury
wallets. Enterprise counterparties, payment recipients, and operational
treasury addresses can receive USDC on Polygon PoS at minimal gas cost.

### 4.2 Flow Model

```
Axiom Control Plane
  → PolicyGuard checks authorization
  → capinfra creates POLYGON settlement instruction (type=POLYGON, status=PENDING)
  → capinfra POLYGON adapter broadcasts USDC transfer on Polygon PoS
  → tx mined → receipt status=1
  → capinfra updates instruction to SUBMITTED
  → reconciliation cron reads on-chain state
  → capinfra externallySettleInstruction called → SETTLED
  → TreasuryLedgerService records net position change
  → Axiom Sentinel sees treasury delta
```

### 4.3 Double-Credit Prevention

The capinfra instruction model already enforces no-double-credit:
- `externallySettleInstruction` is idempotent — second call returns ConflictError
- Instruction ID is unique per operation
- Reconciliation cron checks for duplicate settlement before writing

This is the same model proven in the Avalanche capinfra Gate 5 smoke test
(`AXIOM_AVALANCHE_CAPINFRA_GATE5_REPORT.md`).

### 4.4 Treasury Wallet Requirements

Treasury wallets on Polygon must be:
- Registered in `custodyWalletRegistry` (chain='polygon', provider='bitgo' or equivalent)
- Operated via BitGo CaaS or equivalent custody infrastructure
- Excluded from any public user-facing flows
- Subject to daily reconciliation

---

## 5. AXUSD Settlement Relationship

### 5.1 Current Model

AXUSD is the Axiom internal settlement token on Arbitrum One. All protocol-
internal settlement between capinfra positions, treasury accounts, and lending
markets uses AXUSD on Arbitrum.

### 5.2 Polygon Relationship

Polygon payments settle in native USDC, not AXUSD. The relationship is:

```
USDC (Polygon) → [reconciled by capinfra] → AXUSD equivalent position (Arbitrum)
                                           → TreasuryLedgerService records delta
                                           → Sentinel updates solvency view
```

A Polygon USDC inflow is equivalent to a USDC asset inflow on the Axiom
treasury. The internal ledger records the value in AXUSD terms at the time
of reconciliation (using the AXUSD/USDC peg — assumed 1:1 if AXUSD is pegged).

No USDC→AXUSD swap is required on-chain. The equivalence is a ledger
accounting entry managed by the capinfra reconciliation layer.

### 5.3 What Must Not Happen

- A Polygon USDC inflow must never be counted as an AXUSD mint
- AXUSD totalSupply on Arbitrum must never increase as a result of Polygon receipts
- AXUSD canonical supply is increased only by authorized `mint()` calls on Arbitrum

---

## 6. Reconciliation Back to Canonical Ledger

### 6.1 Reconciliation Architecture

```
For each Polygon USDC movement:

1. Instruction created → capinfra DB
   { id, type: 'POLYGON', assetSymbol: 'USDC-POLYGON', amount, status: 'PENDING' }

2. Broadcast → Polygon chain
   { txHash, block, gasUsed }

3. Instruction updated → SUBMITTED
   { txHash, blockNumber, broadcastAt }

4. Reconciliation cron (daily or post-action):
   a. Read on-chain USDC balance from Polygon RPC
   b. Compare to expected position from capinfra DB
   c. Discrepancy < threshold → CLEAN
   d. Discrepancy ≥ threshold → ANOMALY → alert operator

5. Instruction settled → SETTLED
   { settledAt, reconciledAmount, reconciliationResult }

6. TreasuryLedgerService entry written
   { chain: 'polygon', asset: 'USDC', amount, direction, reconciledAt }
```

### 6.2 Reconciliation Frequency

- After every Polygon movement (post-action reconciliation)
- Daily cron at 00:00 UTC (same model as Avalanche pilot reconciliation)

### 6.3 Reconciliation Script Location (future)

By convention, following the Avalanche pattern:
```
scripts/deploy/polygon/post-action-reconcile.ts  (future — Phase 4)
scripts/reconcile-polygon-reserve.ts              (future — Phase 4)
```

---

## 7. Internal Ledger Impact

### 7.1 New Database Requirements (Phase 4)

| Table/Column | Change | Notes |
|---|---|---|
| `capSettlementTypeEnum` | Add `POLYGON` value | Migration required |
| `custodyWalletRegistry` | New rows with `chain='polygon'` | Operational |
| `capSettlementInstructions` | Polygon instructions use `POLYGON` type | Schema supports |
| `treasuryAccounts` | Polygon USDC wallet entries | If treasury wallet added |

### 7.2 Position Accounting

A Polygon USDC position in the Axiom ledger is:
- An asset position (not a liability)
- Denominated in USDC (not AXUSD)
- Carried at face value (1 USDC = 1.00 USD)
- Subject to the same solvency model as other USDC positions
- Visible in the Axiom Sentinel solvency console as `chain=polygon, asset=USDC`

---

## 8. Fraud / Chargeback / Dispute Boundaries

### 8.1 On-Chain Irreversibility

USDC transfers on Polygon PoS are irreversible once mined. There is no
on-chain chargeback mechanism. Dispute resolution is handled entirely at
the application layer:

| Dispute Type | Resolution Layer | On-Chain? |
|---|---|---|
| Card chargeback (user disputes card charge) | Stripe / Coinbase Onramp — handled by payment processor | NO |
| Incorrect amount sent | Manual reversal via new Polygon USDC transfer | NO (requires new tx) |
| Unauthorized treasury movement | PolicyGuard pre-authorization + post-anomaly detection | NO |
| Fraudulent wallet registration | Compliance pre-check + BitGo custody controls | NO |

### 8.2 What Axiom Controls

- Pre-authorization via `PolicyGuardService` before any Polygon dispatch
- Wallet allowlist — only registered `custodyWalletRegistry` addresses
- Amount caps (set in capinfra policy layer, not on-chain)
- Post-action reconciliation to detect unauthorized movements

### 8.3 What Axiom Does Not Control

- Card disputes after Stripe/Coinbase Onramp processes payment
- Polygon PoS network-level incidents (chain reorg < depth threshold)
- Circle USDC contract upgrades (Circle is the issuer)

---

## 9. No-Bank-Account Language

Polygon-based payments within Axiom Protocol are:

- **Crypto-native settlement only**
- **Not ACH, wire transfer, or bank payout**
- **Not a virtual account, bank account, or depository product**
- **Not FDIC or SIPC insured**
- **Not a money transmission service under US banking law** (pending legal review)

All Polygon flows route crypto assets (USDC) between crypto wallets.
No fiat bank rails are involved on the Polygon side. Card onramp (Stripe/
Coinbase) converts card charges to USDC — the fiat leg is handled by
Stripe or Coinbase, not by Axiom Protocol directly.

Increase (ACH/banking partner) is **not** used on the Polygon path.
Unit (virtual banking) is **not** used on the Polygon path.

---

## 10. What Must Be Built Before Real Payments

| Requirement | Phase | Notes |
|---|---|---|
| Capinfra POLYGON adapter — DRY_RUN | Phase 4 | Pattern: Avalanche adapter |
| DB migration: add POLYGON to capSettlementTypeEnum | Phase 4 | Drizzle migration |
| Polygon testnet (Amoy) smoke test | Phase 4 | Prove DRY_RUN and LIVE paths |
| Full reconciliation model + cron | Phase 4 | Daily + post-action |
| BitGo Polygon treasury wallet | Phase 4 | Or approved custody equivalent |
| Accepted-risk record for Polygon LIVE mode | Phase 4 | Signed before any LIVE dispatch |
| Legal review of Polygon payment flows | Phase 4 | Before any user-facing flows |
| Staging environment with CHAIN_POLYGON_ENABLED=true | Phase 4 | Isolated staging only |

---

## 11. What Is NOT in Scope (Ever, Unless Separately Approved)

| Out of Scope | Reason |
|---|---|
| AXUSD issuance on Polygon | Arbitrum canonical — separate architecture review required |
| AXAU on Polygon | Reserve layer stays Arbitrum + Ethereum |
| ACH from Polygon | Increase is ACH partner — not Polygon |
| Banking rails on Polygon | No banking rails in this design |
| Canonical identity on Polygon | Arbitrum ERC-3643 is canonical |
| Governance on Polygon | Arbitrum governance contracts |
| DePIN or land registry on Polygon | Arbitrum infrastructure layer |

---

*Axiom Protocol Internal — Polygon Payments and Treasury Design — 2026-05-14*  
*Design document only. No implementation. No live payments. Arbitrum canonical.*

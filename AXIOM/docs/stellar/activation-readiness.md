# Stellar Payments Rail — Activation Readiness Report
**Generated:** 2026-04-05  
**Status:** READY FOR DRY-RUN TESTING — MoneyGram anchor fully wired

---

## Summary

The Axiom Stellar Payments Rail has been refactored from its original broken configuration (Centre/Circle USDC issuer — no SEP-24 endpoint) to a fully env-driven anchor selection system. MoneyGram is the primary production anchor, validated live.

---

## Critical Finding (Previous Session)

| | Previous | Current |
|---|---|---|
| Home domain | `centre.io` | `stellar.moneygram.com` |
| Has SEP-24 | NO | YES |
| Has WEB_AUTH | NO | YES |
| SEP-24 /info | — | Returns `USDC` |
| USDC Issuer Match | YES (issuer was correct) | YES (same issuer) |
| Network | — | Mainnet |

**Root cause:** `centre.io` is the USDC issuer domain only — Circle/Centre does not operate a SEP-24 interactive anchor. MoneyGram operates their own dedicated Stellar anchor at `stellar.moneygram.com`.

---

## Anchor Discovery Results (10 anchors probed)

| Rank | Anchor | Score | Status |
|------|--------|-------|--------|
| 1 | MoneyGram (Stellar Access) | 100/100 | **ACTIVE** |
| 2 | SDF Test Anchor | 71/100 | Testnet only |
| 3 | Anclap | 58/100 | LATAM reserve |
| 4 | MyKobo | 49/100 | Europe reserve |
| 5 | Ultra Stellar | 44/100 | Insufficient docs |
| — | Bitso | INVALID | No public toml |
| — | Tempo | INVALID | Domain unreachable |
| — | Cowrie | INVALID | No SEP-24 |
| — | Stronghold | INVALID | No SEP-24 |
| — | Centre.io | INVALID | Issuer only, no SEP-24 |

---

## MoneyGram — Validated Configuration

```
Home Domain:              stellar.moneygram.com
Network Passphrase:       Public Global Stellar Network ; September 2015
TRANSFER_SERVER_SEP0024:  https://stellar.moneygram.com/stellaradapterservice/sep24
WEB_AUTH_ENDPOINT:        https://stellar.moneygram.com/stellaradapterservice/auth
USDC Issuer:              GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN
Anchor Asset:             USD (fiat)
Latency (3-round avg):    95ms
SEP-24 /info USDC:        CONFIRMED
SEP-10 Challenge:         HTTP 400 (expected — requires valid Stellar account)
```

---

## Code Changes Made

### 1. `lib/multichain/stellar/types.ts`
- `ANCHOR_CANDIDATES` replaced: MoneyGram is now `evaluationStatus: 'integrated'`; Circle marked as `circle-issuer` (not a SEP-24 anchor)
- `STELLAR_PLANNED_CORRIDORS` updated: `anchorId` changed from `circle-stellar` → `moneygram-stellar`; MXN corridor replaced with ARS via Anclap
- New `STELLAR_ANCHOR_REGISTRY` added: 5 anchors keyed by `STELLAR_ACTIVE_ANCHOR` env var
- `STELLAR_SEP_CAPABILITIES` updated to reflect MoneyGram (not Circle)

### 2. `lib/multichain/stellar/StellarPaymentAdapter.ts`
- Removed `CIRCLE_HOME_DOMAIN = 'centre.io'` hardcode
- Added `getActiveAnchorEntry()` / `getActiveAnchorId()` / `getActiveAnchorHomeDomain()` helpers
- `fetchCircleToml()` now fetches from the **active anchor's** home domain (not `centre.io`)
- TOML cache keyed by domain — invalidates automatically on anchor switch
- `getAnchorStatus()` now supports any registered anchor, not just `circle-stellar`
- `initiatePayment()` error messages reference active anchor by domain
- DB insert uses `getActiveAnchorId()` instead of hardcoded `circle-stellar`

### 3. `pages/api/stellar/health.ts`
- Active anchor resolved from `STELLAR_ACTIVE_ANCHOR` env var (default: `moneygram`)
- `selectedAnchor` and `activeAnchorKey` fields added to response

### 4. `pages/api/stellar/anchor/info.ts`
- Validation now checks `STELLAR_ANCHOR_REGISTRY` (not hardcoded `circle-stellar`)
- Falls back to active anchor if no `anchorId` query param
- Returns `registryEntry` with full endpoint configuration

### 5. `pages/stellar-payments.tsx`
- Section heading now shows live `anchor.anchorName`
- Home domain display changed to `stellar.moneygram.com`
- Anchor name in corridors table: MoneyGram, Anclap display names

### 6. `shared/stellarSchema.ts`
- Default `anchorId` column value: `circle-stellar` → `moneygram-stellar`

---

## Live Endpoint Verification

```
GET /api/stellar/health           → 200 OK
  anchorId: moneygram-stellar
  anchorName: MoneyGram (Stellar Access)
  isReachable: true
  sep24Supported: true
  TRANSFER_SERVER_SEP0024: https://stellar.moneygram.com/stellaradapterservice/sep24

GET /api/stellar/corridors        → 200 OK
  3 corridors: USD (available), USDC (available), ARS (anchor_pending)
  anchorId: moneygram-stellar for USD/USDC corridors

GET /api/stellar/anchor/info      → 200 OK
  registryEntry: full MoneyGram config
  sep24Info: USDC asset returned from MoneyGram SEP-24 /info

SEP-24 /info endpoint             → USDC (confirmed live)
SEP-10 challenge endpoint         → HTTP 400 (expected — account doesn't exist on-chain)
Stellar Horizon                   → Ledger 61986867, latency 294ms
```

---

## Activation Blockers

| Blocker | Severity | Notes |
|---------|----------|-------|
| `STELLAR_ACTIVE_ANCHOR` not set | LOW | Defaults to `moneygram` if absent |
| MoneyGram Access partnership | MEDIUM | Required for production USD payout; SEP-24 interactive URL will be generated but KYC/settlement requires MoneyGram account |
| `ENABLE_STELLAR_PAYMENTS_RAIL` = false | LOW | Feature flag currently `false`; must be set to `true` in DB |

---

## Env-Driven Anchor Switching

Set `STELLAR_ACTIVE_ANCHOR` to switch anchors without code changes:

| Value | Anchor | Use Case |
|-------|--------|----------|
| `moneygram` (default) | MoneyGram | Production — USDC→USD |
| `testanchor` | SDF Test Anchor | Staging/integration (testnet) |
| `anclap` | Anclap | LATAM ARS/PEN expansion |
| `mykobo` | MyKobo | Europe EUR expansion |

---

## Output Files

- `docs/stellar/anchor-candidates.json` — All 10 anchors investigated
- `docs/stellar/anchor-validation-report.json` — Full validation data with latency
- `docs/stellar/anchor-ranking.json` — Scored ranking 0–100
- `docs/stellar/activation-readiness.md` — This document

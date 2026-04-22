# Polygon — API Surfaces

**Status:** Not yet reviewed or integrated.

---

## 1. Polygon RPC (EVM Standard JSON-RPC)

Since Polygon PoS is EVM-compatible, the standard Ethereum JSON-RPC API applies.

### Alchemy Polygon Endpoint
```
https://polygon-mainnet.g.alchemy.com/v2/{ALCHEMY_API_KEY}
```

**Key methods:**
- `eth_getBalance` — MATIC balance
- `eth_call` — Read contract state
- `eth_sendRawTransaction` — Submit signed transactions
- `eth_getTransactionReceipt` — Confirm transaction finality
- `eth_getLogs` — Event log queries

**Axiom action:** Add `polygon-mainnet` as a supported network in `lib/config.ts` once Polygon integration is active. Do NOT activate before feature flag is enabled.

---

## 2. Polygon ID Issuer Node REST API

The Polygon ID Issuer Node exposes a REST API for credential management.

### Base URL (self-hosted)
```
https://{your-issuer-node-domain}/v1
```

### Key Endpoints (to verify against Polygon ID docs)

| Endpoint | Method | Purpose |
|---------|--------|---------|
| `/identities` | POST | Create issuer DID |
| `/identities/{identifier}/claims` | POST | Issue a credential claim |
| `/identities/{identifier}/claims/{claimId}` | GET | Get claim state |
| `/identities/{identifier}/claims/revoke/{nonce}` | POST | Revoke a credential |
| `/identities/{identifier}/claims/{claimId}/qrcode` | GET | Generate QR for holder |
| `/identities/{identifier}/proofs` | POST | Generate ZK proof |

**Note:** These endpoints are approximate. Official Polygon ID Issuer Node API reference must be reviewed before implementation.

---

## 3. Polygon ID Verifier API

The verifier checks ZK proofs submitted by holders.

### Key operations (approximate):
- Accept proof requests
- Verify Groth16 or PLONK proofs
- Check credential revocation status against on-chain state

**Axiom use case:** AXUSD access on Polygon-native platforms would require submitting a proof against Axiom's credential schema.

---

## 4. Polygon State Sync / Bridge APIs

For the PoS bridge:

| Endpoint | Purpose |
|---------|---------|
| Polygon PoS API | Asset deposit/withdrawal state |
| Matic.js SDK | High-level bridge operations |
| FxPortal | Message/state passing L1↔Polygon |

**Axiom use case:** Low priority — identity bridge does not require asset bridging in most designs.

---

## 5. Circle Compliance — Polygon Chain Support

Circle's compliance screening API accepts a `chain` parameter. Polygon may be supported.

**Verify:** Whether `POLYGON` or `MATIC` is a valid chain value in Circle's compliance API.

```typescript
// Current in lib/circle/complianceEngine.ts:
async screen(address: string, chain = 'ARB'): Promise<ScreeningResponse>
// Polygon would require chain = 'POLYGON' (verify)
```

---

## API Keys / Env Variables Needed

| Variable | Purpose | Status |
|---------|---------|--------|
| `ALCHEMY_API_KEY` | Already configured — works for Polygon too | Available |
| `POLYGON_ID_ISSUER_API_KEY` | Issuer node auth | Not configured |
| `POLYGON_ID_VERIFIER_URL` | Verifier endpoint | Not configured |
| `POLYGON_GAS_WALLET_KEY` | MATIC-funded wallet for gas | Not configured |

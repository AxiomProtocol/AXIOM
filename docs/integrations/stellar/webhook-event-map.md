# Stellar — Webhook and Event Map

**Status:** Pre-integration — no webhooks configured yet.
**Note:** Stellar anchors do NOT push webhooks. Axiom must poll for status.

---

## Status Polling Architecture (Not Webhooks)

Unlike Stripe or banking APIs, Stellar anchors do NOT send webhook callbacks.
Axiom must poll the anchor's SEP-24/SEP-31 status endpoint for each in-progress
transfer. This is the expected pattern for Stellar anchor integrations.

```
Axiom backend
  → Initiates SEP-24 withdrawal
  → Returns transfer_id to frontend
  → Frontend polls Axiom: GET /api/stellar/status/:transferId every 5-15 seconds
  → Axiom polls anchor: GET <sep24-url>/transaction?id=:anchorTransferId every 5-15 seconds
  → Anchor status updates: pending_external → pending_anchor → completed
  → Axiom writes final state to DB
  → Frontend receives terminal status
```

---

## Stellar Network Events (Horizon Event Stream)

Horizon supports server-sent events (SSE) for real-time ledger streaming.
These are NOT webhooks — they are HTTP event streams.

### Account Transaction Stream

```
GET https://horizon.stellar.org/accounts/{publicKey}/transactions?cursor=now
Accept: text/event-stream
```

**Use case:** Watch Axiom's Stellar hot wallet for incoming confirmations.
When the anchor confirms a USDC receipt, the transaction appears here.

**Events emitted:**
```
event: message
data: { "type": "transaction", "hash": "...", "successful": true, "ledger": 12345 }
```

**SDK streaming:**
```typescript
const txStream = server
  .transactions()
  .forAccount(axiomStellarPublicKey)
  .cursor('now')
  .stream({
    onmessage: (tx) => handleTxConfirmation(tx),
    onerror: (err) => handleStreamError(err),
  });
```

**When to use:** Real-time confirmation that USDC was received by anchor.
**Fallback:** If stream disconnects, poll `/transactions` endpoint instead.

### Payment Stream

```
GET https://horizon.stellar.org/accounts/{publicKey}/payments?cursor=now
Accept: text/event-stream
```

**Use case:** More granular than transaction stream — shows individual payment operations.
Useful for detecting USDC transfers into Axiom's account.

---

## Anchor Status Transitions (SEP-24)

These are the states to handle in the polling loop:

| Status | Description | Axiom Action |
|--------|-------------|-------------|
| `incomplete` | Anchor interactive flow not yet completed by user | Wait / remind user |
| `pending_user_transfer_start` | Axiom must send USDC to anchor | Submit Stellar payment |
| `pending_external` | Anchor received USDC, processing fiat | Poll — no action |
| `pending_anchor` | Anchor moving fiat to recipient | Poll — no action |
| `pending_trust` | Recipient account needs trustline | Error — advise recipient |
| `completed` | Fiat delivered | Mark transfer complete, notify user |
| `error` | Anchor encountered an error | Mark failed, log error, trigger ops alert |
| `refunded` | USDC returned to Axiom | Credit AXUSD back, notify user |
| `expired` | Interactive window expired | Restart flow if user wants to retry |

---

## Internal Events to Emit (Axiom-Side)

When building the Stellar payment flow, emit these internal events for ops visibility:

| Event | Trigger | Ops Response |
|-------|---------|-------------|
| `stellar.payment.initiated` | POST /api/stellar/initiate success | Log, start polling |
| `stellar.payment.usdc_submitted` | USDC sent to anchor Stellar address | Log tx hash |
| `stellar.payment.completed` | Anchor status = completed | Notify user, update DB |
| `stellar.payment.failed` | Anchor status = error | Ops alert, initiate refund review |
| `stellar.payment.refunded` | USDC returned from anchor | Credit AXUSD, notify user |
| `stellar.anchor.unreachable` | Anchor health check fails | Ops alert, disable corridor |
| `stellar.network.degraded` | Horizon latency > 5000ms | Log, display status indicator |

---

## Polling Implementation Guide

```typescript
async function pollTransferStatus(
  transferId: string,
  anchorId: string,
  maxAttempts = 720,  // ~1 hour at 5-second intervals
  intervalMs = 5000
): Promise<StellarTransferStatus> {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const state = await adapter.getTransferState(transferId);
    if (!state) break;

    if (['completed', 'error', 'refunded'].includes(state.status)) {
      return state.status;
    }

    await sleep(intervalMs);
  }
  return 'error';
}
```

---

## No Webhooks Needed From Anchor

Anchors do not send webhook callbacks. If Axiom wants event-driven behavior,
the options are:

1. **Background polling job** (recommended for MVP): A scheduled job polls
   in-progress transfers every 30 seconds via the anchor's status endpoint.

2. **Horizon SSE stream** (recommended for real-time): Stream Axiom's Stellar
   hot wallet for incoming USDC confirmations.

3. **Anchor-specific webhooks** (future): Some anchors may support proprietary
   webhooks. Evaluate per anchor after selection.

---

## No Stellar Events on Axiom's End

Axiom does not need to expose any webhook endpoints to Stellar.
Stellar is a polling-first ecosystem — Axiom calls anchor APIs, not the other way around.

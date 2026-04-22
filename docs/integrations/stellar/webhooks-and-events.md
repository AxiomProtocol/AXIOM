# Stellar — Webhooks and Event Models

---

## Horizon SSE Streams (Primary Event Model)

Horizon API supports Server-Sent Events (SSE) for real-time streaming. This is the primary event model for Stellar.

### Key Streams

| Stream | URL Pattern | Purpose |
|--------|-------------|---------|
| Account transactions | `/accounts/{id}/transactions?cursor=now` | All transactions for an account |
| Account payments | `/accounts/{id}/payments?cursor=now` | Payment-specific events |
| Ledger stream | `/ledgers?cursor=now` | New ledger closures |
| Operations stream | `/operations?cursor=now` | All network operations |

**Implementation note:** stellar-sdk's `Horizon.Server` wraps SSE streaming in a clean JS API:

```typescript
// Approximate — verify against stellar-sdk source
server.payments()
  .forAccount(AXIOM_STELLAR_ACCOUNT)
  .cursor('now')
  .stream({
    onmessage: (payment) => handlePayment(payment),
    onerror: (error) => handleError(error),
  });
```

---

## Anchor Webhook Events (SEP-0024 / SEP-0031)

Anchor partners typically send webhooks when payment status changes.

### SEP-0024 Transaction Status Events

| Status | Meaning | Axiom Action |
|--------|---------|-------------|
| `incomplete` | User interaction needed | Redirect user |
| `pending_external` | Awaiting fiat movement | Monitor |
| `pending_anchor` | Anchor processing | Monitor |
| `pending_stellar` | Awaiting Stellar confirmation | Monitor |
| `completed` | Fiat delivered | Update DB, notify participant |
| `expired` | Transaction expired | Retry or cancel |
| `error` | Failed | Alert, log, handle |
| `refunded` | Returned to sender | Update DB |

**Implementation:** Poll anchor `GET /transaction?id=...` endpoint OR listen for anchor-provided webhooks. Poll interval: every 30 seconds until final state.

---

## Stellar Network Events to Monitor

| Event | Trigger | Axiom Action |
|-------|---------|-------------|
| Payment received | Inbound USDC | Record, attribute to participant |
| Payment confirmed | Outbound USDC confirmed | Update corridor status |
| Transaction error | Failed submission | Retry with incremented sequence number |
| Account sequence change | Concurrent tx conflict | Refresh sequence, retry |

---

## Internal Event Queue Design

```
Payment initiation request
  ↓
Create DB record in expansion_settlement_corridors (status: pending)
  ↓
Submit Stellar transaction
  ↓
Subscribe to Horizon SSE stream for confirmation
  ↓
On confirmation: update DB (status: completed)
  ↓
Notify participant (email via Resend)
```

**Error handling:** Stellar transactions can fail due to sequence number conflicts (concurrent submissions). Build retry logic with sequence number refresh.

---

## Env Variables for Event Handling

| Variable | Purpose |
|---------|---------|
| `STELLAR_HORIZON_URL` | Horizon endpoint for SSE |
| `STELLAR_SOURCE_ACCOUNT_PUBLIC` | Account to monitor for events |
| `STELLAR_ANCHOR_WEBHOOK_SECRET` | Verify anchor webhook authenticity |

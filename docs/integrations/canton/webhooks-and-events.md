# Canton Network — Webhooks and Event Models

---

## Canton's Event Model: Transaction Streams

Canton does not have traditional webhooks. Instead, applications subscribe to transaction streams via the Ledger API or JSON API.

### Transaction Stream (Ledger API)

Applications subscribe to:
- `TransactionService` — Stream all DAML transactions visible to a party
- `ActiveContractsService` — Stream current state of all active contracts (used for catch-up)
- `CommandCompletionService` — Track completion of submitted commands

**Characteristics:**
- All events are gRPC streams (or SSE via JSON API)
- Events are partitioned by party — Axiom only sees contracts where it is a party or observer
- Events are ordered and have stable offsets (like Kafka offsets)

---

## Key DAML Events to Monitor

| Event | DAML Context | Axiom Action |
|-------|-------------|-------------|
| `CreateEvent` | New contract created | Record new LP position, capital commitment |
| `ExercisedEvent` | Choice exercised on contract | Process subscription, distribution, withdrawal |
| `ArchivedEvent` | Contract archived (terminated) | Close position, record settlement |

---

## JSON API Event Streaming

For Axiom's Node.js backend, the JSON API provides a simpler event model:

```
GET /v1/stream/query
Content-Type: application/json
{
  "templateIds": ["AxiomCapital:CapitalPosition"],
  "query": {"status": "active"}
}
```

Returns SSE stream of contract events for the specified template type.

---

## Application Event Pipeline Design (Future State)

```
Canton transaction committed
  ↓
JSON API SSE stream delivers event to Axiom backend
  ↓
Event router dispatches to handler
  ↓
Handler updates PostgreSQL (Drizzle) DB
  ↓
Notification sent to relevant party (email, portal update)
  ↓
Cross-chain event: if Arbitrum settlement needed, trigger AXUSD transfer
```

---

## Event Offset Management

Canton Ledger API events have stable offsets (similar to Kafka offsets). Axiom must:
- Store the last processed offset in the database
- Resume from stored offset on restart (prevent reprocessing or missing events)
- Handle duplicate delivery gracefully (idempotent event handlers)

---

## Implementation Checklist (All Blocked by Partnership)

- [ ] Obtain Canton participant node access
- [ ] Implement JSON API SSE stream listener
- [ ] Design event router for DAML contract events
- [ ] Build idempotent event handler with offset tracking
- [ ] Define DB schema for Canton events in `shared/expansionSchema.ts`
- [ ] Build cross-chain event relay (Canton events → Arbitrum settlement triggers)

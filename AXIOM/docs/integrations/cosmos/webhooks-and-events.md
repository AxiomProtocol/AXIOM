# Cosmos — Webhooks and Event Models

---

## CometBFT WebSocket Events (Primary)

CometBFT exposes a WebSocket endpoint for real-time event subscription.

### WebSocket URL
```
wss://{node-rpc}:26657/websocket
```

### Subscribe Queries (Tendermint Query Syntax)

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "subscribe",
  "params": {
    "query": "tm.event = 'Tx' AND message.module = 'bank'"
  }
}
```

**Common query templates:**
- New blocks: `tm.event = 'NewBlock'`
- All transactions: `tm.event = 'Tx'`
- Specific sender: `tm.event = 'Tx' AND message.sender = 'axiom1abc...'`
- IBC packets: `tm.event = 'Tx' AND message.action = '/ibc.core.channel.v1.MsgRecvPacket'`

---

## CosmJS Event Streaming

CosmJS provides a TypeScript-friendly API for event streaming:

```typescript
// Approximate — verify against cosmjs docs
import { Tendermint37Client } from '@cosmjs/tendermint-rpc';

const tmClient = await Tendermint37Client.connect(rpcEndpoint);

// Subscribe to new blocks
const stream = tmClient.subscribeNewBlock();
stream.addListener({
  next: (block) => handleBlock(block),
  error: (err) => handleError(err),
});
```

---

## IBC Event Types

On an IBC-enabled Axiom chain, key IBC events to monitor:

| Event | Query | Axiom Action |
|-------|-------|-------------|
| IBC transfer received | `message.action='/ibc.applications.transfer.v1.MsgTransfer'` | Credit Axiom account |
| IBC channel opened | `message.action='/ibc.core.channel.v1.MsgChannelOpenInit'` | New chain connected |
| IBC packet timeout | `message.action='/ibc.core.channel.v1.MsgTimeout'` | Handle failed transfer |
| IBC packet acknowledged | `message.action='/ibc.core.channel.v1.MsgAcknowledgement'` | Transfer confirmed |

---

## Governance Events

| Event | Query | Axiom Action |
|-------|-------|-------------|
| Proposal submitted | `message.action='/cosmos.gov.v1beta1.MsgSubmitProposal'` | Notify AXM holders |
| Vote cast | `message.action='/cosmos.gov.v1beta1.MsgVote'` | Update vote count |
| Proposal passed | `proposal_result = 'proposal_passed'` | Execute on-chain action |

---

## Event Pipeline Design (Future — When Chain Exists)

```
CometBFT WebSocket / Axiom chain node
  ↓
CosmJS stream listener (in Axiom Next.js backend)
  ↓
Event router dispatches to handler
  ↓
PostgreSQL (Drizzle) DB update
  ↓
Notification to participants (Resend email)
  ↓
Cross-chain relay: if Arbitrum settlement needed, trigger AXUSD transfer
```

---

## Relayer Events (IBC Infrastructure)

IBC relayers (Hermes or Go Relayer) have their own health APIs:

| Relayer | API | Purpose |
|---------|-----|---------|
| Hermes | `http://localhost:3001/` (REST) | Relayer health, pending packets |
| Go Relayer | gRPC | Channel status |

**Axiom must monitor relayer health** if running IBC — offline relayers cause stuck IBC packets.

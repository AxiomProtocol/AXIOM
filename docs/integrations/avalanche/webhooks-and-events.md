# Avalanche — Webhooks and Event Models

---

## On-Chain Events (C-Chain — EVM Standard)

Since Avalanche C-Chain is EVM-compatible, event monitoring uses standard `eth_getLogs` and WebSocket `eth_subscribe`.

### Events to Monitor (if deploying contracts on C-Chain)

| Event | Contract | Purpose |
|-------|---------|---------|
| `AllowListSet(address addr, bool allowed)` | TxAllowList Precompile | Access granted/revoked |
| Capital program events | Axiom capital contracts | Investment, redemption, distribution |
| `Transfer(address from, address to, uint256)` | AXUSD bridge token | Asset movement if bridging |

---

## Subnet-Specific Events (if custom subnet)

Custom Subnet-EVM emits standard EVM events. Additional monitoring:

| Event | Source | Purpose |
|-------|--------|---------|
| Validator set changes | P-Chain | Monitor subnet validator additions/removals |
| Subnet block production | Subnet node | Health monitoring |
| AllowList precompile events | Subnet-EVM | Access control changes |

---

## Glacier API Webhooks (to verify)

Glacier API may support webhook notifications for Avalanche events:

- **Address activity webhooks** — Similar to Alchemy Notify
- **Transaction confirmation webhooks** — On finality

**Status:** Verify whether Glacier API supports webhooks and what event types are available.

---

## Alchemy Notify for Avalanche

Alchemy's Notify (webhook) system may support Avalanche C-Chain.

**Action:** Verify Alchemy Notify supports `avax-mainnet` for:
- Address activity
- Token transfers
- Custom contract events

**Axiom use:** Monitor AllowList precompile events and capital contract events without running own node.

---

## Cross-Chain Event Pipeline

When Arbitrum ERC-3643 state changes, Avalanche must be notified:

| Trigger | Source | Action on Avalanche |
|---------|--------|---------------------|
| KYC approved | Arbitrum | Add wallet to Avalanche AllowList |
| KYC revoked | Arbitrum | Remove wallet from Avalanche AllowList |
| Accreditation expired | Arbitrum | Remove from capital program AllowList |
| Capital program funded | Avalanche | Record in DB, notify Arbitrum settlement layer |

**Implementation pattern:** Shared event queue that processes cross-chain identity state changes. See `CrossChainIdentityService` for the existing abstraction pattern.

---

## Event Monitoring Implementation Checklist

- [ ] Verify Alchemy Notify supports avax-mainnet
- [ ] Verify Glacier API webhook availability
- [ ] Define Avalanche event schema in `shared/expansionSchema.ts`
- [ ] Build cross-chain AllowList sync queue (Arbitrum identity → Avalanche AllowList)
- [ ] Build capital program event handlers for Avalanche
- [ ] Test AllowList update end-to-end

# Polygon — Webhooks and Event Models

---

## On-Chain Events (EVM Contract Events)

Since Polygon PoS is EVM-compatible, event monitoring uses standard `eth_getLogs` and WebSocket `eth_subscribe`.

### Events to Monitor (if deploying contracts on Polygon)

| Event | Contract | Purpose |
|-------|---------|---------|
| `IdentityRegistered(address identity, address wallet)` | IdentityRegistry | New identity created on Polygon |
| `ClaimAdded(bytes32 claimId, uint256 topic, ...)` | ClaimIssuer | Credential issued |
| `ClaimRevoked(bytes32 claimId)` | ClaimIssuer | Credential revoked — CRITICAL for compliance |
| `Transfer(address from, address to, uint256 value)` | Any ERC-20 | Asset movement if bridging assets |

**Axiom tooling:** Existing event monitoring in `lib/services/ERC3643Service.ts` can be extended for Polygon with a Polygon-configured provider.

---

## Polygon ID Webhook Events (Issuer Node)

The Polygon ID Issuer Node supports webhook callbacks for credential lifecycle events.

### Events to integrate:

| Event | Trigger | Axiom action needed |
|-------|---------|---------------------|
| `credential.issued` | Credential successfully issued | Record in `expansion_identity_bridges` |
| `credential.revoked` | Credential revoked | Trigger Polygon state update |
| `proof.verified` | Holder submitted valid proof | Grant access / log |
| `proof.rejected` | Invalid proof submitted | Block access, log for compliance |

**Status:** Polygon ID webhook spec not yet reviewed. Collect from official Polygon ID docs.

---

## Alchemy Notify (Alternative)

Alchemy's webhook service (Notify) supports Polygon Mainnet:

- **Address Activity:** Detect wallet activity on Polygon
- **Transaction Status:** Monitor transaction finality
- **Token Activity:** Track ERC-20 / ERC-721 transfers

**Axiom use:** Can monitor Polygon IdentityRegistry events without running own node.

**Setup:** Uses same Alchemy API key as Arbitrum. Add Polygon webhook in Alchemy dashboard.

---

## Cross-Chain Sync Events

When Arbitrum ERC-3643 state changes, Polygon must be notified:

| Trigger | Source Chain | Action on Polygon |
|---------|-------------|-------------------|
| KYC approved | Arbitrum | Issue Polygon credential |
| KYC revoked | Arbitrum | Revoke Polygon credential |
| Accreditation updated | Arbitrum | Update Polygon credential scope |

**Implementation pattern:** After `ERC3643Service.issueClaim()` succeeds on Arbitrum, call `PolygonCredentialBridgeService.mirrorCredential()` asynchronously. Use database queue if needed for reliability.

---

## Event Monitoring Implementation Checklist

- [ ] Determine whether to run own Polygon node or use Alchemy Notify
- [ ] Define event schema for Polygon credential events in `shared/expansionSchema.ts`
- [ ] Add Polygon event handler to event processing pipeline
- [ ] Build cross-chain sync queue for Arbitrum → Polygon state propagation
- [ ] Test revocation propagation end-to-end

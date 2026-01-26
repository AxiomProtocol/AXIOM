# Axiom Protocol - Timelock Deployment Documentation

**Network:** Arbitrum One (42161)  
**Generated:** 2026-01-26  
**Status:** DEPLOYED (Lock Forever NOT activated)

---

## Timelock Contracts

### AxiomTimelockController

| Property | Value |
|----------|-------|
| **Address** | `0xf1B1D594d6Edc9f045dF55B32006A24e666Ed899` |
| **Minimum Delay** | 24 hours (86400 seconds) |
| **Max Delay Cap** | 30 days (2592000 seconds) |
| **Lock Status** | Configurable (not yet locked) |

#### Roles

| Role | Address | Description |
|------|---------|-------------|
| DEFAULT_ADMIN_ROLE | `0x2Bb2c2A7A1d82097488BF0b9C2A59C1910Cd8d5d` | Gnosis Safe - Full admin |
| PROPOSER_ROLE | `0x2Bb2c2A7A1d82097488BF0b9C2A59C1910Cd8d5d` | Can queue operations |
| EXECUTOR_ROLE | `0x0000000000000000000000000000000000000000` | Anyone can execute after delay |
| CANCELLER_ROLE | `0x2Bb2c2A7A1d82097488BF0b9C2A59C1910Cd8d5d` | Can cancel queued ops |
| GUARDIAN_ROLE | `0x2Bb2c2A7A1d82097488BF0b9C2A59C1910Cd8d5d` | Emergency pause (immediate) |
| CIRCUIT_BREAKER_ROLE | `0x2Bb2c2A7A1d82097488BF0b9C2A59C1910Cd8d5d` | Automated emergency |

#### Key Functions

| Function | Access | Timelocked |
|----------|--------|------------|
| `schedule()` | PROPOSER | No (queues) |
| `execute()` | EXECUTOR (anyone) | Yes (after delay) |
| `cancel()` | CANCELLER | No |
| `updateDelay()` | ADMIN | Yes |
| `lockForever()` | ADMIN | No (one-way) |
| `emergencyPause()` | GUARDIAN | No (immediate) |
| `triggerCircuitBreaker()` | CIRCUIT_BREAKER | No (immediate) |

---

### AxiomGovernanceConfig

| Property | Value |
|----------|-------|
| **Address** | `0xa645a0Fcc15dD22Ee44d774F19731Fb0fE70b2CC` |
| **Timelock Controller** | `0xf1B1D594d6Edc9f045dF55B32006A24e666Ed899` |
| **Registry Locked** | false |

---

## Existing GovernanceHub (V1)

| Property | Value |
|----------|-------|
| **Address** | `0x52Dc85fd653a75323b5307f4D2629ab9A070530E` |
| **Network** | Arbitrum One |
| **Minimum Delay** | 24 hours |
| **Grace Period** | 14 days |

---

## Deployment Steps

### Phase 1: Deploy Timelock Infrastructure

```bash
npx hardhat run scripts/deploy-timelock.ts --network arbitrum
```

### Phase 2: Configure Function Routing

Register all core contracts and configure timelocked vs emergency functions.

### Phase 3: Transfer Admin Roles

Grant ADMIN to Timelock, then revoke from Safe (after testing).

### Phase 4: Verify & Test

```bash
npm run test:invariants
npm run test:scenarios
```

### Phase 5: Lock Forever (Optional)

```typescript
await timelock.lockForever();
```

---

## Lock Forever Guarantees

After `lockForever()` is called:

1. **Delay cannot decrease**: Reverts if `newDelay < currentDelay`
2. **Minimum floor enforced**: `newDelay >= 24 hours` always
3. **Irreversible**: `configurationLocked` cannot be set back to `false`
4. **Provable**: On-chain `lockTimestamp` and `lockedBy` for audit trail

### Emergency Path Remains Open

Even after lock:
- `emergencyPause()` works immediately (GUARDIAN)
- `triggerCircuitBreaker()` works immediately (CIRCUIT_BREAKER)
- `liftEmergencyPause()` works immediately (ADMIN)
- `resetCircuitBreaker()` works immediately (ADMIN)

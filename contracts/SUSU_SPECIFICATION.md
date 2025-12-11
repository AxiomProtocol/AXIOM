# Axiom SUSU - Rotating Savings and Credit Association

## Overview

SUSU (also known as ROSCAs - Rotating Savings and Credit Associations) is a traditional community-based savings system where a group of participants contribute a fixed amount at regular intervals, and each cycle one member receives the pooled funds. This continues until every member has received the pot exactly once.

Axiom SUSU brings this time-tested system on-chain, providing transparency, automation, and integration with the Axiom Protocol ecosystem.

## Core Concepts

### 1. SUSU Pool
A single rotating savings group with fixed parameters:
- **Token**: The ERC20 token used (typically AXM)
- **Member Count**: Fixed number of participants (e.g., 10 members)
- **Contribution Amount**: Amount each member contributes per cycle
- **Cycle Duration**: Time window for contributions (e.g., 1 week, 1 month)
- **Total Cycles**: Equals member count (each member receives once)

### 2. Member
A wallet address participating in a pool. Each member:
- Contributes the fixed amount each cycle
- Receives the pooled amount exactly once during the pool's lifetime
- Has a designated payout position in the rotation

### 3. Contribution Cycle
A fixed time window where all members must contribute. At the end of each cycle:
1. All contributions are collected
2. One designated member receives the total pool
3. The rotation advances to the next cycle

### 4. Payout Round
The moment when the designated recipient receives pooled funds:
- Payout = (Contribution Amount × Number of Members) - Protocol Fee
- The recipient for each round is determined by rotation order

## Functional Requirements

### Pool Creation

```solidity
createPool(
    address token,           // ERC20 token address (AXM recommended)
    uint256 memberCount,     // Number of members (2-50)
    uint256 contributionAmount,  // Amount per member per cycle
    uint256 cycleDuration,   // Duration in seconds
    uint256 startTime,       // When pool starts (must be future)
    bool randomizedOrder,    // Random vs sequential payout order
    uint16 protocolFeeBps    // Fee in basis points (max 500 = 5%)
)
```

### Member Registration

- **Pre-defined**: Creator specifies all member addresses at creation
- **Open Join**: Pool remains open until full, members join themselves
- Maximum member count enforced
- Cannot join same pool twice

### Contribution Logic

```solidity
contribute(uint256 poolId)
```

- Members deposit exact contribution amount each cycle
- Track who has paid for current cycle
- Prevent double contributions per cycle
- Late contributions within grace period allowed (optional penalty)

### Payout Logic

```solidity
processPayout(uint256 poolId)
```

- Triggered after cycle ends (automatic or manual)
- Sends pooled funds to designated recipient
- Routes protocol fee to Axiom treasury
- Advances to next cycle

### Enforcement & Penalties

1. **Grace Period**: Optional buffer after cycle ends for late payments
2. **Penalty Fee**: Late contributors pay extra (configurable %)
3. **Ejection**: Members missing payment without grace period may be removed
4. **Collateral**: Optional upfront collateral to guarantee participation

### Exit & Cancellation

1. **Early Exit**: Member can exit before their payout (forfeits contributions)
2. **Pool Cancellation**: Admin can cancel if critical issues arise
3. **Refund Logic**: Pro-rata refunds for current cycle upon cancellation

## Integration with Axiom Protocol

### Token Flow
- Contributions transferred via `SafeERC20.safeTransferFrom`
- Protocol fees routed to `treasuryVault` (from AxiomV2)
- Optionally stake collateral in Staking contracts

### Role Compatibility
- Uses same role patterns: `ADMIN_ROLE`, `TREASURY_ROLE`
- Pool creators get `POOL_MANAGER_ROLE` for their pool

### Events
```solidity
event PoolCreated(uint256 indexed poolId, address creator, uint256 memberCount);
event MemberJoined(uint256 indexed poolId, address indexed member, uint256 position);
event MemberExited(uint256 indexed poolId, address indexed member, bool refunded);
event ContributionMade(uint256 indexed poolId, address indexed member, uint256 cycle, uint256 amount);
event PayoutProcessed(uint256 indexed poolId, address indexed recipient, uint256 cycle, uint256 amount);
event PoolCompleted(uint256 indexed poolId, uint256 totalCycles);
event PoolCancelled(uint256 indexed poolId, string reason);
```

## Security Considerations

1. **Reentrancy Protection**: All state changes before external calls
2. **Input Validation**: Bounds checking on all parameters
3. **Time Handling**: Use `block.timestamp` with grace periods
4. **Access Control**: Only authorized addresses can manage pools
5. **Fund Safety**: Emergency pause capability, no stuck funds

## Contract Architecture

```
AxiomSusuHub.sol
├── Pool Management (create, configure, view)
├── Member Management (join, exit, list)
├── Contribution Logic (deposit, track, validate)
├── Payout Logic (calculate, distribute, advance)
├── Penalty System (grace period, late fees, ejection)
├── Admin Functions (pause, rescue, cancel)
└── View Functions (status, balances, history)
```

## Example Flow

1. **Creation**: Alice creates a 5-member pool with 100 AXM contribution, monthly cycles
2. **Join**: Bob, Carol, Dave, Eve join the pool (5 members total)
3. **Cycle 1**: All 5 contribute 100 AXM each. Alice (position 1) receives 500 AXM (minus fee)
4. **Cycle 2**: All 5 contribute again. Bob receives the pool.
5. **...continues until Cycle 5**: Eve receives the final payout
6. **Completion**: Pool is marked complete, all members have participated fully

## Comparison to Existing Axiom Contracts

| Feature | CapitalPoolsAndFunds | LeaseAndRentEngine | AxiomSusuHub |
|---------|---------------------|-------------------|--------------|
| Member Tracking | Investors | Tenants | SUSU Members |
| Payment Cycles | Yield distributions | Monthly rent | Fixed cycles |
| Payouts | Proportional yield | Equity accumulation | Rotating lump sum |
| Lock-up | Configurable | Lease duration | Until pool completes |

The SUSU contract follows the same coding patterns and can integrate with Treasury for fee routing.

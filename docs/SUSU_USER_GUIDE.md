# Axiom SUSU - User Guide

## What is SUSU?

SUSU (also called a "money circle" or "savings club") is a community-based savings system where a group of people pool their money together, and each person takes turns receiving the full pot.

**Example:** 10 friends each put in $100 every month. Each month, one person gets the full $1,000. After 10 months, everyone has received the pot exactly once.

This traditional system has been used for generations in communities worldwide. Axiom SUSU brings this trusted system on-chain with transparency, automation, and security.

## How Axiom SUSU Works

### 1. Create or Join a Pool

**Creating a Pool:**
- Choose how many members (2-50 people)
- Set the contribution amount (e.g., 100 AXM per cycle)
- Choose cycle length (weekly, monthly, etc.)
- Decide if the payout order is random or in order of joining
- Set a start date

**Joining a Pool:**
- Browse available open pools
- Join before the pool reaches its member limit
- Approve the contract to transfer your tokens

### 2. Make Contributions

Each cycle:
1. Contribute the fixed amount before the deadline
2. If you're late (within grace period), you pay a small late fee
3. Once all members contribute, the payout is triggered

### 3. Receive Your Payout

When it's your turn:
- You receive the total pool minus a small protocol fee
- Example: 5 members × 100 AXM = 500 AXM pool
- With 1% protocol fee: You receive 495 AXM

### 4. Continue Until Complete

The pool continues until every member has received the pot exactly once. Then the pool is marked complete.

## Step-by-Step Instructions

### For Pool Creators

1. **Connect Wallet**: Connect your Web3 wallet with AXM tokens
2. **Create Pool**: Call `createPool()` with your settings
3. **Invite Members**: Share the pool ID with friends
4. **Start Pool**: Once full, call `startPool()` when ready

### For Pool Members

1. **Find a Pool**: Get pool ID from the creator
2. **Join**: Call `joinPool(poolId)` before it's full
3. **Contribute Each Cycle**: Call `contribute(poolId)` every cycle
4. **Receive Payout**: Automatic when it's your turn

### Example Scenarios

**Scenario 1: Monthly Savings Club**
- 10 members
- 100 AXM monthly contribution
- Monthly cycle (30 days)
- Result: Each member receives 990 AXM once over 10 months

**Scenario 2: Weekly Quick Circle**
- 5 members
- 50 AXM weekly contribution
- Weekly cycle (7 days)
- Result: Each member receives 247.5 AXM once over 5 weeks

## Key Terms

| Term | Definition |
|------|------------|
| **Pool** | A single SUSU savings group |
| **Contribution** | The fixed amount each member pays each cycle |
| **Cycle** | One time period (week, month, etc.) |
| **Payout** | The total pot given to one member each cycle |
| **Position** | Your place in the payout order |
| **Grace Period** | Extra time after deadline to make late payments |
| **Protocol Fee** | Small percentage taken from payouts for Axiom treasury |

## Safety Features

- **Smart Contract Security**: All funds held securely on-chain
- **Transparent Records**: Everyone can verify contributions and payouts
- **Automatic Payouts**: No trust required - code executes fairly
- **Emergency Pause**: Admin can pause if critical issues arise
- **Cancellation Refunds**: If cancelled early, contributions are refunded

## Fees

| Fee Type | Amount | When |
|----------|--------|------|
| Protocol Fee | 1% (default) | Deducted from each payout |
| Late Fee | 2% (default) | Added to late contributions |

## Frequently Asked Questions

**Q: What happens if someone doesn't pay?**
A: There's a grace period for late payments. If they still don't pay, they can be ejected from the pool.

**Q: Can I leave early?**
A: Yes, but if you've received your payout, you forfeit your remaining contributions. If you haven't received yet, contributions may be forfeited.

**Q: How is the payout order determined?**
A: Either in the order members joined (sequential) or randomly assigned when the pool starts.

**Q: What tokens can I use?**
A: Any ERC20 token, but AXM is recommended for full ecosystem integration.

**Q: Is there a minimum or maximum pool size?**
A: Minimum 2 members, maximum 50 members.

## Contract Functions Reference

### Pool Management
- `createPool()` - Create a new SUSU pool
- `joinPool(poolId)` - Join an open pool
- `startPool(poolId)` - Start a full pool
- `cancelPool(poolId, reason)` - Cancel a pool

### Member Actions
- `contribute(poolId)` - Make your contribution for current cycle
- `exitPool(poolId)` - Leave a pool (forfeits remaining contributions)

### View Functions
- `getPool(poolId)` - Get pool details
- `getMember(poolId, wallet)` - Get member info
- `getPayoutOrder(poolId)` - See the payout rotation
- `getCurrentRecipient(poolId)` - Who receives payout this cycle
- `getExpectedPayout(poolId)` - Calculate expected payout amounts
- `getCycleInfo(poolId)` - Get current cycle timing info
- `hasContributed(poolId, wallet)` - Check if member paid this cycle

## Support

For technical support or questions, contact the Axiom Protocol team or visit our community channels.

---

*Axiom SUSU - Bringing trusted community savings on-chain.*

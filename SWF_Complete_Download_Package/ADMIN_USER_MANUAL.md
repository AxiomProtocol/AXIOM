# SOVRAN WEALTH FUND (SWF)
# ADMIN USER MANUAL

## IN-HOUSE TESTING, LIQUIDITY GROWTH & PASSIVE INCOME GENERATION

*Document Version: 1.0*  
*Last Updated: May 7, 2025*

---

## Table of Contents

1. [Introduction](#introduction)
2. [Admin Dashboard Access](#admin-dashboard-access)
3. [In-House Testing Guide](#in-house-testing-guide)
4. [Liquidity Growth Strategy](#liquidity-growth-strategy)
5. [Passive Income Generation Plan ($800/month)](#passive-income-generation-plan)
6. [Weekly Liquidity Deposits ($50/week)](#weekly-liquidity-deposits)
7. [Contract Interaction Guide](#contract-interaction-guide)
8. [Monitoring & Analytics](#monitoring--analytics)
9. [Troubleshooting](#troubleshooting)
10. [Security Best Practices](#security-best-practices)

---

## Introduction

This manual provides comprehensive instructions for SWF platform administrators on conducting in-house testing, implementing a sustainable liquidity growth strategy, and generating passive income of approximately $800 per month with minimal weekly liquidity deposits of $50.

**Key Platform Details:**
- SWF Token Address: `0x7e243288B287BEe84A7D40E8520444f47af88335` (BSC)
- SoloMethodEngine Address: `0x87034C4A1C27DEd5d74819661318840C558bde00` (BSC)
- Bank Wallet: `0xEcDdb7dFF2f61E1caC7AC767337A38E1aD851eD6` (In-house testing)
- Current Verified LP Addresses:
  - SWF/BNB: `0x4dfb9909a36580e8e6f126acf189a965740f7b35`
  - SWF/ETH: `0x5Ac30825dA8fCEEFCC8AC1e29df82eC866050e94`

---

## Admin Dashboard Access

### Credentials & Login

1. Access the Admin Dashboard at: `https://yourdeployment.com/admin`
2. Use the following credentials for in-house testing:
   - Username: `Admin`
   - Password: `Promote9@`
   - Associated Wallet: `0x3F4EF4Caa6382EA9F260E4c88a698449E955B339`

### Security Notice

- Change default credentials immediately after initial login
- Enable two-factor authentication for production environment
- All actions on the dashboard are logged for accountability
- Use dedicated admin wallets for testing that contain limited funds

---

## In-House Testing Guide

### Testing Environment Setup

1. **Test Wallet Configuration**
   - Access the admin dashboard and navigate to "Wallet Management"
   - Configure test wallets with the appropriate roles:
     - Treasury Wallet (20%)
     - Development Wallet (10%)
     - Marketing Wallet (10%)
     - Liquidity Wallet (15%)
     - Distribution Wallet (10%)
     - Other role-specific wallets (35% combined)

2. **Test Transaction Flow**
   - Initiate a small test distribution (100-1000 SWF) to verify wallet allocation
   - Monitor distribution using the "Transaction Tracking" panel
   - Verify receipts in all 16 wallet addresses according to role percentages

3. **Staking Module Testing**
   - Test staking with small amounts (50-100 SWF)
   - Verify APR calculations (target: 25% APR)
   - Test reward distributions and claim functionality
   - Simulate multiple users with different stake amounts

4. **Liquidity Testing**
   - Test adding and removing liquidity in small amounts
   - Verify LP token balance tracking
   - Test reward distributions to LP token holders

### Testing Checklist

- [ ] Wallet-to-wallet transfers function correctly
- [ ] Token distribution percentages match specifications
- [ ] Staking rewards calculate correctly
- [ ] LP rewards distribute according to pool share
- [ ] Admin roles function with proper permissions
- [ ] Error states handled gracefully
- [ ] Blockchain interactions complete with optimal gas usage

---

## Liquidity Growth Strategy

### Strategic LP Growth Plan

To achieve sustainable growth and generate consistent passive income, follow this strategic liquidity provision plan:

#### Phase 1: Foundation (Weeks 1-8)
- Deposit $50 weekly to SWF/BNB liquidity pool
- Target: $400 total liquidity after 8 weeks
- Focus: 80% BNB / 20% SWF token ratio

#### Phase 2: Acceleration (Weeks 9-24)
- Continue $50 weekly deposits
- Target: $1,200 total liquidity after 24 weeks
- Begin harvesting 25% of LP rewards, reinvest 75%
- Focus: 70% BNB / 30% SWF token ratio

#### Phase 3: Yield Generation (Weeks 25+)
- Continue $50 weekly deposits
- Begin harvesting 40% of LP rewards ($800/month target)
- Reinvest 60% of rewards for compounding growth
- Focus: 60% BNB / 40% SWF token ratio for increased yield

### Liquidity Pool Selection Strategy

| Pool Type | Initial Allocation | Growth Focus | Reward Potential |
|-----------|-------------------|--------------|------------------|
| SWF/BNB | 80% | High | Primary income source |
| SWF/ETH | 20% | Medium | Diversification |
| SWF/USDC | 0% (Future) | Low | Stability |

---

## Passive Income Generation Plan

This plan outlines how to achieve a target of $800 monthly passive income with disciplined $50 weekly liquidity deposits.

### Income Projection Timetable

| Month | Cumulative<br>Investment | Est. Pool<br>Share | Monthly<br>Income | Harvest<br>Strategy |
|-------|----------------------|-------------------|-----------------|-------------------|
| 1-2 | $400 | 0.08% | $40 | 0% (Reinvest all) |
| 3-4 | $800 | 0.16% | $120 | 25% ($30) |
| 5-6 | $1,200 | 0.25% | $250 | 30% ($75) |
| 7-9 | $1,800 | 0.38% | $420 | 35% ($147) |
| 10-12 | $2,400 | 0.50% | $650 | 40% ($260) |
| 13-15 | $3,000 | 0.63% | $820 | 50% ($410) |
| 16+ | $3,400+ | 0.71%+ | $900+ | 80% ($720+) |

### Key Income Milestones

- **$100/month**: Achieved around week 12 ($600 liquidity)
- **$400/month**: Achieved around week 24 ($1,200 liquidity)
- **$800/month**: Achieved around week 60 ($3,000 liquidity)

### Reinvestment Strategy

To maximize growth and reach the $800/month target faster:
1. Reinvest 100% of rewards for first 8 weeks
2. Gradually increase harvest rate as portfolio grows
3. When reaching $800/month target, stabilize with 80% harvest / 20% reinvestment
4. Allocate 10% of harvested rewards to SWF staking for diversification

---

## Weekly Liquidity Deposits

### Optimal $50 Weekly Deposit Procedure

Follow this precise procedure for each weekly $50 deposit to maximize returns:

1. **Preparation (Day 1)**
   - Acquire exactly $40 worth of BNB and $10 worth of SWF
   - Store in admin wallet until optimal deposit time

2. **Market Timing (Day 2-3)**
   - Monitor SWF/BNB price ratio using LP Checker tool
   - Target deposit during low volatility period (typically Tues/Wed)
   - Check gas prices for optimal transaction fees

3. **Deposit Execution (Day 3-4)**
   - Access PancakeSwap Router interface via admin dashboard
   - Use "Add Liquidity" function with prepared tokens
   - Set slippage tolerance to 1% maximum
   - Record transaction hash and pool share metrics

4. **Post-Deposit Verification (Day 4-5)**
   - Verify LP token receipt in admin wallet
   - Update liquidity tracking spreadsheet with:
     - Date, amount, transaction hash
     - Current pool share percentage
     - Projected monthly yield
     - USD value of pool position

5. **Weekly Analytics Review (Day 7)**
   - Calculate weekly yield percentage
   - Adjust next week's allocation if needed
   - Update long-term projection model
   - Decide on reinvestment percentage based on current phase

### Weekly Deposit Schedule Template

| Week | Date | BNB Amt | SWF Amt | LP Tokens | Pool Share | Income Projection |
|------|------|---------|---------|----------|------------|-------------------|
| 1 | 05/07/25 | $40 | $10 | TBD | TBD | TBD |
| 2 | 05/14/25 | $40 | $10 | TBD | TBD | TBD |
| ... | ... | ... | ... | ... | ... | ... |

---

## Contract Interaction Guide

### SoloMethodEngine Interaction

The SoloMethodEngine contract (`0x87034C4A1C27DEd5d74819661318840C558bde00`) is the primary staking mechanism. Use these functions to manage staking:

```javascript
// Deposit SWF tokens to begin staking
async function stake(amount) {
  const amountWei = ethers.utils.parseEther(amount.toString());
  const tx = await soloMethodContract.connect(signer).stake(amountWei);
  return await tx.wait();
}

// Withdraw staked SWF tokens
async function withdraw(amount) {
  const amountWei = ethers.utils.parseEther(amount.toString());
  const tx = await soloMethodContract.connect(signer).withdraw(amountWei);
  return await tx.wait();
}

// Claim rewards without withdrawing stake
async function claimRewards() {
  const tx = await soloMethodContract.connect(signer).claim();
  return await tx.wait();
}

// Check user's current stake amount
async function checkStake(address) {
  const stakeAmount = await soloMethodContract.balanceOf(address);
  return ethers.utils.formatEther(stakeAmount);
}

// Check user's pending rewards
async function checkRewards(address) {
  const pendingRewards = await soloMethodContract.earned(address);
  return ethers.utils.formatEther(pendingRewards);
}
```

### PancakeSwap Router Interaction

Use these functions to interact with PancakeSwap for liquidity management:

```javascript
// Add liquidity to SWF/BNB pool
async function addLiquidity(swfAmount, bnbAmount) {
  const swfAmountWei = ethers.utils.parseEther(swfAmount.toString());
  const bnbAmountWei = ethers.utils.parseEther(bnbAmount.toString());
  
  // Approve router to spend SWF
  const approveTx = await swfContract.connect(signer).approve(
    ROUTER_ADDRESS, 
    swfAmountWei
  );
  await approveTx.wait();
  
  // Add liquidity
  const deadline = Math.floor(Date.now() / 1000) + 60 * 20; // 20 minutes
  const tx = await routerContract.connect(signer).addLiquidityETH(
    SWF_TOKEN_ADDRESS,
    swfAmountWei,
    swfAmountWei.mul(95).div(100), // 5% slippage
    bnbAmountWei.mul(95).div(100), // 5% slippage
    signer.address,
    deadline,
    { value: bnbAmountWei }
  );
  
  return await tx.wait();
}

// Remove liquidity from SWF/BNB pool
async function removeLiquidity(lpTokenAmount) {
  const lpTokenAmountWei = ethers.utils.parseEther(lpTokenAmount.toString());
  
  // Approve router to spend LP tokens
  const approveTx = await lpContract.connect(signer).approve(
    ROUTER_ADDRESS, 
    lpTokenAmountWei
  );
  await approveTx.wait();
  
  // Remove liquidity
  const deadline = Math.floor(Date.now() / 1000) + 60 * 20; // 20 minutes
  const tx = await routerContract.connect(signer).removeLiquidityETH(
    SWF_TOKEN_ADDRESS,
    lpTokenAmountWei,
    0, // min SWF return
    0, // min BNB return
    signer.address,
    deadline
  );
  
  return await tx.wait();
}
```

---

## Monitoring & Analytics

### Integrated Dashboard Access

The SWF platform includes several integrated dashboards for comprehensive monitoring:

1. **Liquidity Income Tracker Dashboard**
   - Access from the main admin dashboard by clicking the "Liquidity Income Tracker" button (purple gradient)
   - Provides real-time tracking of progress toward the $800/month passive income goal
   - Shows detailed charts of weekly deposits and projected timeline
   - Visualizes pool distribution and income projections

2. **External SWF Dashboard**
   - Access from the main admin dashboard by clicking the "External SWF Dashboard" button (orange gradient)
   - Links to the https://replit.com/@pnandnpn/SovranWealthToken dashboard
   - Provides additional SWF token metrics and analysis

3. **Admin Dashboard Analytics**
   - Access "Admin Dashboard" from main navigation
   - Comprehensive view of all platform metrics in one place
   - Unified reporting and data visualization

### Admin Dashboard Analytics

The admin dashboard provides real-time analytics for monitoring SWF ecosystem health:

1. **Liquidity Monitoring**
   - Access "LP Pool Tracker" from admin navigation
   - Monitor total liquidity value (target: steady growth)
   - Track liquidity distribution across pools
   - Check 24h volume and trading activity

2. **Staking Analytics**
   - Access "Staking Overview" from admin navigation
   - Monitor total staked SWF (target: >10% of supply)
   - Check current APR calculations
   - Review reward distribution efficiency

3. **Income Projection Tools**
   - Access "Income Projector" from admin dashboard
   - Input current liquidity position to calculate yields
   - Adjust weekly deposit amounts to model outcomes
   - Generate income projection reports

### Critical Metrics to Monitor

| Metric | Target Range | Check Frequency | Alert Threshold |
|--------|--------------|-----------------|-----------------|
| Total Liquidity | Growing 10%+ monthly | Daily | <5% monthly growth |
| Pool Share | >0.5% | Weekly | <0.3% |
| LP Token Price | Stable or increasing | Daily | >5% decrease |
| Trading Volume | >$1,000 daily | Daily | <$500 daily |
| Impermanent Loss | <2% monthly | Weekly | >5% monthly |
| SWF Price | Stable or increasing | Hourly | >10% decrease |
| Gas Costs | <0.5% of transaction | Per transaction | >1% of transaction |

---

## Troubleshooting

### Common Issues & Resolutions

| Issue | Probable Cause | Resolution |
|-------|----------------|------------|
| Transaction Failure | Insufficient gas | Increase gas limit by 20% |
| | Slippage too low | Increase slippage tolerance to 2-3% |
| | Blockchain congestion | Wait for less congested period |
| | Contract approval missing | Approve contract to spend tokens first |
| Low Rewards | Stake too small | Increase stake amount |
| | Incorrect calculation | Verify reward calculation formula |
| | Contract delay | Wait for next reward cycle |
| LP Token Value Decrease | Impermanent loss | Normal for volatile pairs; hold long-term |
| | Market downturn | Consider adding more liquidity at lower prices |
| Wallet Connection Issue | MetaMask error | Reset MetaMask or clear browser cache |
| | RPC connection failed | Switch to alternate RPC endpoint |
| | Network mismatch | Verify connected to BSC Mainnet |

### Emergency Procedures

In case of critical issues, follow these emergency procedures:

1. **Suspicious Activity**
   - Immediately lock admin dashboard access
   - Disconnect all wallet connections
   - Contact security team at security@swf.org
   - Document all suspicious transactions

2. **Significant Price Volatility**
   - Pause new liquidity additions
   - Move to monitoring-only mode
   - Document market conditions
   - Resume normal operations when volatility subsides

3. **Contract Malfunction**
   - Document exact error conditions
   - Contact development team via emergency channel
   - Prepare contingency funds if needed
   - Follow incident response protocol

---

## Security Best Practices

### Admin Wallet Security

1. **Hardware Wallet Requirement**
   - Use hardware wallets (Ledger/Trezor) for primary admin wallets
   - Never store private keys in plain text
   - Use separate devices for admin access than regular browsing

2. **Multi-Signature Operations**
   - All major financial operations require 2/3 admin signatures
   - Use time-locks for large transactions
   - Implement approval workflows for critical functions

3. **Access Management**
   - Rotate admin credentials every 30 days
   - Use unique credentials per admin
   - Implement IP restrictions for admin access
   - Enable detailed access logs

### Operational Security

1. **Transaction Verification**
   - Always verify contract addresses before transactions
   - Double-check token amounts before confirmations
   - Use test transactions before large transfers
   - Verify gas limits to prevent excessive costs

2. **Backup Procedures**
   - Maintain encrypted backups of all wallet recovery phrases
   - Store backups in multiple secure locations
   - Test recovery procedures quarterly
   - Document all backup access procedures

3. **Regular Security Review**
   - Conduct monthly security audits of all procedures
   - Update security protocols based on findings
   - Train all admins on latest security practices
   - Test incident response with simulated breaches

---

*This manual is confidential and intended only for authorized SWF administrators. Unauthorized access or distribution is prohibited.*

*© 2025 Sovran Wealth Fund*
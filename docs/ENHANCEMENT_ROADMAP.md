# AXUSD Ecosystem Enhancement Roadmap

Created: January 12, 2026
Last Updated: January 12, 2026

---

## Phase 1: Wallet Integration & Live Data (Priority: High)

### 1.1 Land Crowdfunding - Wallet Connection
- [ ] Connect portfolio to MetaMask wallet
- [ ] Display investments based on connected wallet address
- [ ] Remove hardcoded user ID dependency
- **Files:** `pages/land-acquisition/portfolio.tsx`, `pages/api/land-acquisition/investor/portfolio.ts`

### 1.2 LP Incentives - Live Pool Data
- [ ] Pull real TVL from Camelot AXUSD/USDC pool (0x266F6Cf7eA36d3f676eb292B274EAb25172790a2)
- [ ] Display actual 24h volume and fees from on-chain data
- [ ] Calculate real APR based on pool activity
- **Files:** `pages/liquidity.tsx`, `pages/api/treasury/liquidity.ts`

### 1.3 Your Position Tracker
- [ ] Show user's LP token balance from connected wallet
- [ ] Calculate share of pool percentage
- [ ] Display unclaimed AXM rewards
- **Files:** `pages/liquidity.tsx`, `pages/api/axusd/incentives.ts`

---

## Phase 2: AXUSD Payment Integration (Priority: High)

### 2.1 Land Investment with AXUSD
- [ ] Add AXUSD as payment option for crowdfunding investments
- [ ] Integrate with PSM contract for AXUSD transactions
- [ ] Show AXUSD balance in investment modal
- **Contracts:** PSM at `0x6a858592A04E947f7b73c21bE127969874128EA3`
- **Files:** `pages/land-acquisition/`, `pages/api/land-acquisition/investments.ts`

### 2.2 LP Rewards in AXUSD
- [ ] Option to receive LP rewards in AXUSD instead of AXM
- [ ] Auto-compound rewards into LP position
- **Files:** `pages/liquidity.tsx`, `pages/api/axusd/incentives.ts`

---

## Phase 3: Visual Enhancements (Priority: Medium)

### 3.1 Investment Performance Charts
- [ ] Portfolio value over time chart
- [ ] Individual investment performance graphs
- [ ] Gain/loss visualization with color coding
- **Files:** `pages/land-acquisition/portfolio.tsx`

### 3.2 Property Images & Maps
- [ ] Display property featured images on investment cards
- [ ] Integrate map view showing property locations
- [ ] Image gallery for each campaign
- **Files:** `pages/land-acquisition/portfolio.tsx`, `pages/land-acquisition/[campaignId].tsx`

### 3.3 Consistent White Background UI
- [ ] Update Land Portfolio to match clean 3D immersive design
- [ ] Update LP Incentives page styling
- [ ] Add layered shadows and gradient backgrounds
- [ ] Apply SiteLayout wrapper for navigation consistency
- **Files:** `pages/land-acquisition/portfolio.tsx`, `pages/liquidity.tsx`

---

## Phase 4: Interactive Features (Priority: Medium)

### 4.1 Reward Calculator
- [ ] Interactive tool for projecting earnings
- [ ] Input fields for deposit amount and lock duration
- [ ] Real-time APR calculation with bonus tiers
- **Files:** `pages/liquidity.tsx`

### 4.2 Bonus Tier Progress Indicator
- [ ] Visual progress bar showing current tier
- [ ] Pioneer (2x) → Early Adopter (1.5x) → Builder (1.25x) → Standard (1x)
- [ ] Show TVL thresholds and next tier requirements
- **Files:** `pages/liquidity.tsx`, `components/BonusTierProgress.tsx`

### 4.3 Lock Duration Selector
- [ ] UI slider/buttons for 30/90/180 day lock periods
- [ ] Preview boosted APR before committing
- [ ] Show unlock countdown for existing positions
- **Files:** `pages/liquidity.tsx`

---

## Phase 5: On-Chain Actions (Priority: Medium)

### 5.1 Claim Rewards Button
- [ ] One-click harvest for AXM rewards
- [ ] Transaction status and confirmation modal
- [ ] Historical claims record
- **Files:** `pages/liquidity.tsx`, `lib/services/LiquidityService.ts`

### 5.2 Quick Actions Panel
- [ ] "Invest More" button on investment cards
- [ ] "Sell Shares" link to secondary market
- [ ] "Vote" button for active governance proposals
- **Files:** `pages/land-acquisition/portfolio.tsx`

### 5.3 Add Liquidity Flow
- [ ] Connect "Add Liquidity" button to Camelot pool
- [ ] Show slippage settings and preview
- [ ] Approve + deposit in one flow
- **Files:** `pages/liquidity.tsx`, `lib/services/LiquidityService.ts`

---

## Phase 6: Cross-Feature Integration (Priority: Low)

### 6.1 Unified Dashboard
- [ ] Single view combining:
  - Land portfolio value
  - LP position value
  - AXUSD balance
  - Total ecosystem participation
- **Files:** `pages/dashboard.tsx` (new), `pages/api/dashboard/summary.ts`

### 6.2 AXUSD Earnings → Land Investment
- [ ] Quick action to move LP rewards into land crowdfunding
- [ ] "Invest Rewards" button on liquidity page
- [ ] Seamless flow without leaving platform
- **Files:** `pages/liquidity.tsx`, `lib/services/CrossInvestmentService.ts`

### 6.3 Portfolio Performance Analytics
- [ ] Combined ROI across all investments
- [ ] Comparison charts between asset types
- [ ] Tax reporting data export
- **Files:** `pages/analytics.tsx` (new)

---

## Implementation Notes

### Database Tables Involved
- `crowdfunding_investments` - Land investment records
- `crowdfunding_campaigns` - Campaign details
- `lp_incentive_programs` - Active reward programs
- `lp_positions` - User LP positions
- `axusd_transactions` - Stablecoin activity

### Smart Contracts
- PSM: `0x6a858592A04E947f7b73c21bE127969874128EA3`
- AXUSD: `0x53B983e1DaB6c24D13f7A5B87791f06A19C4488C`
- USDC: `0xaf88d065e77c8cC2239327C5EDb3A432268e5831`
- Camelot Pool: `0x266F6Cf7eA36d3f676eb292B274EAb25172790a2`

### API Requirements
- Raw SQL queries only for AXUSD-related endpoints (user preference)
- Use Drizzle ORM for other database operations

---

## Progress Tracking

| Phase | Status | Started | Completed |
|-------|--------|---------|-----------|
| Phase 1 | Not Started | - | - |
| Phase 2 | Not Started | - | - |
| Phase 3 | Not Started | - | - |
| Phase 4 | Not Started | - | - |
| Phase 5 | Not Started | - | - |
| Phase 6 | Not Started | - | - |

---

## How to Use This Roadmap

1. Pick a phase to work on
2. Tell me which items you want to implement
3. I'll create a task list and build it out
4. Check off items as we complete them
5. Update the progress table

Ready to start whenever you are!

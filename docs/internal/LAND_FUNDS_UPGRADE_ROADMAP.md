# Community Land Funds Upgrade Roadmap
## Internal Implementation Guide

**Goal:** 10,000 new investors at $100/month in 30 days  
**Traffic Sources:** TikTok (70k views), Facebook Ads, Email Nurture  
**Created:** January 2026  
**Status:** Planning → Phase 1

---

## Executive Summary

This roadmap outlines the 4-phase upgrade of the Community Land Funds page to maximize conversions from paid advertising traffic. The focus is on removing friction, building trust, creating urgency, and enabling viral growth through referrals.

---

## Phase Overview

| Phase | Week | Focus | Goal |
|-------|------|-------|------|
| Phase 1 | Week 1 | Conversion Core | Ship before ads run |
| Phase 2 | Week 2 | Momentum Engine | FOMO + Social Proof |
| Phase 3 | Week 3 | Viral Growth | Referral multiplier |
| Phase 4 | Week 4 | Story + Depth | Sustain momentum |

---

## PHASE 1: Conversion Core (Week 1)

**Priority:** CRITICAL - Must complete before running TikTok/Facebook ads

### Features to Build

#### 1.1 Mobile-First Hero Section
- [ ] Above-fold hero optimized for mobile
- [ ] Clear value proposition: "Own Land for $100/Month"
- [ ] Primary CTA button prominent
- [ ] Trust badges visible immediately

#### 1.2 $100/Month Investment Calculator
- [ ] Interactive slider component
- [ ] Shows ownership over time (1yr, 5yr, 10yr)
- [ ] Converts monthly to yearly totals
- [ ] "Your Future Ownership" visualization
- [ ] Direct CTA: "Start My Journey"

#### 1.3 Payment Plan Selector
- [ ] $25/week option
- [ ] $100/month option (default)
- [ ] $1,200/year option (highlight savings)
- [ ] Plan comparison display
- [ ] Easy switching between plans

#### 1.4 One-Click Signup Flow
- [ ] Minimal form: Email + Name only initially
- [ ] Plan selection integrated
- [ ] AXUSD payment or fiat onramp option
- [ ] Progress indicator (3 steps max)
- [ ] Wallet connection optional (not required)
- [ ] Stripe integration for fiat payments

#### 1.5 Trust Badges + Reg CF Disclosure
- [ ] "SEC Reg CF Compliant" badge
- [ ] "Open to All Americans" badge
- [ ] "Blockchain Verified" badge
- [ ] Quick FAQ accordion (5 questions max)
- [ ] Link to full disclosure document
- [ ] Investment limit calculator widget

#### 1.6 UTM + Campaign Tracking
- [ ] Capture UTM parameters on landing
- [ ] Store attribution data in database
- [ ] Referral code parameter support (?ref=CODE)
- [ ] Track funnel events (view, start, complete)

### Database Schema Additions (Phase 1)

```sql
-- Attribution tracking for ads
CREATE TABLE attribution (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  session_id VARCHAR(255),
  utm_source VARCHAR(100),
  utm_medium VARCHAR(100),
  utm_campaign VARCHAR(100),
  utm_content VARCHAR(100),
  utm_term VARCHAR(100),
  referral_code VARCHAR(50),
  landing_page VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Investment subscriptions (payment plans)
CREATE TABLE investor_subscriptions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  plan_type VARCHAR(20) NOT NULL, -- 'weekly', 'monthly', 'annual'
  amount_cents INTEGER NOT NULL,
  currency VARCHAR(10) DEFAULT 'USD',
  status VARCHAR(20) DEFAULT 'active', -- 'active', 'paused', 'cancelled'
  stripe_subscription_id VARCHAR(255),
  parcel_id VARCHAR(50),
  start_date TIMESTAMP DEFAULT NOW(),
  cancel_date TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### API Endpoints (Phase 1)

```
POST /api/land-funds/subscribe
  - Create new investor subscription
  - Validate Reg CF limits
  - Process payment (Stripe or AXUSD)

POST /api/land-funds/track
  - Track UTM attribution
  - Record funnel events

GET /api/land-funds/investment-limits
  - Calculate SEC Reg CF limits for user
  - Return max investment allowed
```

### Files to Create/Modify

```
pages/land-funds/index.tsx          -- Major redesign
components/land-funds/
  ├── HeroSection.tsx               -- New mobile-first hero
  ├── InvestmentCalculator.tsx      -- New calculator widget
  ├── PaymentPlanSelector.tsx       -- New plan chooser
  ├── QuickSignupFlow.tsx           -- New signup modal/flow
  ├── TrustBadges.tsx               -- New badges component
  └── RegCFDisclosure.tsx           -- New disclosure accordion

pages/api/land-funds/
  ├── subscribe.ts                  -- New subscription endpoint
  ├── track.ts                      -- New tracking endpoint
  └── investment-limits.ts          -- New limits calculator

lib/land-funds/
  ├── attribution.ts                -- UTM tracking utilities
  └── subscriptionService.ts        -- Subscription logic
```

### Success Metrics (Phase 1)
- [ ] Page loads in < 2 seconds on mobile
- [ ] Above-fold CTA visible without scrolling
- [ ] Signup flow completes in < 60 seconds
- [ ] UTM parameters captured correctly
- [ ] Payment processing works end-to-end

---

## PHASE 2: Momentum Engine (Week 2)

**Priority:** HIGH - Deploy while ads are running

### Features to Build

#### 2.1 Live Funding Ticker
- [ ] Real-time investor activity feed
- [ ] "John from Atlanta just invested $100"
- [ ] Anonymous option: "Someone invested $100"
- [ ] Animated notifications (slide in/out)
- [ ] API endpoint for recent investments

#### 2.2 Urgency + Countdown Elements
- [ ] Campaign end date countdown timer
- [ ] "Only X shares remaining" indicator
- [ ] "X% funded" progress bar enhancement
- [ ] Visual urgency (color changes at milestones)

#### 2.3 Founding Member Badge System
- [ ] "First 10,000 Investors" exclusive status
- [ ] Live counter: "Only X,XXX spots remaining"
- [ ] Badge preview visualization
- [ ] Optional: ERC-1155 NFT badge (on-chain)
- [ ] Founding member benefits list

#### 2.4 Social Proof Widgets
- [ ] Total investor count (prominent)
- [ ] Recent milestone celebrations
- [ ] Community stats dashboard
- [ ] Optional: Investor testimonials carousel

### Database Schema Additions (Phase 2)

```sql
-- Founding member tracking
CREATE TABLE founding_members (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) UNIQUE,
  rank INTEGER NOT NULL, -- 1-10000
  status VARCHAR(20) DEFAULT 'active',
  badge_claimed BOOLEAN DEFAULT FALSE,
  badge_token_id VARCHAR(100),
  claimed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Investment activity log (for ticker)
CREATE TABLE investment_activity (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  parcel_id VARCHAR(50),
  amount_cents INTEGER NOT NULL,
  display_name VARCHAR(100), -- "John from Atlanta"
  city VARCHAR(100),
  state VARCHAR(50),
  is_public BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### API Endpoints (Phase 2)

```
GET /api/land-funds/activity
  - Return recent investment activity
  - Respect privacy settings

GET /api/land-funds/founding-status
  - Check current founding member count
  - Return remaining spots

POST /api/land-funds/claim-founding
  - Register user as founding member
  - Assign rank number
```

### Files to Create/Modify

```
components/land-funds/
  ├── LiveTicker.tsx                -- New activity ticker
  ├── CountdownTimer.tsx            -- New urgency timer
  ├── FoundingMemberBadge.tsx       -- New badge display
  ├── SocialProofBar.tsx            -- New stats bar
  └── UrgencyBanner.tsx             -- New scarcity banner

pages/api/land-funds/
  ├── activity.ts                   -- New activity endpoint
  ├── founding-status.ts            -- New founding endpoint
  └── claim-founding.ts             -- New claim endpoint
```

### Success Metrics (Phase 2)
- [ ] Live ticker updates in real-time
- [ ] Founding member counter accurate
- [ ] Urgency elements drive increased conversions
- [ ] 10%+ improvement in conversion rate

---

## PHASE 3: Viral Growth (Week 3)

**Priority:** HIGH - Multiply ad spend ROI

### Features to Build

#### 3.1 Referral Program Core
- [ ] Unique referral code per user
- [ ] Referral link generation
- [ ] Shareable link with preview
- [ ] Track clicks, signups, investments

#### 3.2 Referral Rewards System
- [ ] "Invite 3, Get 1 Month Free" mechanic
- [ ] Milestone rewards (5, 10, 25 referrals)
- [ ] Bonus shares for top recruiters
- [ ] Reward distribution automation

#### 3.3 Referral Dashboard
- [ ] View all referrals and status
- [ ] Earnings/rewards tracker
- [ ] Shareable stats cards
- [ ] Social sharing buttons

#### 3.4 Referral Leaderboard
- [ ] Top recruiters ranking
- [ ] Weekly/monthly leaderboards
- [ ] Community challenges
- [ ] Public recognition

### Database Schema Additions (Phase 3)

```sql
-- Referral codes
CREATE TABLE referral_codes (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  code VARCHAR(20) UNIQUE NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Referral tracking
CREATE TABLE referrals (
  id SERIAL PRIMARY KEY,
  referrer_user_id INTEGER REFERENCES users(id),
  referred_user_id INTEGER REFERENCES users(id),
  referral_code VARCHAR(20),
  status VARCHAR(20) DEFAULT 'clicked', -- 'clicked', 'signed_up', 'invested'
  reward_status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'earned', 'paid'
  reward_amount_cents INTEGER,
  created_at TIMESTAMP DEFAULT NOW(),
  converted_at TIMESTAMP
);

-- Referral events log
CREATE TABLE referral_events (
  id SERIAL PRIMARY KEY,
  referral_id INTEGER REFERENCES referrals(id),
  event_type VARCHAR(50) NOT NULL,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Referral rewards
CREATE TABLE referral_rewards (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  reward_type VARCHAR(50), -- 'free_month', 'bonus_shares', 'cash'
  reward_value INTEGER,
  trigger_referral_count INTEGER,
  status VARCHAR(20) DEFAULT 'pending',
  claimed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### API Endpoints (Phase 3)

```
GET /api/referrals/my-code
  - Get or generate user's referral code

GET /api/referrals/stats
  - Return user's referral statistics

POST /api/referrals/track-click
  - Record referral link click

GET /api/referrals/leaderboard
  - Return top referrers

POST /api/referrals/claim-reward
  - Claim earned referral reward
```

### Files to Create/Modify

```
pages/land-funds/referrals.tsx      -- New referral dashboard page
components/land-funds/
  ├── ReferralWidget.tsx            -- Inline referral CTA
  ├── ReferralDashboard.tsx         -- Full dashboard
  ├── ReferralLeaderboard.tsx       -- Leaderboard display
  ├── ShareButtons.tsx              -- Social sharing
  └── RewardProgress.tsx            -- Reward progress tracker

pages/api/referrals/
  ├── my-code.ts                    -- Generate/get code
  ├── stats.ts                      -- User stats
  ├── track-click.ts                -- Click tracking
  ├── leaderboard.ts                -- Leaderboard data
  └── claim-reward.ts               -- Claim rewards

lib/referrals/
  ├── referralService.ts            -- Core referral logic
  └── rewardService.ts              -- Reward distribution
```

### Success Metrics (Phase 3)
- [ ] 50%+ of new investors share referral link
- [ ] 2x viral coefficient (each investor brings 2+)
- [ ] Referral rewards distributed correctly
- [ ] Leaderboard drives competition

---

## PHASE 4: Story + Depth (Week 4)

**Priority:** MEDIUM - Sustain momentum and retention

### Features to Build

#### 4.1 "Why We're Buying Land Back" Video Section
- [ ] Emotional storytelling video embed
- [ ] Heir property crisis statistics
- [ ] Historical context on Black land ownership
- [ ] Call to action after video

#### 4.2 Parcel Detail Pages
- [ ] Individual page per parcel: /land-funds/[parcel-id]
- [ ] Full property details and history
- [ ] Photo gallery (real or satellite)
- [ ] Interactive map integration
- [ ] Due diligence documents
- [ ] Steward information

#### 4.3 Investment Journey Tracker
- [ ] Dashboard for logged-in investors
- [ ] Portfolio view across all parcels
- [ ] Monthly contribution history
- [ ] Total ownership visualization
- [ ] Projected future ownership

#### 4.4 Community Circle Integration
- [ ] "Invest with your Purpose Group" feature
- [ ] Group investment challenges
- [ ] Social accountability features
- [ ] Group progress tracking

#### 4.5 Progress Visualization
- [ ] "Your $100 = X square feet" calculator
- [ ] Physical stake visualization
- [ ] Map overlay of ownership
- [ ] Milestone celebrations

### Files to Create/Modify

```
pages/land-funds/[parcelId].tsx     -- New parcel detail page
pages/land-funds/dashboard.tsx      -- New investor dashboard
components/land-funds/
  ├── StoryVideoSection.tsx         -- Narrative video embed
  ├── ParcelGallery.tsx             -- Photo gallery
  ├── ParcelMap.tsx                 -- Interactive map
  ├── InvestorDashboard.tsx         -- Portfolio dashboard
  ├── ContributionHistory.tsx       -- Payment history
  ├── OwnershipVisualization.tsx    -- Ownership display
  └── GroupInvestWidget.tsx         -- Community integration
```

### Success Metrics (Phase 4)
- [ ] Video completion rate > 50%
- [ ] Parcel detail pages reduce support questions
- [ ] Dashboard increases retention
- [ ] Group features increase engagement

---

## Technical Architecture

### Component Structure

```
components/land-funds/
├── core/
│   ├── HeroSection.tsx
│   ├── InvestmentCalculator.tsx
│   ├── PaymentPlanSelector.tsx
│   └── QuickSignupFlow.tsx
├── trust/
│   ├── TrustBadges.tsx
│   ├── RegCFDisclosure.tsx
│   └── InvestmentLimits.tsx
├── urgency/
│   ├── LiveTicker.tsx
│   ├── CountdownTimer.tsx
│   ├── UrgencyBanner.tsx
│   └── FoundingMemberBadge.tsx
├── social/
│   ├── SocialProofBar.tsx
│   ├── TestimonialCarousel.tsx
│   └── ShareButtons.tsx
├── referral/
│   ├── ReferralWidget.tsx
│   ├── ReferralDashboard.tsx
│   ├── ReferralLeaderboard.tsx
│   └── RewardProgress.tsx
├── depth/
│   ├── ParcelDetail.tsx
│   ├── ParcelGallery.tsx
│   ├── ParcelMap.tsx
│   └── StoryVideoSection.tsx
└── dashboard/
    ├── InvestorDashboard.tsx
    ├── ContributionHistory.tsx
    ├── OwnershipVisualization.tsx
    └── GroupInvestWidget.tsx
```

### API Structure

```
pages/api/land-funds/
├── subscribe.ts          -- Create subscription
├── track.ts              -- Attribution tracking
├── investment-limits.ts  -- Reg CF limits
├── activity.ts           -- Recent activity
├── founding-status.ts    -- Founding member status
└── claim-founding.ts     -- Claim founding badge

pages/api/referrals/
├── my-code.ts            -- Get referral code
├── stats.ts              -- Referral stats
├── track-click.ts        -- Click tracking
├── leaderboard.ts        -- Top referrers
└── claim-reward.ts       -- Claim rewards
```

### Database Tables Summary

```
PHASE 1:
├── attribution
└── investor_subscriptions

PHASE 2:
├── founding_members
└── investment_activity

PHASE 3:
├── referral_codes
├── referrals
├── referral_events
└── referral_rewards
```

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Ads launch before page ready | Complete Phase 1 BEFORE any ad spend |
| Low conversion rate | A/B test CTAs, iterate quickly |
| Referral fraud | Rate limiting, verification requirements |
| SEC compliance issues | Enforce investment limits in code |
| Payment failures | Retry logic, clear error messages |
| Mobile performance | Optimize images, lazy load components |

---

## Success Metrics Summary

| Phase | Key Metric | Target |
|-------|------------|--------|
| Phase 1 | Signup completion rate | > 5% of visitors |
| Phase 2 | Urgency impact | +10% conversion lift |
| Phase 3 | Viral coefficient | > 2x (each brings 2+) |
| Phase 4 | Retention | > 80% month-2 retention |
| Overall | Total investors | 10,000 in 30 days |

---

## Timeline

```
WEEK 1 (Phase 1: Conversion Core)
├── Day 1-2: Hero + Calculator + CTA
├── Day 3-4: Payment Plans + Signup Flow
├── Day 5-6: Trust Badges + Disclosure
└── Day 7: UTM Tracking + Testing

WEEK 2 (Phase 2: Momentum Engine)
├── Day 8-9: Live Ticker + Activity Feed
├── Day 10-11: Countdown + Urgency
├── Day 12-13: Founding Member System
└── Day 14: Social Proof + Testing

WEEK 3 (Phase 3: Viral Growth)
├── Day 15-16: Referral Core + Codes
├── Day 17-18: Rewards System
├── Day 19-20: Dashboard + Sharing
└── Day 21: Leaderboard + Testing

WEEK 4 (Phase 4: Story + Depth)
├── Day 22-23: Story Video Section
├── Day 24-25: Parcel Detail Pages
├── Day 26-27: Investor Dashboard
└── Day 28-30: Polish + Optimization
```

---

## Next Steps

1. [ ] Review and approve this roadmap
2. [ ] Start Phase 1 implementation
3. [ ] Set up tracking infrastructure early
4. [ ] Prepare ad creatives in parallel
5. [ ] Plan email sequences for nurture funnel

---

**Document Status:** INTERNAL ONLY  
**Last Updated:** January 2026  
**Owner:** Development Team

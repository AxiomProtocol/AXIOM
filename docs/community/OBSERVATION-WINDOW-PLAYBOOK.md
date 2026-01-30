# Observation Window Playbook
**Period:** January 30, 2026 - March 26, 2026 (55 days)
**Status:** LOCKED - Follow this guide exactly

---

## Purpose

The observation window allows external parties to evaluate protocol behavior, security, and reliability before committing capital. Build credibility through transparency, activity, and community engagement.

---

## Phase 1: Immediate (Days 1-14)

### 1. Submit Grant Application
- Submit to Arbitrum Foundation Grants program
- Category: DeFi/RWA Infrastructure ($20K-$150K)
- Use prepared proposal document: `docs/grants/AXM-GRANT-001-arbitrum-step2-proposal.md`

### 2. List on DeFi Aggregators
- DeFiLlama: Submit vault for TVL tracking
- Euler Leaderboard: Ensure vault appears correctly
- Coingecko/CMC: Submit AXUSD token listing

### 3. Documentation Push
- Publish technical docs on GitBook or docs site
- Create borrower guide with step-by-step instructions
- Create LP guide explaining yield mechanics

### 4. Social Presence
- Announce Euler V2 integration on Twitter/X
- Post in Euler Discord community
- Post in Arbitrum Discord community
- Create thread explaining RWA collateral innovation

---

## Phase 2: External Adoption (Days 15-45)

### 1. Target External LPs

**a) Euler Native Users**
- Post in Euler governance forum
- Engage with Euler community on Discord
- Target existing eUSDC/eWETH depositors

**b) Yield Farmers**
- Post on yield aggregator communities (Yearn, Beefy forums)
- Reddit: r/defi, r/ethereum, r/arbitrum
- Telegram yield farming groups

**c) Stablecoin Enthusiasts**
- Stablecoin-focused DAOs
- Treasury management communities
- DeFi governance forums

### 2. Content Marketing
- Week 2: "What is AXUSD?" explainer thread
- Week 3: "Euler V2 Integration Deep Dive" article
- Week 4: "RWA Collateral: The Future of DeFi Lending" piece
- Week 5: "Observation Window Update #1" transparency report
- Week 6: "Observation Window Update #2" with metrics

### 3. Partnership Outreach
- Ondo Finance (USDY issuer) - discuss collateral integration
- Spiko (USTBL issuer) - discuss collateral integration
- Euler Labs - discuss grant or co-marketing
- Arbitrum Foundation - follow up on grant

---

## Phase 3: Credibility Building (Days 45-55)

### 1. Transparency Reports
Publish weekly reports including:
- Current TVL
- Utilization rate
- Number of unique LPs
- Number of unique borrowers
- Any liquidations (should be zero)
- Protocol revenue collected
- Fee distribution to Revenue Router

### 2. Security Focus
- If grant received, commission audit
- Publish all governance transactions
- Document any parameter changes
- Maintain clean incident record

### 3. Prepare for Post-Observation
- Draft post-observation announcement
- Prepare for full external investment mode
- Plan LP incentive program launch

---

## Daily Monitoring Checklist

- [ ] Check vault stats: /api/euler/vault-stats
- [ ] Monitor TVL changes on Euler app
- [ ] Check for any borrowing activity
- [ ] Review console logs for errors
- [ ] Monitor Arbitrum network status
- [ ] Check social mentions of AXUSD

---

## Key Metrics to Track

| Metric | Target (End of Window) |
|--------|------------------------|
| TVL | $10,000 - $50,000 |
| Unique LPs | 5-10 |
| Borrowers | 1-3 test borrows |
| Liquidations | 0 |
| Uptime | 100% |
| Security Incidents | 0 |

---

## What NOT To Do

- Do NOT enable external investment flows yet
- Do NOT change vault parameters without documentation
- Do NOT remove observation window guards
- Do NOT promise specific yields (regulatory risk)
- Do NOT spend treasury capital on liquidity
- Do NOT deploy untested contract changes

---

## Resources

| Resource | Location |
|----------|----------|
| Observer Dashboard | /observer |
| Vault Stats API | /api/euler/vault-stats |
| Euler App | https://app.euler.finance/vault/0xe3048078286eA27fF91Eed10AA5FD749F0Ce7059 |
| Arbiscan | https://arbiscan.io/address/0xe3048078286eA27fF91Eed10AA5FD749F0Ce7059 |
| SOP Document | docs/lending/SOP-euler-v2-axusd-vault-config.md |

---

## Weekly Milestones

| Week | Dates | Focus |
|------|-------|-------|
| 1 | Jan 30 - Feb 5 | Submit grant, announce integration |
| 2 | Feb 6 - Feb 12 | DeFiLlama listing, first LP outreach |
| 3 | Feb 13 - Feb 19 | Content push, partnership emails |
| 4 | Feb 20 - Feb 26 | First transparency report |
| 5 | Feb 27 - Mar 5 | Community engagement push |
| 6 | Mar 6 - Mar 12 | Second transparency report |
| 7 | Mar 13 - Mar 19 | Pre-launch preparation |
| 8 | Mar 20 - Mar 26 | Final review, prepare for full launch |

---

## Post-Observation (After March 26, 2026)

1. Remove observation window restrictions
2. Enable external investment flows
3. Launch LP incentive program (if grant received)
4. Deploy additional collateral types (USDT, ARB)
5. Deploy Morpho markets
6. Begin institutional outreach

---

**Document Version:** 1.0
**Last Updated:** January 30, 2026
**Status:** LOCKED

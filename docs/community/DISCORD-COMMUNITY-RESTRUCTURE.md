# Discord Community Restructure
**Document ID:** AXM-COMM-001
**Version:** 1.0
**Date:** January 30, 2026
**Status:** Ready for Implementation

---

## Community Rename

### Current Name
Axiom Discord Community

### Recommended New Names (Choose One)

| Option | Rationale |
|--------|-----------|
| **Axiom Builders Hub** | Emphasizes building infrastructure, covers both land and DeFi |
| **Axiom Infrastructure Collective** | Technical, institutional feel |
| **Axiom Protocol Community** | Broader umbrella for all products |
| **The Axiom Commons** | Community-focused, covers shared resources |

**Recommendation:** "Axiom Builders Hub" - covers land builders and DeFi infrastructure builders.

---

## Server Structure

### Category 1: WELCOME
```
#welcome
#rules-and-guidelines
#start-here
#announcements
```

### Category 2: LAND RECLAMATION
```
#heir-property-101
#research-questions
#workbook-support
#success-stories
#document-help
```

### Category 3: COMMUNITY LAND FUND
```
#land-fund-updates
#stewardship-applications
#land-opportunities
```

### Category 4: AXUSD VAULT OBSERVERS (NEW)
```
#vault-overview
#technical-discussion
#weekly-reports
#risk-mechanics
#feedback-and-questions
```

### Category 5: GOVERNANCE
```
#proposals
#voting
#treasury-transparency
```

### Category 6: GENERAL
```
#introductions
#off-topic
#resources
```

---

## Channel Descriptions

### AXUSD VAULT OBSERVERS Category

**#vault-overview**
> Technical overview of the AXUSD Euler V2 Lending Vault on Arbitrum One. Educational content only. This is an observation space, not investment advice.

**#technical-discussion**
> Discuss vault mechanics, liquidation processes, collateral parameters, and Euler V2 architecture. Technical questions welcome.

**#weekly-reports**
> Weekly transparency reports on vault metrics: TVL, utilization, borrowing activity, and protocol health.

**#risk-mechanics**
> Understanding LTV ratios, liquidation thresholds, oracle feeds, and risk parameters. Educational discussion only.

**#feedback-and-questions**
> Share observations, report issues, suggest improvements. Your feedback shapes the protocol.

---

## Pinned Messages & Posts

### #rules-and-guidelines (Update)

```text
AXIOM BUILDERS HUB - COMMUNITY GUIDELINES

Welcome to the Axiom Builders Hub. This is a technical and educational community for those building wealth infrastructure together.

WHAT WE ARE:
- A builder and operator community
- An educational space for land reclamation and DeFi infrastructure
- A feedback forum for protocol development
- A transparency-focused observation space

WHAT WE ARE NOT:
- An investment group
- A yield promotion channel
- A token speculation community

COMMUNITY RULES:

1. NO FINANCIAL ADVICE
   Do not give or solicit investment advice. We discuss mechanics, not returns.

2. NO YIELD PROMOTION
   Do not promote APYs, yields, or "opportunities." This crosses regulatory lines.

3. NO URGENCY LANGUAGE
   Terms like "early," "alpha," "don't miss," or "get in now" are prohibited.

4. RESPECT THE OBSERVATION WINDOW
   The AXUSD Vault is in observation mode until March 26, 2026. We are observing and learning, not soliciting capital.

5. TECHNICAL FOCUS
   Keep discussions educational and technical. Share knowledge, not hype.

6. NO SPAM OR SELF-PROMOTION
   This community is for Axiom ecosystem discussion only.

7. BE RESPECTFUL
   Treat all members with respect. We are building together.

VIOLATION CONSEQUENCES:
- First offense: Warning
- Second offense: 24-hour mute
- Third offense: Permanent ban

Questions? Ask in #start-here
```

---

### #start-here (Update)

```text
WELCOME TO AXIOM BUILDERS HUB

You've joined a community focused on building real infrastructure - for land ownership, for financial sovereignty, and for generational wealth.

CHOOSE YOUR PATH:

LAND RECLAMATION
If you're here to research heir property and reclaim family land:
1. Read #heir-property-101 for the basics
2. Get the FREE Research Checklist (link pinned)
3. Ask questions in #research-questions
4. When ready, unlock the full Workbook ($20/month)

DEFI INFRASTRUCTURE
If you're here to observe and learn about AXUSD lending markets:
1. Read #vault-overview for the technical summary
2. Follow #weekly-reports for transparency updates
3. Discuss mechanics in #technical-discussion
4. Share feedback in #feedback-and-questions

COMMUNITY LAND FUND
If you're interested in collective land ownership:
1. Follow #land-fund-updates for news
2. Review opportunities in #land-opportunities

GOVERNANCE
If you want to participate in protocol decisions:
1. Follow #proposals for active votes
2. Review #treasury-transparency for on-chain data

Introduce yourself in #introductions when you're ready.

We're building together. Welcome.
```

---

### #vault-overview (Pinned Post)

```text
AXUSD EULER V2 LENDING VAULT
Technical Overview - Observation Mode

STATUS: Live on Arbitrum One
OBSERVATION WINDOW: Until March 26, 2026

WHAT THIS IS:
A permissionless lending market where liquidity providers can deposit AXUSD and borrowers can take loans using Euler vault shares as collateral.

VAULT ADDRESS:
0xe3048078286eA27fF91Eed10AA5FD749F0Ce7059

VIEW ON EULER:
https://app.euler.finance/vault/0xe3048078286eA27fF91Eed10AA5FD749F0Ce7059?network=arbitrumone

CURRENT CONFIGURATION:
- Supply Cap: 100,000,000 AXUSD
- Borrow Cap: 100,000,000 AXUSD
- Interest Fee: 10% (to protocol)
- Fee Recipient: Revenue Router

ACCEPTED COLLATERAL:
- eUSDC (Euler USDC Vault): 90% Borrow LTV / 95% Liquidation LTV
- eWETH (Euler WETH Vault): 80% Borrow LTV / 85% Liquidation LTV

FEE DISTRIBUTION:
- 90% of borrower interest → Liquidity Providers
- 10% of borrower interest → Revenue Router
  - 50% to SEED Holders
  - 30% to Treasury
  - 20% to Backstop Vault

IMPORTANT DISCLAIMERS:
- This is an observation period, not a call to invest
- We are monitoring vault behavior and collecting feedback
- No yields or returns are guaranteed
- This is not financial advice

DOCUMENTATION:
- Technical Spec: docs/lending/AXM-LEND-001-axusd-lending-markets.md
- SOP: docs/lending/SOP-euler-v2-axusd-vault-config.md

Questions? Post in #feedback-and-questions
```

---

### #weekly-reports (First Post Template)

```text
AXUSD VAULT WEEKLY REPORT #1
Week of January 30 - February 5, 2026

OBSERVATION WINDOW STATUS: Active (52 days remaining)

VAULT METRICS:
- Total Supplied: $155.50 AXUSD
- Total Borrowed: $0.00 AXUSD
- Utilization: 0.00%
- Supply APY: 0.00%
- Borrow APY: 0.00%

ACTIVITY:
- Unique LPs: 1
- Unique Borrowers: 0
- Liquidations: 0
- Security Incidents: 0

OBSERVATIONS:
- Vault is live and operational
- All parameters verified on-chain
- Fee routing confirmed to Revenue Router
- Collateral LTVs functioning as expected

NEXT WEEK FOCUS:
- Submit Arbitrum grant application
- Submit to DeFiLlama for TVL tracking
- Begin external LP outreach

LINKS:
- Euler App: [View Vault]
- Arbiscan: [View Contract]
- Observer Dashboard: /observer

This report is for transparency only. Not financial advice.
```

---

### #risk-mechanics (Pinned Educational Post)

```text
UNDERSTANDING VAULT RISK MECHANICS

This channel explains how the AXUSD lending vault manages risk. Educational content only.

LOAN-TO-VALUE (LTV) RATIOS:

Borrow LTV = Maximum you can borrow against collateral
Liquidation LTV = Threshold where liquidation becomes possible

Example with eUSDC (90% Borrow / 95% Liquidation):
- Deposit $1,000 worth of eUSDC
- Maximum borrow: $900 AXUSD (90% LTV)
- Liquidation triggers if: Debt exceeds $950 (95% of collateral)

COLLATERAL TYPES:

eUSDC (Euler USDC Vault)
- Lower volatility
- Higher LTV allowed (90/95%)
- Most capital efficient

eWETH (Euler WETH Vault)
- Higher volatility
- Lower LTV allowed (80/85%)
- More liquidation buffer required

LIQUIDATION PROCESS:

1. Borrower health factor drops below 1.0
2. Liquidator can repay portion of debt
3. Liquidator receives collateral + liquidation bonus
4. Process is permissionless and on-chain

INTEREST RATE MODEL:

- Uses Euler V2 Linear IRM
- Rate increases with utilization
- 0% utilization = 0% interest rate
- Higher utilization = higher rates

ORACLE SYSTEM:

- Prices from Euler's price oracle
- Oracle address: 0x1045B6c70AC7b491bf724B5Aa4D89F542D955E15
- Used for LTV calculations and liquidation triggers

Questions? Post below. This is for education, not advice.
```

---

### #feedback-and-questions (Pinned Post)

```text
VAULT FEEDBACK & QUESTIONS

This channel is for:
- Technical questions about vault mechanics
- Bug reports or observed issues
- Improvement suggestions
- General feedback on the observation experience

HOW TO ASK GOOD QUESTIONS:
1. Be specific about what you're asking
2. Include relevant transaction hashes if applicable
3. Note which network/contract you're referencing

WHAT WE CANNOT ANSWER:
- "Should I deposit?" - We don't give financial advice
- "What will the APY be?" - We don't predict yields
- "Is this a good investment?" - Not our role to advise

FEEDBACK HELPS US:
- Improve documentation
- Identify UX issues
- Catch potential bugs
- Understand user needs

Your observations during this window directly shape the protocol.
```

---

## Announcement Posts

### Launch Announcement (For #announcements)

```text
AXUSD EULER V2 VAULT - NOW LIVE ON ARBITRUM

We're excited to announce the AXUSD Lending Vault is now operational on Euler V2.

WHAT THIS MEANS:
- Permissionless lending market for AXUSD
- Borrowing against eUSDC and eWETH collateral
- Transparent, on-chain fee routing

OBSERVATION WINDOW:
We are in observation mode until March 26, 2026. This is a monitoring and feedback period, not a call to invest.

NEW DISCORD CHANNELS:
We've added a new category: AXUSD VAULT OBSERVERS
- #vault-overview - Technical details
- #technical-discussion - Mechanics discussion
- #weekly-reports - Transparency updates
- #risk-mechanics - Educational content
- #feedback-and-questions - Your input

VIEW THE VAULT:
https://app.euler.finance/vault/0xe3048078286eA27fF91Eed10AA5FD749F0Ce7059?network=arbitrumone

This is infrastructure. Not hype. We're building together.
```

---

### Weekly Report Announcement Template

```text
WEEKLY TRANSPARENCY REPORT POSTED

Week [X] report is now available in #weekly-reports.

Highlights:
- TVL: $[X]
- Utilization: [X]%
- Incidents: [X]

Full details in the channel. Feedback welcome.
```

---

## Role Structure

### New Roles to Add

| Role | Color | Purpose |
|------|-------|---------|
| Vault Observer | Blue | Members following vault channels |
| Land Researcher | Green | Members using workbook/research tools |
| Community Builder | Purple | Active contributors |
| Protocol Team | Gold | Axiom team members |

### Role Permissions

**Vault Observer**
- Read access to AXUSD VAULT OBSERVERS category
- Can post in #feedback-and-questions
- Can post in #technical-discussion

**Land Researcher**
- Read access to LAND RECLAMATION category
- Can post in all research channels
- Access to workbook resources

---

## Content Calendar

### Week 1 (Launch Week)
- [ ] Post launch announcement
- [ ] Publish vault overview
- [ ] Publish risk mechanics explainer
- [ ] First weekly report

### Week 2
- [ ] Educational thread: "How Euler V2 Works"
- [ ] Weekly report #2
- [ ] Q&A session in #technical-discussion

### Week 3
- [ ] Educational thread: "Understanding LTV Ratios"
- [ ] Weekly report #3
- [ ] Partnership announcement (if applicable)

### Week 4
- [ ] First month transparency summary
- [ ] Weekly report #4
- [ ] Community feedback roundup

---

## Moderation Guidelines

### Prohibited Content (Remove Immediately)

- Yield promises or APY predictions
- "Get in early" or urgency language
- Investment advice
- Token price speculation
- Competitor FUD
- Spam or self-promotion
- Scam links

### Warning-Worthy Content

- Borderline financial advice
- Off-topic discussions
- Excessive negativity
- Misinformation (correct first, warn if repeated)

### Encouraged Content

- Technical questions
- Educational discussions
- Constructive feedback
- Bug reports
- Documentation suggestions
- Community building

---

## Success Metrics

| Metric | Target (8 weeks) |
|--------|------------------|
| New members (Vault Observer role) | 50+ |
| Weekly report engagement | 20+ reactions |
| Technical discussions | 30+ messages/week |
| Feedback submissions | 10+ per week |
| Zero moderation incidents | Maintain |

---

## Implementation Checklist

- [ ] Rename server to "Axiom Builders Hub"
- [ ] Create AXUSD VAULT OBSERVERS category
- [ ] Create 5 new channels
- [ ] Update #rules-and-guidelines
- [ ] Update #start-here
- [ ] Post vault overview
- [ ] Post risk mechanics explainer
- [ ] Post feedback guidelines
- [ ] Create new roles
- [ ] Publish launch announcement
- [ ] Schedule first weekly report

---

**Document Version:** 1.0
**Last Updated:** January 30, 2026
**Status:** Ready for Implementation

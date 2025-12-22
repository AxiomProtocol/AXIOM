# Axiom SUSU - Executive Summary

## Overview

Axiom SUSU is a comprehensive on-chain Rotating Savings and Credit Association (ROSCA) system that digitizes and modernizes the traditional community-based savings practice. The platform enables members to form savings pools, make regular contributions, and receive lump-sum payouts in rotation, all secured by blockchain technology.

---

## Core Value Proposition

SUSU bridges traditional community savings practices with modern blockchain technology, providing:

- **Financial Inclusion**: Access to group savings for unbanked/underbanked communities
- **Trust & Transparency**: On-chain verification of all contributions and payouts
- **Community Building**: Regional interest hubs connecting like-minded savers
- **Wealth Building**: Structured savings discipline with guaranteed payouts
- **Risk Mitigation**: Smart contract enforcement and reliability scoring

---

## System Architecture

### Three-Tier Group Discovery

1. **Interest Hubs** (Regional/Geographic)
   - City, state, and country-based communities
   - Examples: Atlanta GA, New York City, Lagos Nigeria
   - Enables members to find local savings groups

2. **Purpose Categories** (Savings Goals)
   - 12 preset categories covering common financial goals:
     - Emergency Fund
     - Home Down Payment
     - Business Startup
     - Education/Tuition
     - Vehicle Purchase
     - Wedding/Celebration
     - Medical Expenses
     - Vacation/Travel
     - Debt Payoff
     - Retirement Savings
     - Investment Capital
     - General Savings

3. **Purpose Groups** (Pre-commitment Pools)
   - Standardized naming format: `{Region} | {Purpose} | {Amount} {Currency} | {Cycle}`
   - Example: "Atlanta, GA | Investment Pool | 50 AXM | Monthly"
   - Configurable parameters: contribution amount, currency, cycle length

---

## Key Features

### 1. Group Health Dashboard
- **Readiness Score**: Percentage indicator of graduation readiness
- **Member Count Tracking**: Current vs. required minimum members
- **Wallet Connection Status**: Verified members with connected wallets
- **Average Reliability Score**: Group trustworthiness metric
- **Graduation Checklist**: Step-by-step requirements for on-chain migration

### 2. Contribution Tracking
- **Progress Visualization**: Real-time payment progress bar
- **Cycle-by-Cycle Records**: Detailed contribution history
- **Status Indicators**: Paid, pending, and late payment tracking
- **Member Attribution**: Track who paid what and when

### 3. In-App Messaging
- **Group Communication**: Members can post messages to the group
- **Announcement System**: Important announcements with badges
- **Sender Identification**: Names, avatars, and timestamps
- **Chronological History**: Full message archive

### 4. Invitation System
- **Shareable Links**: Generate unique invite URLs with tokens
- **Link Expiration**: 7-day validity for security
- **Invitation Tracking**: Monitor sent invites and their status
- **Copy-to-Clipboard**: Easy sharing functionality

### 5. Trust & Reputation
- **Vouching System**: Members can vouch for each other
- **Reliability Profiles**: Track on-time vs. late contributions
- **Reliability Scores**: Percentage-based trustworthiness
- **Commitment Confirmation**: Members confirm participation

### 6. Payout Scheduling
- **Sequential or Randomized**: Configurable payout order
- **Estimated Dates**: Projected payout timeline for each member
- **Amount Calculations**: Pool size x member count

### 7. Group Graduation
- **On-Chain Migration**: Move groups to blockchain smart contracts
- **Charter Creation**: Immutable record of group rules
- **Mode Detection**: Automatic community vs. capital classification
- **Transaction Recording**: Graduation tx hash stored

---

## Smart Contract Integration

### AxiomSusuHub.sol
The on-chain component manages graduated SUSU circles with:

- **Configurable Pool Parameters**: 2-50 members, AXM or ERC20 tokens
- **Flexible Cycle Durations**: Daily to monthly contribution cycles
- **Sequential/Random Payouts**: Customizable payout order
- **Grace Periods**: Late payment allowances
- **Protocol Fees**: Routed to treasury vault
- **Comprehensive Events**: Full audit trail logging

---

## User Roles

### Member
- Join existing groups
- Make contributions
- Send messages
- Vouch for other members
- Receive payout in rotation

### Organizer
- Create new groups
- Manage group settings
- Send announcements
- Invite new members
- Graduate group to on-chain

---

## Database Schema

| Table | Purpose |
|-------|---------|
| `susu_interest_hubs` | Regional hub definitions |
| `susu_purpose_categories` | Savings goal categories |
| `susu_purpose_groups` | Group configurations |
| `susu_group_members` | Membership records |
| `susu_contributions` | Payment transactions |
| `susu_messages` | Group communications |
| `susu_invitations` | Invite tokens |
| `susu_vouches` | Trust attestations |
| `susu_reliability_profiles` | Member reputation |
| `susu_charters` | Graduation agreements |
| `susu_mode_thresholds` | Community vs capital thresholds |
| `susu_analytics_events` | Event tracking |
| `susu_feature_flags` | Feature toggles |

---

## API Endpoints

### Public Endpoints
- `GET /api/susu/hubs` - List regional hubs
- `GET /api/susu/categories` - List purpose categories
- `GET /api/susu/groups` - List/search groups
- `GET /api/susu/discover` - Discovery interface

### Group Management
- `POST /api/susu/groups` - Create new group
- `GET /api/susu/groups/[id]` - Get group details
- `GET /api/susu/groups/[id]/members` - List members
- `POST /api/susu/groups/[id]/join` - Join group

### Group Features
- `GET/POST /api/susu/groups/[id]/health` - Health dashboard
- `GET/POST /api/susu/groups/[id]/messages` - Messaging
- `GET/POST /api/susu/groups/[id]/contributions` - Contributions
- `GET/POST /api/susu/groups/[id]/invite` - Invitations
- `GET/POST /api/susu/groups/[id]/vouch` - Vouching

### Administration
- `POST /api/susu/groups/[id]/graduate` - Graduate to on-chain
- `GET /api/susu/admin/stats` - Platform statistics
- `GET/POST /api/susu/admin/feature-flags` - Feature management

---

## Frontend Pages

| Route | Description |
|-------|-------------|
| `/susu` | Main SUSU landing and discovery |
| `/susu/trust` | Trust Center with safety information |
| `/susu/group/[id]` | Group detail with tabbed interface |
| `/susu/admin` | Admin dashboard |
| `/susu/admin/risk` | Risk management tools |
| `/susu/admin/thresholds` | Mode threshold configuration |
| `/susu/admin/templates` | Charter templates |

---

## Mode Classification

Groups are automatically classified based on risk thresholds:

### Community Mode (Lower Risk)
- Contribution < $1,000/cycle
- Total pot < $10,000
- Group size < 20 members
- Cycle length < 90 days

### Capital Mode (Higher Risk)
- Exceeds any community threshold
- Additional compliance requirements
- Enhanced verification

---

## Analytics & Tracking

Event types tracked:
- `hub_join` - User joins a hub
- `group_join` - User joins a group
- `group_create` - New group created
- `graduation` - Group goes on-chain
- Contribution events
- Message events

---

## Security Features

- **Wallet Authentication**: SIWE (Sign-In with Ethereum) verification
- **Organizer-Only Actions**: Role-based access control
- **Input Validation**: Wallet address format verification
- **Token Expiration**: Time-limited invite links
- **Error Handling**: Comprehensive try/catch with sanitized messages

---

## Integration Points

### Axiom Ecosystem
- **AXM Token**: Native contribution currency option
- **Treasury Vault**: Protocol fee destination
- **User Profiles**: Shared identity system
- **Governance**: Future DAO integration

### External
- **ERC20 Tokens**: Alternative currencies supported
- **Blockchain Networks**: Arbitrum One primary

---

## Future Roadmap

1. **Reactive Network Integration**: Autonomous smart contract automation
2. **Cross-Chain Support**: Multi-network SUSU circles
3. **DAO Governance**: Community-managed thresholds
4. **Mobile App**: Native iOS/Android experience
5. **Fiat On-Ramp**: Direct bank account integration
6. **Insurance Pool**: Default protection mechanism

---

## Success Metrics

- Total hubs created
- Active groups
- Total members
- Contributions collected
- Groups graduated to on-chain
- Average reliability scores
- Member retention rates

---

## Conclusion

Axiom SUSU represents a significant advancement in community-based savings, combining the trust and social accountability of traditional ROSCAs with the transparency, security, and automation of blockchain technology. The platform is designed to scale globally while maintaining the intimate, trust-based nature that makes SUSU systems effective wealth-building tools for communities worldwide.

---

*Document Version: 1.0*
*Last Updated: December 22, 2025*
*Platform: Axiom Smart City*

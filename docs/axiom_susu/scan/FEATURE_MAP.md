# Axiom SUSU Feature Map

**Scan Date:** December 22, 2025  
**Objective:** Map each user-facing feature to UI pages, API endpoints, smart contracts, value-moving actions, and high-risk actions

---

## Feature Categories

1. [SUSU Pool Management](#1-susu-pool-management)
2. [Regional Interest Hubs](#2-regional-interest-hubs)
3. [Purpose Groups](#3-purpose-groups)
4. [Pool Discovery](#4-pool-discovery)
5. [Contributions](#5-contributions)
6. [Payouts](#6-payouts)
7. [Member Management](#7-member-management)
8. [Graduation (Off-Chain → On-Chain)](#8-graduation)
9. [Admin Dashboard](#9-admin-dashboard)
10. [Analytics & Tracking](#10-analytics--tracking)

---

## 1. SUSU Pool Management

### Create Pool
| Aspect | Details |
|--------|---------|
| **UI Pages** | `pages/susu.js` → Create Tab |
| **Components** | Create form with member count, contribution, cycle, randomization options |
| **API Endpoints** | `POST /api/susu/create-pool` |
| **Smart Contracts** | `AxiomSusuHub.createPool()` |
| **Value-Moving Actions** | ✅ Protocol fee deducted from pool contributions |
| **High-Risk Actions** | ⚠️ Pool creation is irreversible; parameters locked once started |
| **Disclosures Needed** | Pool terms, fee structure, rotation method, exit rules |

### View Pool Details
| Aspect | Details |
|--------|---------|
| **UI Pages** | `pages/susu.js` → Pool details modal |
| **Components** | Pool info card, member list, contribution history, payout order |
| **API Endpoints** | `GET /api/susu/pool/[id]` |
| **Smart Contracts** | `AxiomSusuHub.pools()`, `AxiomSusuHub.poolMembers()` |
| **Value-Moving Actions** | None (read-only) |
| **High-Risk Actions** | None |

### List Pools
| Aspect | Details |
|--------|---------|
| **UI Pages** | `pages/susu.js` → Discover Tab |
| **Components** | Pool cards with status filters |
| **API Endpoints** | `GET /api/susu/pools` |
| **Smart Contracts** | `AxiomSusuHub` (view functions) |
| **Value-Moving Actions** | None |
| **High-Risk Actions** | None |

---

## 2. Regional Interest Hubs

### View Hubs
| Aspect | Details |
|--------|---------|
| **UI Pages** | `pages/susu.js` → Discover Tab |
| **Components** | Hub cards with region filters |
| **API Endpoints** | `GET /api/susu/hubs` |
| **Smart Contracts** | None (off-chain) |
| **Database Tables** | `susuInterestHubs` |
| **Value-Moving Actions** | None |
| **High-Risk Actions** | None |

### Join Hub
| Aspect | Details |
|--------|---------|
| **UI Pages** | `pages/susu.js` → Hub detail view |
| **Components** | Join button, membership status |
| **API Endpoints** | `POST /api/susu/hubs/[id]/join` |
| **Smart Contracts** | None (off-chain) |
| **Database Tables** | `susuHubMembers` |
| **Value-Moving Actions** | None |
| **High-Risk Actions** | None |

### Create Hub (Admin)
| Aspect | Details |
|--------|---------|
| **UI Pages** | `pages/susu-admin.js` |
| **Components** | Hub creation form |
| **API Endpoints** | `POST /api/susu/hubs` |
| **Smart Contracts** | None |
| **Database Tables** | `susuInterestHubs` |
| **Value-Moving Actions** | None |
| **High-Risk Actions** | ⚠️ Admin-only; affects group discovery |

---

## 3. Purpose Groups

### View Groups
| Aspect | Details |
|--------|---------|
| **UI Pages** | `pages/susu.js` → Discover Tab |
| **Components** | Group cards with purpose category pills |
| **API Endpoints** | `GET /api/susu/groups` |
| **Smart Contracts** | None (off-chain) |
| **Database Tables** | `susuPurposeGroups` |
| **Value-Moving Actions** | None |
| **High-Risk Actions** | None |

### Create Group
| Aspect | Details |
|--------|---------|
| **UI Pages** | `pages/susu.js` → Create Group modal |
| **Components** | Group creation form with hub, purpose, amount, cycle |
| **API Endpoints** | `POST /api/susu/groups` |
| **Smart Contracts** | None (off-chain) |
| **Database Tables** | `susuPurposeGroups`, `susuGroupMembers` |
| **Value-Moving Actions** | None |
| **High-Risk Actions** | ⚠️ Group creator becomes organizer with admin powers |

### Join Group
| Aspect | Details |
|--------|---------|
| **UI Pages** | `pages/susu.js` → Group detail view |
| **Components** | Join button, member list |
| **API Endpoints** | `POST /api/susu/groups/[id]/join` |
| **Smart Contracts** | None (off-chain) |
| **Database Tables** | `susuGroupMembers` |
| **Value-Moving Actions** | None |
| **High-Risk Actions** | None |

---

## 4. Pool Discovery

### Search/Filter Pools
| Aspect | Details |
|--------|---------|
| **UI Pages** | `pages/susu.js` → Discover Tab |
| **Components** | Region filter, purpose filter, search input |
| **API Endpoints** | `GET /api/susu/discover` |
| **Smart Contracts** | None |
| **Database Tables** | `susuInterestHubs`, `susuPurposeGroups`, `susuPurposeCategories` |
| **Value-Moving Actions** | None |
| **High-Risk Actions** | None |

### Purpose Categories
| Aspect | Details |
|--------|---------|
| **UI Pages** | `pages/susu.js` → Category pills |
| **Components** | Category filter buttons |
| **API Endpoints** | `GET /api/susu/categories` |
| **Smart Contracts** | None |
| **Database Tables** | `susuPurposeCategories` |
| **Value-Moving Actions** | None |
| **High-Risk Actions** | None |

---

## 5. Contributions

### Make Contribution
| Aspect | Details |
|--------|---------|
| **UI Pages** | `pages/susu.js` → Pool detail view |
| **Components** | Contribute button, approval flow |
| **API Endpoints** | Transaction via wallet (direct contract call) |
| **Smart Contracts** | `AxiomSusuHub.contribute(poolId)`, `ERC20.approve()` |
| **Value-Moving Actions** | ✅ **YES** - Transfers tokens from user to pool |
| **High-Risk Actions** | ⚠️ **HIGH RISK** - Irreversible token transfer |
| **Disclosures Needed** | Contribution amount, fee breakdown, cycle commitment |
| **Acknowledgements Needed** | Terms acceptance, understanding of rotation |

### View Contribution History
| Aspect | Details |
|--------|---------|
| **UI Pages** | `pages/susu.js` → Pool detail view |
| **Components** | Contribution timeline, status indicators |
| **API Endpoints** | `GET /api/susu/pool/[id]` |
| **Smart Contracts** | `AxiomSusuHub.cycleContributions()` |
| **Value-Moving Actions** | None (read-only) |
| **High-Risk Actions** | None |

---

## 6. Payouts

### Process Payout
| Aspect | Details |
|--------|---------|
| **UI Pages** | `pages/susu.js` → Pool detail view (admin/organizer) |
| **Components** | Process payout button |
| **API Endpoints** | Transaction via wallet |
| **Smart Contracts** | `AxiomSusuHub.processPayout(poolId)` |
| **Value-Moving Actions** | ✅ **YES** - Transfers pooled funds to recipient |
| **High-Risk Actions** | ⚠️ **HIGH RISK** - Large fund distribution |
| **Disclosures Needed** | Recipient confirmation, amount, fee |

### View Payout Order
| Aspect | Details |
|--------|---------|
| **UI Pages** | `pages/susu.js` → Pool detail view |
| **Components** | Payout order list, current cycle indicator |
| **API Endpoints** | `GET /api/susu/pool/[id]` |
| **Smart Contracts** | `AxiomSusuHub.payoutOrder()` |
| **Value-Moving Actions** | None |
| **High-Risk Actions** | None |

---

## 7. Member Management

### Join Pool (On-Chain)
| Aspect | Details |
|--------|---------|
| **UI Pages** | `pages/susu.js` → Pool detail view |
| **Components** | Join button |
| **API Endpoints** | Transaction via wallet |
| **Smart Contracts** | `AxiomSusuHub.joinPool(poolId)` |
| **Value-Moving Actions** | ⚠️ May require initial contribution |
| **High-Risk Actions** | ⚠️ Commitment to full cycle participation |
| **Disclosures Needed** | Pool terms, contribution schedule, payout order |

### Exit Pool
| Aspect | Details |
|--------|---------|
| **UI Pages** | `pages/susu.js` → My Pools tab |
| **Components** | Exit button |
| **API Endpoints** | Transaction via wallet |
| **Smart Contracts** | `AxiomSusuHub.exitPool(poolId)` |
| **Value-Moving Actions** | ⚠️ May forfeit contributions depending on pool rules |
| **High-Risk Actions** | ⚠️ **HIGH RISK** - May lose deposited funds |
| **Disclosures Needed** | Exit penalties, forfeiture terms |

### Eject Member (Admin)
| Aspect | Details |
|--------|---------|
| **UI Pages** | `pages/susu.js` → Pool detail (organizer view) |
| **Components** | Eject button per member |
| **API Endpoints** | Transaction via wallet |
| **Smart Contracts** | `AxiomSusuHub.ejectMember(poolId, member)` |
| **Value-Moving Actions** | None directly (affects future distributions) |
| **High-Risk Actions** | ⚠️ **HIGH RISK** - Removes member from rotation |

---

## 8. Graduation

### Graduate Group to On-Chain Pool
| Aspect | Details |
|--------|---------|
| **UI Pages** | `pages/susu.js` → Group detail view |
| **Components** | "Graduate to On-Chain" button |
| **API Endpoints** | `POST /api/susu/groups/[id]/graduate` |
| **Smart Contracts** | `AxiomSusuHub.createPool()` with predefined members |
| **Database Tables** | `susuPurposeGroups` (updates `graduatedToPoolId`) |
| **Value-Moving Actions** | ⚠️ Creates on-chain pool (gas costs) |
| **High-Risk Actions** | ⚠️ **HIGH RISK** - Transitions from off-chain to on-chain commitment |
| **Disclosures Needed** | On-chain terms, smart contract risks, irreversibility |

---

## 9. Admin Dashboard

### SUSU Admin Overview
| Aspect | Details |
|--------|---------|
| **UI Pages** | `pages/susu-admin.js` |
| **Components** | Stats cards, hub management, group management |
| **API Endpoints** | `GET /api/susu/admin/stats` |
| **Smart Contracts** | None |
| **Database Tables** | Multiple (aggregate queries) |
| **Value-Moving Actions** | None |
| **High-Risk Actions** | None |

### Feature Flags Management
| Aspect | Details |
|--------|---------|
| **UI Pages** | `pages/susu-admin.js` |
| **Components** | Toggle switches for features |
| **API Endpoints** | `GET/POST /api/susu/admin/feature-flags` |
| **Smart Contracts** | None |
| **Database Tables** | `susuFeatureFlags` |
| **Value-Moving Actions** | None |
| **High-Risk Actions** | ⚠️ Can enable/disable platform features |

---

## 10. Analytics & Tracking

### Analytics Events
| Aspect | Details |
|--------|---------|
| **UI Pages** | Embedded in all SUSU pages |
| **Components** | Event emitters |
| **API Endpoints** | (Internal logging) |
| **Smart Contracts** | None |
| **Database Tables** | `susuAnalyticsEvents` |
| **Value-Moving Actions** | None |
| **High-Risk Actions** | None |

### Event Types Tracked
| Event | Trigger |
|-------|---------|
| `hub_join` | User joins interest hub |
| `group_join` | User joins purpose group |
| `group_create` | User creates purpose group |
| `graduation` | Group graduates to on-chain pool |

---

## High-Risk Actions Summary

| Action | Risk Level | Disclosures Required | Acknowledgements Required |
|--------|------------|---------------------|--------------------------|
| Make Contribution | 🔴 HIGH | Fee structure, commitment, schedule | Terms acceptance |
| Process Payout | 🔴 HIGH | Recipient, amount, fee | Confirmation |
| Exit Pool | 🔴 HIGH | Forfeiture terms, penalties | Penalty understanding |
| Graduate to On-Chain | 🔴 HIGH | Smart contract risks, irreversibility | On-chain commitment |
| Eject Member | 🟡 MEDIUM | Impact on rotation | Admin confirmation |
| Create Pool | 🟡 MEDIUM | Terms, fee structure | Pool terms acceptance |
| Join Pool | 🟡 MEDIUM | Commitment, schedule | Participation terms |

---

## Value-Moving Actions Summary

| Action | Token Flow | Smart Contract Function |
|--------|------------|------------------------|
| Contribute | User → Pool | `AxiomSusuHub.contribute()` |
| Process Payout | Pool → Recipient | `AxiomSusuHub.processPayout()` |
| Protocol Fee | Pool → Treasury | Automatic (within processPayout) |
| Token Approval | User → Contract | `ERC20.approve()` |

---

## Smart Contract Functions Used

### AxiomSusuHub (`0x6C69D730327930B49A7997B7b5fb0865F30c95A5`)
| Function | Purpose | Value-Moving |
|----------|---------|--------------|
| `createPool()` | Create new SUSU pool | No |
| `joinPool()` | Join existing pool | No |
| `addPredefinedMembers()` | Add members (organizer) | No |
| `startPool()` | Activate pool | No |
| `contribute()` | Make contribution | ✅ YES |
| `processPayout()` | Distribute funds | ✅ YES |
| `exitPool()` | Leave pool | ⚠️ May forfeit |
| `ejectMember()` | Remove member | No |
| `pause()` | Emergency stop | No |
| `unpause()` | Resume operations | No |

### AxiomV2 (AXM Token) (`0x864F9c6f50dC5Bd244F5002F1B0873Cd80e2539D`)
| Function | Purpose | Value-Moving |
|----------|---------|--------------|
| `approve()` | Approve spending | Enables ✅ |
| `transfer()` | Direct transfer | ✅ YES |
| `transferFrom()` | Delegated transfer | ✅ YES |

---

## Compliance Integration Points

### Disclosure Injection Points
1. Before `contribute()` - Show contribution terms
2. Before `processPayout()` - Confirm recipient
3. Before `joinPool()` - Show pool terms
4. Before `exitPool()` - Show forfeiture terms
5. Before graduation - Show on-chain commitment terms

### Acknowledgement Collection Points
1. Pool creation - Charter acceptance
2. Pool join - Terms acceptance
3. First contribution - Financial commitment acknowledgement
4. Graduation - Smart contract risk acknowledgement

### Audit Event Logging Points
1. All value-moving transactions - Log tx hash, amount, parties
2. Member status changes - Log reason, timestamp
3. Pool state transitions - Log old/new state
4. Admin actions - Log actor, action, target

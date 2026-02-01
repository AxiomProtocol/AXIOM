# Closed-Loop Upgrade Plan

## Overview

This document outlines the architectural upgrade to convert Axiom Protocol from a public crowdfunding system to a closed-loop, membership-based coordination system. The upgrade establishes PMA membership as the participation gate, AXUSD as the settlement and accounting layer, and Purpose Pools for resource allocation governed by member voting and due diligence thresholds.

## Core Principles

1. No investment language on public pages (invest, investor, ROI, return, yield guarantee, appreciation, passive income)
2. PMA membership required for participation in pools, voting, steward roles, treasury access
3. AXUSD is settlement and accounting only - not framed as investment or profit vehicle
4. Land acquisition is an outcome governed by purpose pools and due diligence thresholds
5. Separate internal admin truth from public simplified messaging
6. Audit trail for key actions and admin changes
7. No asterisks or hashtags in any UI text or documentation

## Phase 1: Database Schema Updates

### New Enums

```typescript
// Membership status for PMA gating
membershipStatusEnum: ['applicant', 'member', 'suspended', 'removed']

// Purpose pool lifecycle
purposePoolStatusEnum: ['draft', 'open', 'paused', 'closed', 'executing']

// Pool commitment lifecycle
poolCommitmentStatusEnum: ['committed', 'withdrawn', 'locked', 'released']

// Proposal lifecycle
proposalStatusEnum: ['draft', 'voting', 'approved', 'rejected', 'executed']

// Vote options
voteOptionEnum: ['yes', 'no', 'abstain']

// Proposal categories
proposalCategoryEnum: ['due_diligence', 'legal', 'survey', 'steward_ops', 'option_deposit', 'close_costs', 'other']

// Land candidate stages
landCandidateStageEnum: ['candidate', 'under_review', 'due_diligence', 'ready_for_vote', 'approved_for_execution', 'acquired', 'archived']
```

### New Tables

1. **treasuries** - Community treasury accounts
   - id, name, purpose, policyJson, createdBy, createdAt

2. **treasuryTransactions** - Treasury transaction ledger
   - id, treasuryId, type, amountAxusd, fromAddress, toAddress, txHash, memo, createdAt

3. **memberBalances** - Member AXUSD balance tracking
   - id, userId, axusdBalance, updatedAt

4. **purposePools** - Purpose-driven resource pools
   - id, name, purpose, status, minCommitAxusd, maxCommitAxusd, startAt, endAt, createdBy, createdAt

5. **poolCommitments** - Member commitments to pools
   - id, poolId, userId, amountAxusd, status, createdAt

6. **poolRules** - Pool governance rules
   - id, poolId, rulesJson (withdraw windows, quorum, thresholds)

7. **poolDisclosures** - Pool-specific disclosures
   - id, poolId, disclosureTextVersion, requiredAcknowledgment

8. **proposals** - Governance proposals
   - id, poolId, title, description, amountAxusd, recipient, category, status, quorumRequired, approvalThreshold, votingEndsAt, createdBy, createdAt

9. **votes** - Member votes on proposals
   - id, proposalId, userId, vote, weight, createdAt

10. **auditLogs** - System audit trail
    - id, actorUserId, action, entityType, entityId, beforeJson, afterJson, ipAddress, createdAt

### User Table Extensions

Add to users table:
- membershipStatus: enum (default 'applicant')
- membershipAcceptedAt: timestamp
- membershipAgreementVersion: varchar
- disclosureAcceptedAt: timestamp
- rulesAcceptedAt: timestamp

### Land Submissions Extensions

Add to land_submissions or create landCandidates table:
- stage: landCandidateStageEnum
- stewardshipIntent: text
- isAccessVerified: boolean
- isTitleReviewed: boolean
- isMineralRightsReviewed: boolean
- isSurveyVerified: boolean
- isEnvironmentalScreened: boolean
- isOptionDocsUploaded: boolean
- isPurchaseApprovedByVote: boolean
- dueDiligenceProgress: integer (0-100)

## Phase 2: Route Changes

### Route Migrations

| Old Route | New Route | Action |
|-----------|-----------|--------|
| /invest | /participate | Create redirect, new page |
| /land-acquisition | /land | Create redirect, new page |
| /land-acquisition/market | /land/candidates | Redirect |
| /land-acquisition/voting | /proposals | Redirect |
| /admin/crowdfunding | /admin/pools | Redirect |

### New Routes

1. **/join** - Membership onboarding flow
   - Read PMA overview
   - Review rules and disclosures
   - Confirm acceptance
   - Create membership record

2. **/participate** - Member participation dashboard
   - Membership status
   - AXUSD balance
   - Active purpose pools
   - Proposal feed
   - Personal commitments and voting history

3. **/treasury** - Public transparency page
   - Treasury totals and transaction feed
   - Categorized spending
   - Proposal outcomes

4. **/land** - Public land candidates page
   - Stewardship candidates (not campaigns)
   - Due diligence progress
   - Current stage indicators

5. **/stewards** - Steward program page (exists, needs update)
   - Responsibilities
   - Application flow for members
   - Reporting cadence

6. **/philosophy** - Philosophy primer page (exists, needs update)
   - Axiom principles with explanations
   - Practical implications

7. **/system** or **/practice** - Coordination system explainer
   - How Axiom works as coordination system
   - AXUSD as settlement layer
   - PMA membership gate
   - Purpose pool mechanics

## Phase 3: API Routes

### New API Endpoints

1. **Membership APIs**
   - POST /api/membership/apply - Submit application
   - GET /api/membership/status - Check status
   - POST /api/membership/accept-disclosures - Accept disclosures

2. **Purpose Pool APIs**
   - GET /api/pools - List pools
   - GET /api/pools/:id - Pool details
   - POST /api/pools/:id/commit - Commit AXUSD (gated)
   - POST /api/pools/:id/withdraw - Withdraw commitment

3. **Proposal APIs**
   - GET /api/proposals - List proposals
   - GET /api/proposals/:id - Proposal details
   - POST /api/proposals - Create proposal (gated)
   - POST /api/proposals/:id/vote - Cast vote (gated)

4. **Treasury APIs**
   - GET /api/treasury - Treasury summary
   - GET /api/treasury/transactions - Transaction feed
   - POST /api/treasury/execute - Execute approved disbursement (admin)

5. **Land Pipeline APIs**
   - GET /api/land/candidates - Public candidate list
   - GET /api/land/candidates/:id - Candidate details
   - PATCH /api/admin/land/:id/diligence - Update due diligence (admin)
   - POST /api/admin/land/:id/execute - Execute acquisition (admin)

## Phase 4: Component Updates

### New Components

1. **ParticipationDisclosurePanel** - components/Disclosures/ParticipationDisclosurePanel.tsx
   - Used on /join, /participate, pool commit modal, proposal voting
   - States plainly: participation is for coordination and stewardship practice
   - No guaranteed outcomes
   - Tokens do not convey title, equity, or profits
   - Requires acknowledgment stored per user

2. **MembershipGate** - components/MembershipGate.tsx
   - Wrapper that checks membership status
   - Shows join prompt for non-members
   - Blocks gated actions

3. **PoolCard** - components/pools/PoolCard.tsx
   - Purpose pool display card
   - Progress, commitment status

4. **ProposalCard** - components/proposals/ProposalCard.tsx
   - Proposal display with voting status

5. **LandCandidateCard** - components/land/LandCandidateCard.tsx
   - Land candidate display (not campaign)
   - Due diligence progress bar

## Phase 5: Language Migration

### Terms to Replace

| Remove | Replace With |
|--------|-------------|
| invest, investor | participate, member, contributor |
| crowdfunding | purpose pool, resource pooling |
| campaign | purpose pool, coordination effort |
| ROI, return | outcomes, impact |
| yield (as profit) | (remove or context-specific) |
| passive income | (remove) |
| SEC Reg CF compliant | designed for alignment when activated |
| investment opportunity | participation opportunity |
| portfolio | commitments, allocations |

### Files Requiring Language Updates

1. pages/land-acquisition.tsx - Major rewrite to /land
2. pages/axusd.tsx - Remove yield/investment framing
3. pages/admin/crowdfunding.tsx - Rename to pools
4. pages/c/[slug].tsx - Campaign shortlinks
5. components/axiomRebuild/copy/*.ts - Marketing copy
6. Meta descriptions across all pages

## Phase 6: Arkansas Property Conversion

Convert 5 Arkansas campaigns to land candidates with stewardship intent summaries:

1. **Bismarck Timberland (89 acres)**
   - Intent: Stewardship proof parcel, baseline assessment, quarterly reporting
   - Stage: Candidate

2. **Winslow Mega-Parcel (839 acres)**
   - Intent: Zone planning, phased stewardship units, baseline surveys
   - Stage: Candidate

3. **Little Rock Lakefront (154 acres)**
   - Intent: Conservation first, environmental diligence, restricted development posture
   - Stage: Candidate

4. **DeWitt Farm (199 acres)**
   - Intent: Regenerative pilot, soil and yield tracking, equipment allocation proposal
   - Stage: Candidate

5. **Poughkeepsie Riverfront (180 acres)**
   - Intent: Access and floodplain checks, habitat protection, optionality reserve
   - Stage: Candidate

## Phase 7: Admin Controls

### Role Extensions

Extend existing role system with:
- ADMIN (existing)
- STEWARD_MANAGER - Manage steward assignments
- TREASURY_EXECUTOR - Execute approved disbursements

### Admin Features

1. Pool management dashboard
2. Due diligence checklist management
3. Proposal execution interface
4. Audit log viewer

## Phase 8: Audit Trail

### Actions to Log

1. Pool creation and status changes
2. Commitment locks and releases
3. Proposal status changes
4. Disbursement execution
5. Land due diligence checklist changes
6. Steward assignments
7. Membership status changes

### Log Format

```typescript
{
  id: number,
  actorUserId: number,
  action: string,
  entityType: string,
  entityId: string,
  beforeJson: object,
  afterJson: object,
  ipAddress: string,
  createdAt: timestamp
}
```

## Testing Plan

### Access Control Tests

1. Non-member cannot commit to pools
2. Non-member cannot vote on proposals
3. Non-member cannot apply as steward
4. Member must accept disclosures before committing

### Gating Tests

1. Public pages accessible without membership
2. Participation actions blocked for non-members
3. Admin actions require appropriate roles
4. Land execution blocked until gates complete

### Language Compliance

1. Grep for investment terms on public pages
2. Verify no asterisks or hashtags in UI
3. Meta descriptions free of investment language

### Integration Tests

1. Membership onboarding flow
2. Pool commitment lifecycle
3. Proposal voting and execution
4. Treasury transaction logging
5. Audit trail completeness

## Risks and Mitigations

1. **Large surface area for copy updates**
   - Mitigation: Automated grep scanning, staged rollout

2. **Database migrations with production data**
   - Mitigation: Use db:push --force, additive changes only

3. **Breaking existing user flows**
   - Mitigation: Maintain redirects, backward compatibility

4. **Incomplete language cleanup**
   - Mitigation: CI checks for banned terms

## Implementation Order

1. Database schema additions (additive only)
2. New components (Disclosure, MembershipGate)
3. New pages (/join, /participate, /treasury, /land, /philosophy, /system)
4. API routes for pools, proposals, treasury
5. Admin tools for pool and land management
6. Language migration across existing pages
7. Property conversion to candidates
8. Audit trail implementation
9. Testing and verification

## Files to Create

- docs/dev-notes/closed_loop_upgrade_plan.md (this file)
- pages/join.tsx
- pages/participate.tsx
- pages/treasury.tsx
- pages/land.tsx (refactored from land-acquisition)
- pages/system.tsx
- components/Disclosures/ParticipationDisclosurePanel.tsx
- components/MembershipGate.tsx
- components/pools/PoolCard.tsx
- components/proposals/ProposalCard.tsx
- components/land/LandCandidateCard.tsx
- pages/api/membership/*.ts
- pages/api/pools/*.ts
- pages/api/proposals/*.ts
- lib/auditLogger.ts (extend existing)

## Files to Modify

- shared/schema.ts - Add new tables and enums
- pages/land-acquisition.tsx - Redirect to /land
- pages/axusd.tsx - Remove investment language
- pages/pma/index.tsx - Link to new membership flow
- pages/philosophy.tsx - Add principle explanations
- pages/stewards.tsx - Update for member gating
- server/routes.ts - Add new API routes
- All marketing copy files

## Success Criteria

1. Public UX presents Axiom as membership-based coordination system
2. Member UX enables AXUSD holding, pool commitments, voting
3. Admin UX enables pool creation, due diligence management, execution
4. Land pipeline shows candidates with transparent due diligence status
5. No investment language on public pages
6. Complete audit trail for key actions
7. All tests passing

# Node Operator Compensation Policy

**Version:** 1.0.0  
**Effective Date:** 2026-02-01  
**Classification:** Internal Use Only  
**Owner:** Axiom Protocol Treasury

---

## Overview

This policy defines the compensation structure for Node Operators participating in the Axiom Capital Bridge program. Compensation is milestone-based, USD-denominated, and paid in AXIOM tokens during the observation window.

---

## Table of Contents

1. [Compensation Principles](#1-compensation-principles)
2. [Milestone Definitions](#2-milestone-definitions)
3. [Role-Based Payout Shares](#3-role-based-payout-shares)
4. [USD Accrual Mechanics](#4-usd-accrual-mechanics)
5. [AXIOM Payment During Observation](#5-axiom-payment-during-observation)
6. [Conversion Window](#6-conversion-window)
7. [Caps and Limits](#7-caps-and-limits)
8. [Clawbacks](#8-clawbacks)
9. [Slashing](#9-slashing)

---

## 1. Compensation Principles

### Core Principles

1. **Milestone-Based**: Rewards accrue upon completion of defined milestones
2. **USD-Denominated**: All accruals tracked in USD terms for predictability
3. **Role-Proportional**: Payout shares vary by role and responsibility level
4. **Performance-Linked**: Poor performance may reduce or forfeit rewards
5. **Transparent**: All reward calculations auditable and documented

### Payment Timeline

- **Accrual**: Real-time upon milestone completion
- **Preview**: Weekly payout preview reports
- **Payout**: Monthly or upon threshold (whichever first)
- **Threshold**: $50 USD equivalent minimum for payout

---

## 2. Milestone Definitions

### Settlement Cycle Milestones

Each property packet settlement cycle includes 5 reward milestones:

| # | Milestone | USD Value | Description |
|---|-----------|-----------|-------------|
| 1 | PACKET_ACCEPTED | $10 | Packet submitted and passes initial validation |
| 2 | UNDERWRITING_FINALIZED | $20 | Underwriting complete with hash computed |
| 3 | ARTIFACTS_PREVALIDATED | $20 | All artifacts validated, no placeholders |
| 4 | DUAL_ATTESTATION_RECORDED | $25 | Both attestations recorded with signatures |
| 5 | POST_SETTLEMENT_AUDIT | $25 | Post-settlement audit submitted |

**Total per settlement cycle**: $100 USD equivalent

### Milestone Requirements

**PACKET_ACCEPTED**:
- Packet JSON valid against schema
- Required fields populated
- Track type determined (A or B)

**UNDERWRITING_FINALIZED**:
- All underwriting calculations complete
- Risk tier assigned
- Underwriting hash computed

**ARTIFACTS_PREVALIDATED**:
- All required artifacts present
- Valid CID/SHA256 for each artifact
- Zero placeholder values
- Prevalidation script passes

**DUAL_ATTESTATION_RECORDED**:
- Two attestations from different Attestors
- Both pass conflict check
- Artifact readiness confirmed at attestation time
- Signatures recorded with timestamps

**POST_SETTLEMENT_AUDIT**:
- Settlement transaction confirmed on-chain
- Audit report submitted within 7 days
- No material discrepancies identified

---

## 3. Role-Based Payout Shares

### Share Distribution

| Milestone | Observer | Validator | Attestor |
|-----------|----------|-----------|----------|
| PACKET_ACCEPTED | 20% ($2) | 60% ($6) | 100% ($10) |
| UNDERWRITING_FINALIZED | 0% | 60% ($12) | 100% ($20) |
| ARTIFACTS_PREVALIDATED | 0% | 60% ($12) | 100% ($20) |
| DUAL_ATTESTATION_RECORDED | 0% | 0% | 100% ($25) |
| POST_SETTLEMENT_AUDIT | 20% ($5) | 60% ($15) | 100% ($25) |

### Maximum Earnings Per Settlement

| Role | Maximum USD |
|------|-------------|
| Observer | $7 |
| Validator | $45 |
| Attestor | $100 |

### Role Stacking

Operators holding multiple roles earn the highest applicable share only (no double-counting).

---

## 4. USD Accrual Mechanics

### Accrual Ledger

Each operator has a rewards ledger tracking:

```typescript
{
  operatorId: string;
  usdAccrued: number;           // Total USD accrued
  usdPaid: number;              // Total USD paid out
  usdPending: number;           // Awaiting payout
  conversionBucket: number;     // Deferred for AXUSD conversion
  lastAccrual: string;          // ISO8601 timestamp
  lastPayout: string;           // ISO8601 timestamp
  entries: AccrualEntry[];      // Detailed entry log
}
```

### Accrual Entry Structure

```typescript
{
  entryId: string;
  packetId: string;
  milestone: string;
  role: string;
  usdAmount: number;
  sharePercent: number;
  timestamp: string;
  settled: boolean;
}
```

### Accrual Timing

- Accrual recorded immediately upon milestone completion
- Timestamp captures exact completion time
- Packet ID and milestone linked for audit trail

---

## 5. AXIOM Payment During Observation

### Observation Window

During the observation period (ending March 26, 2026):
- All payouts are in AXIOM tokens
- No AXUSD payouts available
- Conversion window accrual is optional

### Posted Rate

AXIOM payouts use a "posted rate" for USD conversion:

```
AXIOM amount = USD accrued / postedAxiomUsdRate
```

**Posted Rate Configuration**: `data/nodes/config.json`

```json
{
  "postedAxiomUsdRate": 0.10,
  "rateEffectiveDate": "2026-02-01",
  "rateSource": "treasury_oracle"
}
```

### Payout Calculation Example

| Metric | Value |
|--------|-------|
| USD Accrued | $45.00 |
| Posted Rate | $0.10 |
| AXIOM Payout | 450 AXM |

### Payout Preview

Weekly payout previews show:
- USD accrued since last payout
- Current posted rate
- Projected AXIOM amount
- Conversion bucket balance (if applicable)

**CLI Command**:
```bash
npm run nodes:payout
```

---

## 6. Conversion Window

### Purpose

The conversion window allows operators to defer payout for future AXUSD conversion instead of immediate AXIOM payment.

### Mechanics

1. **Opt-In**: Operator elects to defer specific accruals
2. **Bucket Tracking**: Deferred amounts tracked in `conversionBucket`
3. **No Immediate Payout**: Deferred amounts not included in AXIOM payout
4. **Future Conversion**: Post-observation, bucket eligible for AXUSD

### Conversion Bucket Ledger

```typescript
{
  operatorId: string;
  conversionBucket: number;    // USD equivalent deferred
  entries: ConversionEntry[];  // Detailed deferral log
  conversionEligibleDate: string;  // When conversion available
}
```

### Restrictions

- Deferred amounts may not exceed 50% of total accruals
- Minimum deferral: $10 USD
- Conversion not guaranteed (subject to post-observation mechanics)

---

## 7. Caps and Limits

### Per-Operator Caps

| Cap Type | Limit | Period |
|----------|-------|--------|
| Maximum USD Accrual | $5,000 | Monthly |
| Maximum Settlements | 50 | Monthly |
| Maximum Attestations | 100 | Monthly |

### Program Caps

| Cap Type | Limit | Period |
|----------|-------|--------|
| Total Operator Rewards | $50,000 | Monthly |
| Total AXIOM Distribution | 500,000 AXM | Monthly |

### Cap Handling

When caps are reached:
- New accruals queued for next period
- Operator notified of cap status
- Work may continue (for reputation) without additional reward

---

## 8. Clawbacks

### Clawback Triggers

Accrued but unpaid rewards may be clawed back for:

1. **Verification Failure**: Post-onboarding verification issues
2. **Misconduct Finding**: Confirmed incident (MEDIUM or higher)
3. **Work Rejection**: Submitted work materially deficient
4. **Abandonment**: Operator abandons assigned work

### Clawback Process

1. Issue identified and documented
2. Operator notified with 7-day response window
3. Review and determination
4. Clawback amount calculated
5. Ledger adjusted
6. Operator notified of final outcome

### Clawback Limits

- Maximum clawback: 100% of unpaid rewards
- Paid rewards not subject to clawback (except fraud)
- Clawback does not affect prior paid periods

---

## 9. Slashing

### Slashing vs. Clawback

- **Clawback**: Recovery of improperly earned rewards
- **Slashing**: Penalty reducing rewards as punishment

### Slashing Schedule

| Finding Severity | Slash Percent | Additional |
|------------------|---------------|------------|
| LOW | 0% | Warning only |
| MEDIUM | 25% | 30-day suspension |
| HIGH | 50% | 90-day suspension |
| CRITICAL | 100% | Permanent revocation |

### Slashing Calculation

```
slashAmount = unpaidRewards * slashPercent
remainingBalance = unpaidRewards - slashAmount
```

### Slashing Process

1. Incident investigation complete
2. Severity determined
3. Slash amount calculated
4. Operator notified
5. Appeal window (7 days)
6. Final determination
7. Ledger adjusted

### Slashing Appeals

Operators may appeal slashing decisions:
- Written appeal within 7 days
- Review by program coordinator
- Final decision within 14 days
- No further internal appeal

---

## Reporting

### Weekly Report

Weekly reports include:
- Accrual summary by milestone
- Pending payout amounts
- Conversion bucket balance
- Incidents affecting rewards

**CLI Command**:
```bash
npm run nodes:report
```

### Monthly Statement

Monthly statements provide:
- Complete accrual history
- Payout transactions
- Year-to-date totals
- Tax reporting summary

---

## Related Documents

- [Node Charter](./node-charter.md)
- [Node Operator Onboarding SOP](./node-operator-onboarding-sop.md)
- [Rewards Ledger Schema](../ops/schemas/node-rewards-ledger.schema.json)
- [Incident Schema](../ops/schemas/node-incident.schema.json)

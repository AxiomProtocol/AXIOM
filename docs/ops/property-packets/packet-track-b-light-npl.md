# Property Packet: Track B - Light NPL Participation

**Version:** 1.0.0  
**Last Updated:** 2026-01-31  
**Classification:** Internal Use Only  
**Owner:** Capital Bridge Operations

---

## Summary

Track B Light NPL (Non-Performing Loan) Participation packets are used for mortgage notes with minor delinquency that have viable workout paths. These represent opportunistic assets requiring active management with higher return potential.

**Purpose:** Enable structured participation in light NPL mortgage notes with defined workout strategies, clear exit paths, and documented downside scenarios.

**When to Use:** Assets with 1-6 missed payments, borrower contact available, and viable reinstatement or modification path.

---

## Required Data Fields

| Field | Type | Required | Example |
|-------|------|----------|---------|
| `packetId` | string | Yes | `PKT-B-2026-001` |
| `trackType` | enum | Yes | `LIGHT_NPL` |
| `createdAt` | ISO8601 | Yes | `2026-01-31T14:30:00Z` |
| `createdBy` | address | Yes | `0x1234...5678` |
| `propertyAddress` | string | Yes | `456 Oak Ave, Memphis, TN 38103` |
| `propertyType` | enum | Yes | `SFR`, `MFR`, `CONDO`, `TOWNHOUSE` |
| `unpaidPrincipalBalance` | number | Yes | `142000.00` |
| `interestRate` | number | Yes | `6.75` |
| `originalLoanAmount` | number | Yes | `165000.00` |
| `originationDate` | date | Yes | `2020-03-20` |
| `maturityDate` | date | Yes | `2050-03-20` |
| `monthlyPayment` | number | Yes | `1071.23` |
| `lienPosition` | number | Yes | `1` |
| `servicerName` | string | Yes | `XYZ Special Servicing` |
| `delinquencyStatus` | object | Yes | See below |
| `borrowerContactStatus` | enum | Yes | `RESPONSIVE`, `UNRESPONSIVE`, `UNKNOWN` |
| `workoutOptionsAvailable` | array | Yes | See below |
| `propertyOccupancy` | enum | Yes | `OWNER_OCCUPIED`, `TENANT`, `VACANT` |
| `propertyCondition` | enum | No | `GOOD`, `FAIR`, `POOR`, `UNKNOWN` |
| `propertyValue` | number | No | `175000.00` |

### Delinquency Status Structure

```json
{
  "delinquencyStatus": {
    "missedPaymentCount": 3,
    "firstMissedDate": "2025-11-01",
    "lastMissedDate": "2026-01-01",
    "totalAmountPastDue": 3213.69,
    "lateFeesAccrued": 150.00,
    "escrowShortage": 0.00,
    "currentLegalStatus": "PRE_FORECLOSURE",
    "foreclosureFiledDate": null,
    "redemptionPeriodEnd": null
  }
}
```

### Workout Options Array

```json
{
  "workoutOptionsAvailable": [
    {
      "type": "REINSTATEMENT",
      "probability": "MEDIUM",
      "requiredAmount": 3363.69,
      "timeline": "30 days",
      "notes": "Borrower indicated job loss was temporary"
    },
    {
      "type": "MODIFICATION",
      "probability": "HIGH",
      "proposedTerms": "Rate reduction to 5.5%, term extension 5 years",
      "timeline": "60-90 days",
      "notes": "Borrower qualifies under HAMP guidelines"
    },
    {
      "type": "DISCOUNTED_PAYOFF",
      "probability": "LOW",
      "proposedAmount": 128000.00,
      "discount": "10%",
      "timeline": "90-120 days",
      "notes": "Requires third-party buyer"
    },
    {
      "type": "DEED_IN_LIEU",
      "probability": "LOW",
      "estimatedValue": 175000.00,
      "timeline": "60-90 days",
      "notes": "Last resort if borrower cooperative"
    }
  ]
}
```

---

## Required Settlement Artifacts

All artifacts must be stored with verified CID (Content Identifier) or SHA256 hash for audit trail integrity.

| Artifact | Format | CID Required | Description |
|----------|--------|--------------|-------------|
| Delinquency Status Summary | PDF/JSON | Yes | Current delinquency breakdown |
| Borrower Contact Log | PDF/CSV | Yes | Communication history |
| Workout Options Matrix | PDF/JSON | Yes | Available workout strategies |
| Timeline Assumptions | PDF | Yes | Projected resolution timeline |
| Downside Disclosure | PDF | Yes | Worst-case scenario analysis |
| Servicing Event Log Template | JSON | Yes | Ongoing event tracking template |
| Participation Agreement Draft | PDF | Yes | Draft participation terms |
| Property Valuation | PDF | Yes | BPO, AVM, or appraisal |
| Title Report | PDF | Yes | Current title status |

### Artifact Index Structure

```json
{
  "artifactIndex": {
    "delinquencyStatusSummary": {
      "cid": "bafybeig...",
      "sha256": "a1b2c3d4...",
      "filename": "delinquency-summary.pdf",
      "uploadedAt": "2026-01-30T10:00:00Z"
    },
    "borrowerContactLog": {
      "cid": "bafybeih...",
      "sha256": "e5f6g7h8...",
      "filename": "borrower-contact-log.csv",
      "uploadedAt": "2026-01-30T10:05:00Z"
    },
    "workoutOptionsMatrix": {
      "cid": "bafybeij...",
      "sha256": "i9j0k1l2...",
      "filename": "workout-matrix.json",
      "uploadedAt": "2026-01-30T10:10:00Z"
    },
    "timelineAssumptions": {
      "cid": "bafybeik...",
      "sha256": "m3n4o5p6...",
      "filename": "timeline-assumptions.pdf",
      "uploadedAt": "2026-01-30T10:15:00Z"
    },
    "downsideDisclosure": {
      "cid": "bafybeil...",
      "sha256": "q7r8s9t0...",
      "filename": "downside-disclosure.pdf",
      "uploadedAt": "2026-01-30T10:20:00Z"
    },
    "servicingEventLogTemplate": {
      "cid": "bafybeim...",
      "sha256": "u1v2w3x4...",
      "filename": "servicing-event-template.json",
      "uploadedAt": "2026-01-30T10:25:00Z"
    },
    "participationAgreement": {
      "cid": "bafybein...",
      "sha256": "y5z6a7b8...",
      "filename": "participation-agreement-draft.pdf",
      "uploadedAt": "2026-01-30T10:30:00Z"
    }
  }
}
```

---

## Risk Flags and Rejection Triggers

### Automatic Rejection (Hard Stop)

| Condition | Reason |
|-----------|--------|
| Missed payments > 12 | Deep NPL - requires different track |
| Active bankruptcy (Chapter 7) | Liquidation risk |
| Foreclosure sale scheduled < 30 days | Insufficient workout time |
| No borrower contact in 90+ days | Unworkable asset |
| Property condemned or uninhabitable | Collateral impairment |
| Title defects unresolvable | Legal encumbrance |
| Senior lien in default | Priority risk |

### Risk Flags (Requires Review)

| Flag | Severity | Action |
|------|----------|--------|
| Missed payments 6-12 | HIGH | Enhanced downside analysis |
| Borrower unresponsive | HIGH | Require foreclosure timeline |
| Property vacant | HIGH | Add preservation costs |
| LTV > 100% (underwater) | HIGH | Require recovery analysis |
| Judicial foreclosure state | MEDIUM | Add 12-18 month buffer |
| No recent property inspection | MEDIUM | Order BPO or inspection |
| Escrow shortage > $2,000 | LOW | Factor into reinstatement |

---

## Definition of Done Checklist

A Track B Light NPL packet is complete when ALL items are checked:

- [ ] `packetId` assigned following `PKT-B-YYYY-NNN` format
- [ ] All required data fields populated with verified values
- [ ] Delinquency status documented with missed payment details
- [ ] Borrower contact status verified and logged
- [ ] Workout options matrix complete with probability ratings
- [ ] Timeline assumptions documented with conservative buffers
- [ ] Downside disclosure prepared with worst-case scenario
- [ ] Servicing event log template initialized
- [ ] Property valuation current within 90 days
- [ ] No hard stop rejection triggers present
- [ ] All HIGH severity flags reviewed and documented
- [ ] Underwriting hash computed and recorded
- [ ] Dual attestation signatures obtained (if progressing to settlement)
- [ ] 24-hour timelock initiated (if progressing to authorization)

---

## Underwriting Outputs

Upon finalization, the following underwriting fields are computed:

| Field | Description | Example |
|-------|-------------|---------|
| `purchasePrice` | Offered acquisition price | `$95,000` |
| `participationAmount` | Capital participation amount | `$30,000` |
| `impliedYieldRange` | Conservative yield estimate | `12.5% - 18.0%` |
| `collateralValueEstimate` | Property value estimate | `$175,000` |
| `collateralConfidence` | Confidence level | `MEDIUM` |
| `ltvProxy` | Loan-to-value ratio | `81.1%` |
| `recoveryEstimate` | Expected recovery range | `$110,000 - $145,000` |
| `workoutProbability` | Primary workout success rate | `65%` |
| `timelineMonths` | Expected resolution timeline | `6-12 months` |
| `riskTier` | Overall risk classification | `MEDIUM`, `HIGH` |
| `riskReasonCodes` | Array of risk factors | `["DELINQUENT", "WORKOUT_REQUIRED"]` |
| `underwritingHash` | SHA256 of underwriting data | `sha256:def456...` |

---

## Workout Resolution Tracking

Track B packets require ongoing servicing event logging:

```json
{
  "servicingEvents": [
    {
      "date": "2026-02-01",
      "type": "BORROWER_CONTACT",
      "outcome": "Spoke with borrower, employment confirmed",
      "nextAction": "Send reinstatement quote",
      "nextActionDue": "2026-02-05"
    },
    {
      "date": "2026-02-05",
      "type": "REINSTATEMENT_QUOTE_SENT",
      "outcome": "Quote sent via certified mail",
      "nextAction": "Follow up call",
      "nextActionDue": "2026-02-12"
    }
  ]
}
```

---

## Related Documents

- [Track A Performing Packet](./packet-track-a-performing.md)
- [Property Packet Operator SOP](../property-packet-operator-sop.md)
- [Settlement Artifacts Schema](../schemas/settlement-artifacts.schema.json)
- [DeNet Enforcement Proof](../../storage/denet-enforcement-proof.md)

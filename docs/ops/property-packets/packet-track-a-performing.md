# Property Packet: Track A - Performing Participation

**Version:** 1.0.0  
**Last Updated:** 2026-01-31  
**Classification:** Internal Use Only  
**Owner:** Capital Bridge Operations

---

## Summary

Track A Performing Participation packets are used for mortgage notes with active, current payment histories. These represent lower-risk assets suitable for stable yield participation structures.

**Purpose:** Enable structured participation in performing mortgage notes with verified payment histories, clear lien positions, and predictable cashflow schedules.

**When to Use:** Assets with 6+ months of on-time payment history and no material delinquency flags.

---

## Required Data Fields

| Field | Type | Required | Example |
|-------|------|----------|---------|
| `packetId` | string | Yes | `PKT-A-2026-001` |
| `trackType` | enum | Yes | `PERFORMING` |
| `createdAt` | ISO8601 | Yes | `2026-01-31T14:30:00Z` |
| `createdBy` | address | Yes | `0x1234...5678` |
| `propertyAddress` | string | Yes | `123 Main St, Atlanta, GA 30301` |
| `propertyType` | enum | Yes | `SFR`, `MFR`, `CONDO`, `TOWNHOUSE` |
| `unpaidPrincipalBalance` | number | Yes | `185000.00` |
| `interestRate` | number | Yes | `7.25` |
| `originalLoanAmount` | number | Yes | `200000.00` |
| `originationDate` | date | Yes | `2022-06-15` |
| `maturityDate` | date | Yes | `2052-06-15` |
| `monthlyPayment` | number | Yes | `1364.89` |
| `lienPosition` | number | Yes | `1` |
| `servicerName` | string | Yes | `ABC Servicing LLC` |
| `paymentHistoryMonths` | number | Yes | `18` |
| `lastPaymentDate` | date | Yes | `2026-01-15` |
| `borrowerCreditScore` | number | No | `720` |
| `ltv` | number | No | `85.5` |
| `propertyValue` | number | No | `216000.00` |

---

## Required Settlement Artifacts

All artifacts must be stored with verified CID (Content Identifier) or SHA256 hash for audit trail integrity.

| Artifact | Format | CID Required | Description |
|----------|--------|--------------|-------------|
| Payment History Proof | PDF/CSV | Yes | 6-12 months payment ledger from servicer |
| Servicer Statement | PDF | Yes | Current servicer account statement |
| Lien Position Verification | PDF | Yes | Title search or lien verification letter |
| Participation Agreement Draft | PDF | Yes | Draft participation terms document |
| Cashflow Schedule | JSON/CSV | Yes | Projected monthly payment schedule |
| Note Copy | PDF | Yes | Copy of original promissory note |
| Deed of Trust | PDF | Yes | Recorded deed of trust or mortgage |

### Artifact Index Structure

```json
{
  "artifactIndex": {
    "paymentHistoryProof": {
      "cid": "bafybeig...",
      "sha256": "a1b2c3d4...",
      "filename": "payment-history-18mo.pdf",
      "uploadedAt": "2026-01-30T10:00:00Z"
    },
    "servicerStatement": {
      "cid": "bafybeih...",
      "sha256": "e5f6g7h8...",
      "filename": "servicer-statement-jan2026.pdf",
      "uploadedAt": "2026-01-30T10:05:00Z"
    },
    "lienPositionVerification": {
      "cid": "bafybeij...",
      "sha256": "i9j0k1l2...",
      "filename": "title-search-report.pdf",
      "uploadedAt": "2026-01-30T10:10:00Z"
    },
    "participationAgreement": {
      "cid": "bafybeik...",
      "sha256": "m3n4o5p6...",
      "filename": "participation-agreement-draft.pdf",
      "uploadedAt": "2026-01-30T10:15:00Z"
    },
    "cashflowSchedule": {
      "cid": "bafybeil...",
      "sha256": "q7r8s9t0...",
      "filename": "cashflow-schedule.json",
      "uploadedAt": "2026-01-30T10:20:00Z"
    }
  }
}
```

---

## Risk Flags and Rejection Triggers

### Automatic Rejection (Hard Stop)

| Condition | Reason |
|-----------|--------|
| Payment history < 6 months | Insufficient performance data |
| Any payment > 30 days late in last 12 months | Delinquency flag |
| Lien position > 1 without subordination agreement | Senior lien risk |
| Missing servicer statement | Cannot verify current status |
| Borrower in active bankruptcy | Legal encumbrance |
| Property in foreclosure | Active default status |

### Risk Flags (Requires Review)

| Flag | Severity | Action |
|------|----------|--------|
| LTV > 90% | HIGH | Require additional equity analysis |
| Interest rate below market | MEDIUM | Document rationale |
| Property in judicial foreclosure state | MEDIUM | Add timeline buffer |
| Servicer not on approved list | LOW | Complete servicer due diligence |
| Payment history 6-12 months | LOW | Apply conservative yield assumption |

---

## Definition of Done Checklist

A Track A Performing packet is complete when ALL items are checked:

- [ ] `packetId` assigned following `PKT-A-YYYY-NNN` format
- [ ] All required data fields populated with verified values
- [ ] Payment history proof uploaded with valid CID (minimum 6 months)
- [ ] Servicer statement current within 30 days
- [ ] Lien position verification complete (first lien or subordination documented)
- [ ] Participation agreement draft generated
- [ ] Cashflow schedule computed with conservative assumptions
- [ ] No hard stop rejection triggers present
- [ ] All risk flags reviewed and documented
- [ ] Underwriting hash computed and recorded
- [ ] Dual attestation signatures obtained (if progressing to settlement)
- [ ] 24-hour timelock initiated (if progressing to authorization)

---

## Underwriting Outputs

Upon finalization, the following underwriting fields are computed:

| Field | Description | Example |
|-------|-------------|---------|
| `purchasePrice` | Offered acquisition price | `$175,000` |
| `participationAmount` | Capital participation amount | `$50,000` |
| `impliedYieldRange` | Conservative yield estimate | `8.5% - 10.2%` |
| `collateralValueEstimate` | Property value estimate | `$216,000` |
| `collateralConfidence` | Confidence level | `HIGH`, `MEDIUM`, `LOW` |
| `ltvProxy` | Loan-to-value ratio | `85.6%` |
| `dscrProxy` | Debt service coverage (if rental) | `1.25` |
| `riskTier` | Overall risk classification | `LOW`, `MEDIUM`, `HIGH` |
| `riskReasonCodes` | Array of risk factors | `["LTV_ELEVATED"]` |
| `underwritingHash` | SHA256 of underwriting data | `sha256:abc123...` |

---

## Related Documents

- [Track B Light NPL Packet](./packet-track-b-light-npl.md)
- [Property Packet Operator SOP](../property-packet-operator-sop.md)
- [Settlement Artifacts Schema](../schemas/settlement-artifacts.schema.json)
- [DeNet Enforcement Proof](../../storage/denet-enforcement-proof.md)

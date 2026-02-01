# Node Operator Program - Observer Dashboard

**Last Updated:** 2026-02-01

---

## Overview

The Axiom Node Operator Program establishes a decentralized network of qualified participants who validate, attest, and monitor Capital Bridge settlement activities. This dashboard provides transparency metrics for the program.

---

## Program Status

| Metric | Value | Target |
|--------|-------|--------|
| Active Operators | -- | -- |
| Suspended Operators | -- | 0 |
| Governance Incidents | -- | 0 |
| Observation Window End | 2026-03-26 | -- |

---

## Operator Roles

### Observer (Read-Only)
- View settlement pipeline status
- Access transparency dashboards
- Generate and publish weekly reports
- Monitor protocol health indicators

### Validator
- All Observer capabilities
- Review property packet artifacts for completeness
- Verify underwriting calculations
- Submit validation reports

### Attestor
- All Validator capabilities
- Provide final attestation for settlement authorization
- Participate in dual attestation requirements
- Review and sign off on post-settlement audits

---

## Onboarding Pipeline

```
APPLIED → VERIFIED → PROVISIONED → DRY_RUN_PASSED → CERTIFIED → ACTIVE
```

| Status | Description |
|--------|-------------|
| APPLIED | Application submitted, pending review |
| VERIFIED | Identity verification complete |
| PROVISIONED | Keys and access credentials issued |
| DRY_RUN_PASSED | Dry-run exercises completed successfully |
| CERTIFIED | Final certification complete |
| ACTIVE | Full operational status |

---

## Milestone Rewards

| Milestone | USD Value | Observer | Validator | Attestor |
|-----------|-----------|----------|-----------|----------|
| PACKET_ACCEPTED | $10 | $2 (20%) | $6 (60%) | $10 (100%) |
| UNDERWRITING_FINALIZED | $20 | $0 | $12 (60%) | $20 (100%) |
| ARTIFACTS_PREVALIDATED | $20 | $0 | $12 (60%) | $20 (100%) |
| DUAL_ATTESTATION_RECORDED | $25 | $0 | $0 | $25 (100%) |
| POST_SETTLEMENT_AUDIT | $25 | $5 (20%) | $15 (60%) | $25 (100%) |

**Total per settlement cycle:** $100 USD equivalent

---

## Incident Severity Levels

| Severity | Slash % | Suspension |
|----------|---------|------------|
| LOW | 0% | None |
| MEDIUM | 25% | 30 days |
| HIGH | 50% | 90 days |
| CRITICAL | 100% | Permanent |

---

## Weekly Reports

Weekly transparency reports are generated every Sunday and include:

- Operator summary by role and status
- Attestation metrics and pass rates
- Reward accrual and payout summaries
- Incident counts by severity
- SLA compliance metrics

Reports are published to:
- `docs/ops/reports/node-weekly-report.md`
- `docs/observer/node-program-metrics.md`
- `docs/observer/node-program-metrics.json`

---

## CLI Commands

```bash
# Full onboarding flow
npm run nodes:apply          # Submit application
npm run nodes:verify         # Complete verification
npm run nodes:provision      # Provision credentials
npm run nodes:dryrun         # Run dry-run exercises
npm run nodes:certify        # Complete certification
npm run nodes:activate       # Activate operator

# Operations
npm run nodes:attest         # Record attestations
npm run nodes:rewards        # Accrue rewards
npm run nodes:payout         # View payout preview
npm run nodes:report         # Generate weekly report

# Incidents
npm run nodes:incident       # File incident
npm run nodes:adjudicate     # Adjudicate incident
npm run nodes:revoke         # Revoke operator

# End-to-end demo
npm run nodes:run
```

---

## Documentation

- [Node Charter](../nodes/node-charter.md)
- [Onboarding SOP](../nodes/node-operator-onboarding-sop.md)
- [Compensation Policy](../nodes/node-compensation-policy.md)
- [Implementation Assumptions](../nodes/assumptions.md)

---

## Schemas

- [Operator Schema](../ops/schemas/node-operator.schema.json)
- [Onboarding Schema](../ops/schemas/node-onboarding.schema.json)
- [Attestation Schema](../ops/schemas/node-attestation.schema.json)
- [Rewards Schema](../ops/schemas/node-rewards-ledger.schema.json)
- [Incident Schema](../ops/schemas/node-incident.schema.json)

---

*This dashboard is part of the Axiom Transparency Initiative.*

# Permissions Diff Report

**Generated:** 2026-01-27T07:07:21.199Z
**Status:** Observation Window Active

## Role-Based Access Control Summary

### Admin-Only Routes (During Observation)

| Route | Required Role | Status |
|-------|---------------|--------|
| /api/internal/ledger/entries | Admin | ✅ Protected |
| /api/internal/ledger/approve | Admin | ✅ Protected |
| /api/internal/ledger/accounts | Admin | ✅ Protected |
| /api/internal/notes/* | Admin | ✅ Protected |

### Public Read-Only Routes

| Route | Access | Status |
|-------|--------|--------|
| /api/observer/* | Public | ✅ Read-only |
| /api/treasury/stats | Public | ✅ Read-only |
| /faq | Public | ✅ Information only |

### Blocked Routes (Observation Mode)

| Route | Block Reason | Status |
|-------|--------------|--------|
| /api/investor/* | No investor onboarding | 🚫 Blocked |
| /api/land-funds/subscribe | No subscriptions | 🚫 Should be blocked |
| /api/deposit/* | No external deposits | 🚫 Should be blocked |

## Feature Flag Status

| Flag | Value | Enforcement |
|------|-------|-------------|
| OBSERVATION_MODE | true | All layers |
| TREASURY_INTERNAL_ENABLED | true | API + UI |
| PRIVATE_CREDIT_SELF_FUNDED_ENABLED | true | API + UI |
| REG_CF_ENABLED | false | Blocked |
| INSTITUTIONAL_LP_ENABLED | false | Blocked |
| EXTERNAL_DEPOSITS_ENABLED | false | Blocked |
| INVESTOR_ONBOARDING_ENABLED | false | Blocked |

---
*This report is part of the observation mode safety harness.*

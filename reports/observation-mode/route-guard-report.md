# Route Guard Report

**Generated:** 2026-01-27T07:07:21.199Z
**Status:** Observation Window Active

## Protected Routes Status

| Route | Protected | Method | Guard Type |
|-------|-----------|--------|------------|
| /api/investments/matching | ❌ | GET | UNPROTECTED |
| /api/investor/auth/login | ❌ | GET | UNPROTECTED |
| /api/investor/auth/login | ❌ | GET | UNPROTECTED |
| /api/investor/auth/setup | ❌ | GET | UNPROTECTED |
| /api/investor/auth/setup | ❌ | GET | UNPROTECTED |
| /api/investor/investments | ✅ | GET | observationGuard |
| /api/investor/investments | ✅ | GET | observationGuard |
| /api/investor/portal | ❌ | GET | UNPROTECTED |
| /api/investor/portal | ❌ | GET | UNPROTECTED |
| /api/land-funds/subscribe | ✅ | GET | observationGuard |

## Unprotected Routes (Action Required)

- **/api/investments/matching** - Needs protection
- **/api/investor/auth/login** - Needs protection
- **/api/investor/auth/login** - Needs protection
- **/api/investor/auth/setup** - Needs protection
- **/api/investor/auth/setup** - Needs protection
- **/api/investor/portal** - Needs protection
- **/api/investor/portal** - Needs protection

## Internal Module Routes (Admin-Only)

| Route | Status |
|-------|--------|
| /api/internal/ledger/* | Protected (adminOnlyDuringObservation) |
| /api/internal/notes/* | Protected (adminOnlyDuringObservation) |

---
*This report is part of the observation mode safety harness.*

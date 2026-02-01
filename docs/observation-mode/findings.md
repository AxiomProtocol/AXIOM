# Axiom Protocol - Observation Mode Audit Findings

**Generated:** 2026-01-27  
**Auditor:** Replit AI  
**Status:** OBSERVATION WINDOW ACTIVE  

---

## Executive Summary

This audit identifies existing treasury, settlement, investment, and credit surfaces within the Axiom Protocol codebase. The findings inform safe activation of internal-only financial modules during the governance hardening observation window.

---

## 1. Existing Treasury/Settlement Surfaces

### 1.1 Treasury API Routes
| Route | Purpose | Risk Level | Action Required |
|-------|---------|------------|-----------------|
| `/api/treasury/ops.ts` | Treasury operations | HIGH | Guard with admin-only |
| `/api/treasury/liquidity.ts` | Liquidity management | MEDIUM | Read-only public, write admin-only |
| `/api/treasury/automation.ts` | Automated treasury actions | HIGH | Admin-only |
| `/api/treasury/metrics.ts` | Treasury metrics | LOW | Public read OK |
| `/api/treasury/transactions.ts` | Transaction history | MEDIUM | Admin-only write |
| `/api/treasury/stats.ts` | Statistics | LOW | Public read OK |
| `/api/treasury/fee-router.ts` | Fee routing | HIGH | Admin-only |

### 1.2 On-Chain Treasury Contracts
| Contract | Address | Status |
|----------|---------|--------|
| AxiomTreasuryAndRevenueHub | `0x3fD63728288546AC41dAe3bf25ca383061c3A929` | ACTIVE - 24h timelock |
| GovernanceHub | `0x52Dc85fd653a75323b5307f4D2629ab9A070530E` | ACTIVE - Governance control |
| TimelockController | `0xf1B1D594d6Edc9f045dF55B32006A24e666Ed899` | ACTIVE - Configurable |

---

## 2. Investment/Deposit Surfaces (RISK AREAS)

### 2.1 Database Tables with Investment Language
| Table | Location | Risk | Notes |
|-------|----------|------|-------|
| `userInvestmentPreferences` | schema.ts:204 | LOW | Preferences only |
| `savingsTransactionTypeEnum` | schema.ts:47 | MEDIUM | Includes "deposit" type |
| `contributionPlans` | schema.ts:464 | MEDIUM | "contribution" language |
| `accreditedInvestors` | schema.ts:7041 | HIGH | Investor onboarding |

### 2.2 API Routes with Investment/Deposit Semantics
| Route | Purpose | Status | Action |
|-------|---------|--------|--------|
| `/api/investor/*` | Investor portal | ACTIVE | BLOCK during observation |
| `/api/admin/investors.ts` | Investor management | ACTIVE | Admin-only, no onboarding |
| `/api/land-funds/subscribe.ts` | Fund subscriptions | ACTIVE | BLOCK during observation |
| `/api/phase3/treasury-notes.ts` | Treasury notes | ACTIVE | Internal-only mode |

### 2.3 Components with Investment CTAs
| Component | File | Risk Pattern | Action |
|-----------|------|--------------|--------|
| EnhancedOnboarding | components/EnhancedOnboarding.tsx | "contribute" | Review |
| TokenomicsExplainer | components/TokenomicsExplainer.tsx | "treasury" | Safe |
| PersonalizedDashboard | components/PersonalizedDashboard.tsx | "investment" | Review |

---

## 3. KYC/Onboarding Surfaces

### 3.1 KYC Tables
- `kycVerifications` (schema.ts:302-343)
- `kycDocuments` (schema.ts:346-383)
- `kycVerificationSteps` (schema.ts:386-420)
- `kycAuditLogs` (schema.ts:423-451)

### 3.2 KYC Routes
| Route | Status | Observation Mode |
|-------|--------|------------------|
| `/routes/kyc.js` | ACTIVE | Keep for compliance, no new signups |

---

## 4. Credit/Lending Surfaces

### 4.1 Existing Schema Tables
| Table | Line | Purpose | Status |
|-------|------|---------|--------|
| `creditScoreUpdates` | 3840 | Credit score tracking | ACTIVE |
| `creditScoreActions` | 3941 | Score action history | ACTIVE |
| `participationCredits` | 4134 | Participation rewards | ACTIVE |

### 4.2 Lending Contracts (Already Deployed)
| Contract | Address | Notes |
|----------|---------|-------|
| RiskConfig | `0xD9a53c691B688351283Fecc33D8D9AF964A9a078` | Fix & Flip risk params |
| DSCRRiskConfig | `0xd9d5a2A1aDF917BECd9454De632DfC69895a2B26` | DSCR risk params |
| FixFlipManager | `0xD6ebaBEAEf4B263fa10cc0E630Ab2B9A2e478958` | Bridge loan manager |
| DSCRLoanManager | `0x105117F1AD1B65a5d0C7F0E9A870683A06738E16` | DSCR loan manager |
| ProductRegistry | `0x31AD75DB98F142069ff30D6C7C206Ca4b5a10e5d` | Loan product config |

---

## 5. Missing Components for Internal Modules

### 5.1 Treasury Internal Ledger (MISSING)
- [ ] `TreasuryAccount` model - Internal accounts
- [ ] `LedgerEntry` model - Journal entries
- [ ] `InternalCounterparty` model - Internal entities only
- [ ] Admin-only entry creation API
- [ ] Reconciliation workflow
- [ ] Export functionality

### 5.2 Private Credit Note Self-Funded Mode (MISSING)
- [ ] `PrivateCreditNote` model - Self-funded notes
- [ ] `NotePaymentEvent` model - Payment tracking
- [ ] `NoteCovenantChecklist` model - Covenant tracking
- [ ] Admin-only note creation
- [ ] Parameter linking to GovernanceHub

---

## 6. Environment Variables Review

### 6.1 Current Feature-Related Vars
| Variable | Value | Notes |
|----------|-------|-------|
| WORKBOOK_TEST_MODE | true (dev) | Test mode active |
| None observation-specific | - | Need to add |

### 6.2 Required New Feature Flags
| Flag | Default | Purpose |
|------|---------|---------|
| OBSERVATION_MODE | true | Master observation gate |
| TREASURY_INTERNAL_ENABLED | true | Enable internal ledger |
| PRIVATE_CREDIT_SELF_FUNDED_ENABLED | true | Enable self-funded notes |
| REG_CF_ENABLED | false | BLOCK Reg CF flows |
| INSTITUTIONAL_LP_ENABLED | false | BLOCK institutional LP |

---

## 7. Risk Surfaces Summary

### HIGH RISK (Must Block/Guard)
1. `/api/investor/*` - All investor onboarding routes
2. `/api/land-funds/subscribe.ts` - Subscription endpoints
3. Any "deposit", "invest", "contribute" buttons in public UI
4. `accreditedInvestors` table writes

### MEDIUM RISK (Admin-Only)
1. Treasury write operations
2. Credit note creation
3. KYC new signups

### LOW RISK (Safe)
1. Observer dashboard (read-only)
2. Treasury metrics (read-only)
3. Governance displays

---

## 8. Recommendations

1. **Add Feature Flags** - Implement centralized feature flag system
2. **Route Guards** - Add middleware for observation mode enforcement
3. **UI Banners** - Display "Observation Window: Internal Only" prominently
4. **CTA Audit** - Scan and disable investment CTAs
5. **Create Ledger Models** - New schema for internal settlement
6. **Create Note Models** - New schema for self-funded credit notes
7. **Public FAQ** - Explain no-investment posture clearly

---

*This document is part of the governance hardening observation window documentation.*

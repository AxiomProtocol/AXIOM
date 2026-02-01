# Module Activation - Contract Mapping

**Generated:** 2026-01-27  
**Network:** Arbitrum One (42161)  
**Mode:** OBSERVATION WINDOW - Internal Only

---

## Overview

This document maps the two modules being activated to existing contracts. The goal is to activate with **zero new contract deployments** using configuration and application-layer controls only.

---

## Module A: Internal Settlement and Utility Instrument

### Contract Requirements: NONE REQUIRED

This module operates entirely at the **application layer** using:

1. **Database Models** (New)
   - `treasuryAccounts` - PostgreSQL table
   - `ledgerEntries` - PostgreSQL table
   - `internalCounterparties` - PostgreSQL table

2. **Existing Contract Integration** (Read-Only)
   | Contract | Address | Usage |
   |----------|---------|-------|
   | AxiomTreasuryAndRevenueHub | `0x3fD63728288546AC41dAe3bf25ca383061c3A929` | Balance reads |
   | GovernanceHub | `0x52Dc85fd653a75323b5307f4D2629ab9A070530E` | Config reads |

3. **API Endpoints** (New, Admin-Only)
   - `POST /api/internal/ledger/entry` - Create entry
   - `GET /api/internal/ledger/entries` - List entries
   - `POST /api/internal/ledger/approve` - Approve entry
   - `GET /api/internal/ledger/export` - Export data

4. **No On-Chain Writes Required**
   - All settlement is internal bookkeeping
   - No token movements
   - No external fund acceptance

---

## Module B: Reg D Private Credit Note (Self-Funded Mode)

### Contract Requirements: NONE REQUIRED

This module operates entirely at the **application layer** using:

1. **Database Models** (New)
   - `privateCreditNotes` - PostgreSQL table
   - `notePaymentEvents` - PostgreSQL table
   - `noteCovenants` - PostgreSQL table
   - `noteDocuments` - PostgreSQL table

2. **Existing Contract Integration** (Read-Only for Parameters)
   | Contract | Address | Usage |
   |----------|---------|-------|
   | RiskConfig | `0xD9a53c691B688351283Fecc33D8D9AF964A9a078` | Max LTV, rates |
   | DSCRRiskConfig | `0xd9d5a2A1aDF917BECd9454De632DfC69895a2B26` | DSCR params |
   | ProductRegistry | `0x31AD75DB98F142069ff30D6C7C206Ca4b5a10e5d` | Product config |
   | GovernanceHub | `0x52Dc85fd653a75323b5307f4D2629ab9A070530E` | Governance state |

3. **API Endpoints** (New, Admin-Only)
   - `POST /api/internal/notes/create` - Create note
   - `GET /api/internal/notes/list` - List notes
   - `POST /api/internal/notes/payment` - Record payment
   - `GET /api/internal/notes/[id]` - Note details

4. **Governance Alignment**
   - Rate bounds read from RiskConfig
   - LTV limits read from RiskConfig
   - No contract modifications
   - App-layer 24h timelock simulation for parameter changes

---

## Contracts NOT Being Modified

| Contract | Address | Reason |
|----------|---------|--------|
| AxiomTimelockController | `0xf1B1D594d6Edc9f045dF55B32006A24e666Ed899` | Already deployed, observation |
| AxiomGovernanceConfig | `0xa645a0Fcc15dD22Ee44d774F19731Fb0fE70b2CC` | Already deployed, observation |
| FixFlipManager | `0xD6ebaBEAEf4B263fa10cc0E630Ab2B9A2e478958` | Read-only reference |
| DSCRLoanManager | `0x105117F1AD1B65a5d0C7F0E9A870683A06738E16` | Read-only reference |
| All DEX contracts | Various | Not affected |
| All AXUSD contracts | Various | Not affected |

---

## New Contract Deployment: NOT REQUIRED

Both modules can be fully implemented using:

1. **PostgreSQL database tables** - For ledger and note tracking
2. **Next.js API routes** - For admin-only CRUD operations
3. **React components** - For admin UI
4. **Feature flags** - For observation mode enforcement
5. **Existing contract reads** - For parameter validation

---

## Security Considerations

### No External Fund Flows
- No deposit endpoints
- No investor onboarding
- No token transfers
- Internal bookkeeping only

### Admin-Only Access
- All write operations require admin role
- JWT validation on all endpoints
- Audit logging for all actions

### Governance Alignment
- Parameters read from on-chain configs
- No ability to bypass timelock
- App-layer timelock simulation for internal params

---

*Contract deployment is NOT required for observation mode activation.*

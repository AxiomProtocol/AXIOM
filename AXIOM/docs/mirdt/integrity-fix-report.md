# MIRDT V1 Integrity Fix Report

Date: 2026-02-11
Scope: P0 and P1 audit corrections from formal MIRDT integrity audit + Phase 2 language modernization
Build status: PASSING
Lexicon test status: PASSING (all 5 files clean, 0 violations)

## Summary

Seven structural risks (R1-R7) were identified during formal audit. P0 and P1 fixes have been implemented. P2-P4 items are documented as V1 limitations.

## P0: Invalidation Engine (R5)

**Problem:** INVALIDATED status enum existed in schema but no code path transitioned ACTIVE setups to INVALIDATED when price crossed the invalidation level.

**Solution:** New API endpoint at `pages/api/mirdt/check-invalidations.ts`

**Endpoint:** `POST /api/mirdt/check-invalidations`

**Behavior:**
1. Queries all ACTIVE setups with invalidationPrice present (batch limit: 50)
2. Infers trade direction from entry zone geometry:
   - invalidationPrice < entryZoneLow → LONG thesis
   - invalidationPrice > entryZoneHigh → SHORT thesis
3. Fetches live price by asset type:
   - CRYPTO: CoinGecko API
   - EQUITY: Alpha Vantage API
4. Checks invalidation condition:
   - LONG: currentPrice <= invalidationPrice (price fell below stop)
   - SHORT: currentPrice >= invalidationPrice (price rose above stop)
5. On invalidation: updates status to INVALIDATED, appends event to rationale_trace_json
6. Returns JSON: { checkedCount, invalidatedCount, invalidatedIds, errors }

**Fault tolerance:** Promise.allSettled ensures individual price lookup failures do not abort the batch.

**Authorization:** `x-scan-key` header required in production; dev mode allows unauthenticated access.

**Invocation:**
```bash
# Development
curl -X POST http://localhost:5000/api/mirdt/check-invalidations

# Production
curl -X POST https://your-domain/api/mirdt/check-invalidations \
  -H "x-scan-key: YOUR_MIRDT_SCAN_KEY"
```

## P1: Lexicon Compliance Table (R3)

**Problem:** Existing compliance_audit_logs table lacked fields for lexicon scanning (scope, filePath, originalTerm, replacementTerm, lineNumber).

**Solution:** New dedicated table `mirdt_lexicon_scan_logs` in shared/schema.ts

**Fields:**
- id: UUID (auto-generated)
- createdAt: timestamp
- scope: varchar (e.g. 'mirdt-ui', 'pilot-ui')
- filePath: varchar (nullable)
- originalTerm: varchar
- replacementTerm: varchar (nullable)
- lineNumber: integer (nullable)
- excerpt: text (nullable)
- status: enum FOUND | CLEAN
- meta: jsonb (nullable)

**Note:** Additive-only change. Existing compliance_audit_logs table was not modified.

## P1: Lexicon Guard Test (R6)

**Problem:** Lexicon guard utility existed but no automated enforcement against MIRDT UI strings.

**Solution:** New test file `tests/mirdt-lexicon.test.ts`

**Two-tier enforcement:**
- **Critical files** (MIRDT): pages/mirdt/index.tsx, pages/mirdt/[id].tsx — violations block build (exit 1)
- **Advisory files**: pages/pilot/index.tsx, pages/sentinel/index.tsx, pages/about-us.tsx — violations reported but do not block

**False positive filtering:**
- CSS class names (e.g. `dl-token`, `bg-mint`) excluded
- Code identifiers and import paths excluded
- Comments stripped before scanning

**Script:** `npm run test:lexicon`

## Verification Commands

```bash
# Install dependencies
npm install

# Run lexicon guard test
npm run test:lexicon

# Run production build
npm run build

# Invoke invalidation check (dev)
curl -X POST http://localhost:5000/api/mirdt/check-invalidations
```

## Files Changed

| File | Change Type | Description |
|---|---|---|
| pages/api/mirdt/check-invalidations.ts | NEW | Invalidation engine endpoint |
| shared/schema.ts | EDIT | Added mirdtLexiconScanLogs table (additive-only) |
| tests/mirdt-lexicon.test.ts | NEW | Lexicon guard enforcement test |
| package.json | EDIT | Added test:lexicon script |
| docs/mirdt/reality-map.md | NEW | Ground truth scan document |
| docs/mirdt/integrity-fix-report.md | NEW | This document |
| docs/compliance/language-modernization-map.md | NEW | Phase 2 replacement mapping and exclusions |
| lib/designLaw/lexiconGuard.ts | EDIT | Added compound term exclusions (bridge loan, etc.) |
| pages/about-us.tsx | EDIT | UI copy modernization (4 term replacements) |

## Phase 2: Language Modernization (Completed)

UI copy modernization applied to pages/about-us.tsx. Replaced "token" → "instrument", "smart contract(s)" → "automated control layer(s)", "Multi-signature" → "Multi-party authorization". Lexicon guard updated with compound term exclusions for "bridge loan" (standard financial term). See docs/compliance/language-modernization-map.md for full mapping.

## V1 Limitations (Not Addressed)

- R1: Data model tightening (entry zone validation constraints)
- R2: Signal scoring normalization
- R4: State machine formalization
- R7: MAE/MFE population
- Equity universe expansion beyond Alpha Vantage coverage

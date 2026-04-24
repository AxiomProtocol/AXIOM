# MIRDT V1 Integrity Fixes

Date: 2026-02-11
Scope: P0 and P1 audit corrections only

## Changes Made

### P0: Invalidation State Transition (R5)

**Problem:** The INVALIDATED status enum existed in the schema but no code path
ever transitioned a setup from ACTIVE to INVALIDATED.

**Fix:** New API endpoint `POST /api/mirdt/check-invalidations`

**File added:** `pages/api/mirdt/check-invalidations.ts`

**Behavior:**
1. Queries all ACTIVE setups (batch limit: 50 per invocation)
2. For each setup, fetches current price using the correct provider:
   - CRYPTO assets: CoinGecko current price
   - EQUITY assets: Alpha Vantage current price
3. Infers trade direction from invalidation price vs entry zone:
   - invalidationPrice < entryZoneLow = LONG thesis
   - invalidationPrice > entryZoneHigh = SHORT thesis
4. Checks invalidation condition:
   - LONG: currentPrice <= invalidationPrice
   - SHORT: currentPrice >= invalidationPrice
5. On invalidation:
   - Updates status to INVALIDATED
   - Appends invalidation event to rationale_trace_json
6. Returns JSON summary: checkedCount, invalidatedCount, invalidatedIds[]

**Fault tolerance:**
- Uses Promise.allSettled — individual price lookup failures do not abort the run
- Skips setups where price is unavailable
- Reports errors in response without throwing

**Invocation:**
```bash
curl -X POST https://your-domain/api/mirdt/check-invalidations \
  -H "x-scan-key: YOUR_MIRDT_SCAN_KEY"
```

### P1: Lexicon Scan Log Table (R3)

**Problem:** The existing compliance_audit_logs table was designed for operational
audit (action, actor, resource) and lacked fields for lexicon scanning (scope,
filePath, originalTerm, replacementTerm, lineNumber).

**Fix:** New dedicated table `mirdt_lexicon_scan_logs` in shared/schema.ts

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

**Note:** The existing compliance_audit_logs table was not modified.

### P1: Lexicon Guard Tests (R6)

**Problem:** The lexicon guard utility existed but no tests enforced it against
MIRDT UI strings.

**Fix:** New test file `tests/mirdt-lexicon.test.ts`

**Files scanned:**
- pages/mirdt/index.tsx
- pages/mirdt/[id].tsx
- pages/pilot/index.tsx
- pages/sentinel/index.tsx
- pages/about-us.tsx

**Behavior:**
- Extracts UI string literals from each file
- Strips comments before scanning (design gate checklists are excluded)
- Runs each string through checkLexicon() from lib/designLaw/lexiconGuard.ts
- Reports violations with file path, line number, term, and excerpt
- Exits with code 1 if violations found (CI-compatible)

**Run:**
```bash
npm run test:lexicon
```

## Commands

```bash
# Push schema changes to database
npm run db:push

# Run lexicon guard test
npm run test:lexicon

# Run production build
npm run build

# Invoke invalidation check (dev mode, no key required)
curl -X POST http://localhost:5000/api/mirdt/check-invalidations

# Invoke invalidation check (production, key required)
curl -X POST https://your-domain/api/mirdt/check-invalidations \
  -H "x-scan-key: YOUR_MIRDT_SCAN_KEY"
```

## Files Changed

| File | Change |
|---|---|
| pages/api/mirdt/check-invalidations.ts | NEW — invalidation engine |
| shared/schema.ts | EDIT — added mirdtLexiconScanLogs table |
| tests/mirdt-lexicon.test.ts | NEW — lexicon enforcement test |
| package.json | EDIT — added test:lexicon script |
| docs/compliance/mirdt-integrity-fixes.md | NEW — this document |

# Cost Intelligence Engine

## Overview

The Cost Intelligence Engine is Axiom Protocol's verified rehab underwriting layer. It produces institutional-grade construction cost estimates grounded in the **Craftsman National Construction Estimator (NCE)** cost database, with regional adjustments and full line-item audit trails.

All estimates are DB-first, versioned, and traceable to a specific Craftsman benchmark record — giving operators and capital allocators a defensible, verifiable basis for rehab budgets.

---

## Architecture

```
Deal Workspace (UI)
  └── CostIntelligencePanel.tsx
        ├── TemplateSelector       -- pick pre-built scope templates
        ├── ScopeBuilder           -- add/edit/delete scope items
        └── EstimateReview         -- line-item breakdown + trade chart

API Layer (pages/api/cost-intelligence/)
  ├── estimates/index.ts           -- CRUD list/create
  ├── estimates/[estimateId]/index.ts   -- get/patch/delete single
  ├── estimates/[estimateId]/scope.ts   -- add/delete scope items
  ├── estimates/[estimateId]/generate.ts -- trigger estimate generation
  ├── catalog/index.ts             -- browse all systems/items
  ├── catalog/search.ts            -- keyword search
  ├── templates/index.ts           -- list/create templates
  └── benchmarks/index.ts          -- log actuals, track variance

Service Layer (server/services/cost-intelligence/)
  ├── engine.ts                    -- orchestration: maps scope → costs → DB write
  ├── calculator.ts                -- labor/material split, unit resolution, ranges
  ├── mapping.ts                   -- scope item → Craftsman benchmark inference
  ├── templates.ts                 -- 8 system templates, auto-seed on first use
  └── providers/
        ├── base.ts                -- abstract BaseCostProvider
        ├── craftsman.ts           -- CraftsmanLocalProvider (DB) + CraftsmanHttpProvider (scaffold)
        └── index.ts               -- registry, getActiveProvider()

Type System (lib/cost-intelligence/types.ts)
  -- CostProvider, CostItem, ScopeItem, EstimateAssembly,
     EstimateLineItem, EstimateTemplate, BenchmarkRecord, MappingResult
```

---

## Database Tables

| Table | Purpose |
|---|---|
| `rehab_cost_benchmarks` | 57 Craftsman NCE reference costs (source of truth) |
| `cost_estimates` | Estimate header: deal FK, property type, region, config |
| `cost_estimate_scope_items` | Scope items attached to an estimate |
| `cost_estimate_line_items` | Computed line items with labor/material breakdown |
| `cost_estimate_versions` | Snapshot of each re-generation (auditable history) |
| `cost_estimate_templates` | 8 system templates + custom user templates |
| `cost_estimate_benchmarks` | Bid vs. actual variance tracking (post-project) |
| `regional_cost_modifiers` | 14 metro-level factors (e.g. Atlanta 0.90x, NYC 1.30x) |

---

## Valid Region Codes

| Code | Market | Overall Factor |
|---|---|---|
| `SOUTH_ATL` | Atlanta Metro | 0.90x |
| `SOUTH_CLT` | Charlotte Metro | 0.88x |
| `SOUTH_HOU` | Houston Metro | 0.88x |
| `SOUTH_DAL` | Dallas-Fort Worth | 0.90x |
| `SOUTH_PHX` | Phoenix Metro | 0.92x |
| `MID_CHI` | Chicago Metro | 1.05x |
| `MID_DET` | Detroit Metro | 0.95x |
| `NE_NYC` | New York City | 1.30x |
| `NE_PHI` | Philadelphia | 1.12x |
| `NE_BOS` | Boston Metro | 1.18x |
| `WEST_LA` | Los Angeles | 1.20x |
| `WEST_SF` | San Francisco Bay | 1.25x |
| `WEST_SEA` | Seattle Metro | 1.10x |
| `NATIONAL` | National Average | 1.00x |

> **Important**: The `region_code` column in `cost_estimates` has a FK constraint to `regional_cost_modifiers.region_code`. Only the codes above are valid.

---

## Provider Abstraction

The engine uses a provider pattern for future extensibility:

- **`CraftsmanLocalProvider`** (active): Reads from `rehab_cost_benchmarks` PostgreSQL table. Always available.
- **`CraftsmanHttpProvider`** (scaffold): Uses Craftsman API when `CRAFTSMAN_API_KEY` + `CRAFTSMAN_API_BASE_URL` env vars are set. Falls back to local if not configured.

`getActiveProvider()` auto-selects HTTP if configured, falls back to local.

---

## System Templates (8 built-in)

| Slug | Name | Property Type | Scope Items |
|---|---|---|---|
| `light-cosmetic` | Light Cosmetic Rehab | Both | 5 |
| `unit-turn` | Unit Turn | Multifamily | 4 |
| `medium-value-add` | Medium Value-Add Rehab | Both | 7 |
| `heavy-gut` | Heavy Gut Rehab | Both | 9 |
| `kitchen-renovation` | Kitchen Renovation | Both | 3 |
| `bathroom-renovation` | Bathroom Renovation | Both | 2 |
| `exterior-refresh` | Exterior Refresh | Both | 3 |
| `full-systems-mf` | Full Systems Replacement (MF) | Multifamily | 5 |

Templates are auto-seeded on first `/api/cost-intelligence/templates` call.

---

## Estimate Generation Flow

```
1. Create estimate (POST /api/cost-intelligence/estimates)
   → Establishes header: property type, region, units, contingency%, soft cost%

2. Add scope items (POST /api/cost-intelligence/estimates/:id/scope)
   → Each item auto-maps to a Craftsman benchmark via:
     a. System key inference (synonym lookup on item name + trade)
     b. Condition level inference (keyword match on scope notes)
     c. Fallback: keyword search on item name

3. Generate (POST /api/cost-intelligence/estimates/:id/generate)
   → Engine loops scope items:
       a. Calls mapping.ts to get matched CostItem
       b. Calls calculator.ts to compute line total
       c. Applies regional factor from regional_cost_modifiers
       d. Applies waste factor (5-10%) and contingency
   → Adds system contingency line (default 10% of hard costs)
   → Adds soft cost line (default 5%: permits, financing, inspections)
   → Writes all line items to DB in one transaction
   → Saves version snapshot
   → Returns EstimateAssembly with full breakdown

4. Review output
   → Grand total, per-unit, per-sqft, confidence score
   → Rehab/ARV ratio (flags >35% as high-risk)
   → Trade breakdown chart
   → Confidence badge per line (color-coded: green ≥80%, yellow ≥60%, red <60%)
```

---

## Confidence Scoring

Confidence is computed per line item based on mapping quality:

| Mapping Method | Confidence |
|---|---|
| Exact system + condition match | 88% |
| System match, assumed condition | 65% |
| Keyword search fallback | 45% |
| No match (unmapped) | 0% |

Overall estimate confidence = weighted average of mapped item confidence × completeness ratio.

---

## Benchmark Variance Tracking

After a project completes, use the benchmarks API to log actuals:

```
POST /api/cost-intelligence/benchmarks
{
  "estimateId": "...",
  "providerEstimate": 44575,
  "contractorBid": 46000,
  "actualCost": 47200,
  "projectStatus": "completed",
  "geography": "Atlanta, GA"
}
```

The system auto-computes variance percentages. Over time this builds a validated accuracy dataset for the Southeast/South-Central markets.

---

## Deal Workspace Integration

The Cost Intelligence tab appears in the deal workspace at `/deal-intelligence/deal/:id` as the **"Cost Intelligence"** tab (between Field Intelligence and Outcomes).

Props passed from deal workspace:
- `dealId` — links estimate to the deal record
- `propertyId` — links estimate to the property record
- `arvEstimate` — pre-filled from deal assumptions for Rehab/ARV calculation

---

## Known Constraints

- `mapped_provider` in `cost_estimate_scope_items` is `varchar(40)`. Source value is truncated to 40 chars on write.
- `provider` in `cost_estimate_line_items` is `varchar(40)`. Same truncation applied.
- `region_code` FK must be a valid code from `regional_cost_modifiers`. The UI enforces this via a hard-coded dropdown list.
- No authentication guard on cost intelligence APIs (same pattern as other deal intelligence APIs). Add SIWE guard if needed for tenant isolation.

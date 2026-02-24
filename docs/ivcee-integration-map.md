# IVCEE Integration Map

## Schema
- Tables created via `instrumentation.ts` (CREATE TABLE IF NOT EXISTS)
- 6 IVCEE tables: `ivcee_probability_models`, `ivcee_sensitivity_matrix`, `ivcee_stress_tests`, `ivcee_refinance_risk`, `ivcee_downside_metrics`, `ivcee_capital_efficiency`
- 1 saved analysis table: `re_saved_analysis`
- All tables use UUID primary keys, `deal_id` FK, `scenario_id`, and `created_at` indexes

## Compute Engine
- `lib/ivcee/models.ts` - Pure deterministic math functions (no DB, no side effects)
- Exports: `sigmoid`, `normalize`, `clamp`, `computeProbabilityModel`, `computeSensitivityMatrix`, `computeStressTests`, `computeRefinanceRisk`, `computeDownsideMetrics`, `computeCapitalEfficiency`, `computeAll`

## Adapter
- `lib/ivcee/adapter.ts` - Loads underwriting data from `re_deal_assumptions` + `re_deal_metrics` via raw SQL
- Converts percentage fields (stored as whole numbers in DB) to decimal fractions
- Exports: `loadIVCEEInput`, `getDefaultScenarioId`

## Persistence
- `lib/ivcee/persist.ts` - Raw SQL upsert/insert for all 6 tables
- Exports: `upsertProbabilityModel`, `insertSensitivityRows`, `insertStressRows`, `upsertRefinanceRisk`, `upsertDownsideMetrics`, `upsertCapitalEfficiency`, `recomputeCapitalRanks`

## API Routes (Pages Router)
- `pages/api/ivcee/run-all.ts` - Orchestration endpoint (runs all 6 modules)
- `pages/api/ivcee/probability.ts`
- `pages/api/ivcee/sensitivity.ts`
- `pages/api/ivcee/stress-test.ts`
- `pages/api/ivcee/refinance-risk.ts`
- `pages/api/ivcee/downside.ts`
- `pages/api/ivcee/capital-efficiency.ts`
- `pages/api/real-estate/deals/[id]/saved-analysis.ts` - Save/load AI Advisory results

## UI
- `components/deal-intelligence/IVCEEPanel.tsx` - Self-contained IVCEE panel component
- Integrated into `pages/deal-intelligence/deal/[id].tsx` as new IVCEE tab
- Save/Load buttons added to Acquisition Advisory tab

## Tests
- `lib/ivcee/models.test.ts` - 30 deterministic math tests (vitest)

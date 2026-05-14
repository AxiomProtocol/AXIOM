-- Migration 0008: Add POLYGON to cap_settlement_type enum
--
-- Adds the POLYGON value to the cap_settlement_type Postgres enum,
-- enabling the Polygon capinfra settlement adapter to be registered
-- and used without a schema conflict.
--
-- Idempotent: IF NOT EXISTS prevents errors on repeated runs.
-- Safe: no existing rows are modified; existing enum values are preserved.
-- Polygon adapter defaults to DRY_RUN mode — no live behavior is activated
-- by this migration alone.
--
-- Related:
--   shared/capInfraSchema.ts   — capSettlementTypeEnum TypeScript definition
--   lib/capinfra/adapters/polygon/  — Polygon adapter (Phase 4)
--   CHAIN_POLYGON_ENABLED       — must be 'true' for non-DRY_RUN behavior
--   POLYGON_ADAPTER_MODE        — must be 'LIVE' for live dispatch (Phase 4+)

ALTER TYPE cap_settlement_type ADD VALUE IF NOT EXISTS 'POLYGON';

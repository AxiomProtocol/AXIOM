-- Migration: Add AVALANCHE to cap_settlement_type enum
-- Task #483 — Fuji assets now use settlementType='AVALANCHE' for explicit routing
-- to the AVALANCHE capinfra adapter instead of the shared EVM adapter.
--
-- ALTER TYPE … ADD VALUE is a DDL statement that cannot run inside a transaction
-- block in older Postgres versions, but is safe with IF NOT EXISTS in Postgres 9.6+.
-- Drizzle runs each migration file in its own session; this is fine.

ALTER TYPE "cap_settlement_type" ADD VALUE IF NOT EXISTS 'AVALANCHE';

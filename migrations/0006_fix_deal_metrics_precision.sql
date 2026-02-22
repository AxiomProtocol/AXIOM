-- Fix DECIMAL precision mismatch in re_deal_metrics
-- Migration: 0006_fix_deal_metrics_precision.sql
-- Date: 2026-02-22
-- Description: Widens DECIMAL(6,4) columns to DECIMAL(8,4) so they match the
--              Drizzle schema (realEstateSchema.ts) and can store computed
--              percentages >= 100 (e.g. rehab_roi, cash_on_cash, cap_rate).
--              The original migration 0004 used DECIMAL(6,4) which only allows
--              values up to 99.9999, causing numeric overflow on profitable deals.

ALTER TABLE re_deal_metrics
  ALTER COLUMN cap_rate     TYPE DECIMAL(8, 4),
  ALTER COLUMN cash_on_cash TYPE DECIMAL(8, 4),
  ALTER COLUMN dscr         TYPE DECIMAL(8, 4),
  ALTER COLUMN irr          TYPE DECIMAL(8, 4),
  ALTER COLUMN rehab_roi    TYPE DECIMAL(8, 4),
  ALTER COLUMN rent_to_value TYPE DECIMAL(8, 4);

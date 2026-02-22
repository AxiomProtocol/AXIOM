-- Real Estate Module: Widen narrow DECIMAL columns in re_deal_metrics
-- Migration: 0006_fix_deal_metrics_precision.sql
-- Date: 2026-02-22
-- DECIMAL(6,4) only allows values up to 99.9999, which overflows for
-- percentage metrics like cash-on-cash (can exceed 100%) and large DSCR
-- values.  Widening to DECIMAL(10,4) supports up to 999999.9999 which
-- is sufficient for any realistic financial metric.

ALTER TABLE re_deal_metrics
  ALTER COLUMN cap_rate      TYPE DECIMAL(10, 4),
  ALTER COLUMN cash_on_cash  TYPE DECIMAL(10, 4),
  ALTER COLUMN dscr          TYPE DECIMAL(10, 4),
  ALTER COLUMN irr           TYPE DECIMAL(10, 4),
  ALTER COLUMN rehab_roi     TYPE DECIMAL(10, 4),
  ALTER COLUMN rent_to_value TYPE DECIMAL(10, 4);

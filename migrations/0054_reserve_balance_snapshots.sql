-- Migration: 0054_reserve_balance_snapshots
-- Stores hourly reserve balance snapshots for 7-day trend charts.
-- Unique on (symbol, snapshot_hour) — cron uses ON CONFLICT DO NOTHING.

CREATE TABLE IF NOT EXISTS reserve_balance_snapshots (
  id            UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  symbol        VARCHAR(20) NOT NULL,
  balance       DECIMAL(36, 18) NOT NULL,
  usd_value     DECIMAL(28, 8),
  snapshot_hour TIMESTAMPTZ NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS rbs_symbol_hour_idx
  ON reserve_balance_snapshots (symbol, snapshot_hour);

CREATE INDEX IF NOT EXISTS rbs_symbol_time_idx
  ON reserve_balance_snapshots (symbol, snapshot_hour DESC);

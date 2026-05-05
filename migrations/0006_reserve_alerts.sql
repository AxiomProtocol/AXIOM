-- Migration: 0006_reserve_alerts
-- Creates the reserve_alerts deduplication table for the automatic
-- reserve balance alert runner (/api/cron/reserve-alerts).

CREATE TABLE IF NOT EXISTS reserve_alerts (
  id                      VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_key               VARCHAR(100) NOT NULL,
  condition_active        BOOLEAN NOT NULL DEFAULT FALSE,
  last_sent_at            TIMESTAMPTZ,
  condition_first_seen_at TIMESTAMPTZ,
  condition_cleared_at    TIMESTAMPTZ,
  last_value_snapshot     TEXT,
  channels_paged          TEXT,
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT ra_alert_key_uniq UNIQUE (alert_key)
);

CREATE INDEX IF NOT EXISTS ra_active_idx ON reserve_alerts (condition_active);

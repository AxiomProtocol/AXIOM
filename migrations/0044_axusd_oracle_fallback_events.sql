-- Migration: AXUSD Oracle Fallback Event Persistence (Task #105)
-- Creates the axusd_oracle_fallback_events table so that every static-parity
-- fallback is stored durably in Postgres, surviving server restarts and
-- allowing time-windowed metrics queries (1h / 24h / 7d).

CREATE TABLE IF NOT EXISTS axusd_oracle_fallback_events (
  id           SERIAL PRIMARY KEY,
  occurred_at  TIMESTAMP NOT NULL DEFAULT NOW(),
  caller       VARCHAR(255) NOT NULL,
  loan_id      VARCHAR(255),
  principal_usd DECIMAL(28, 8),
  reason       TEXT
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS axusd_oracle_fallback_occurred_at_idx
  ON axusd_oracle_fallback_events (occurred_at);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS axusd_oracle_fallback_caller_idx
  ON axusd_oracle_fallback_events (caller);

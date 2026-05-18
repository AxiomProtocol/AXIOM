-- Migration 0008: harvest_cron_runs
-- Records every scheduled harvest cron execution (success / skipped / error)
-- for operator visibility on the treasury vault dashboard.

CREATE TABLE IF NOT EXISTS harvest_cron_runs (
  id            serial       PRIMARY KEY,
  started_at    timestamptz  NOT NULL,
  completed_at  timestamptz  NOT NULL,
  status        varchar(20)  NOT NULL,           -- 'success' | 'skipped' | 'error'
  yield_usdc    numeric(18, 6) NOT NULL DEFAULT 0,
  tx_hash       varchar(66),
  error_message text,
  duration_ms   integer
);

CREATE INDEX IF NOT EXISTS harvest_cron_runs_started_at_idx ON harvest_cron_runs (started_at DESC);
CREATE INDEX IF NOT EXISTS harvest_cron_runs_status_idx     ON harvest_cron_runs (status);

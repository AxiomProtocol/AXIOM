-- Migration: Oracle Fallback Prune History (Task #126)
-- Creates a small audit table that records every pruning run so operators
-- can see when old oracle-fallback data was last cleaned up and how many
-- rows were removed.

CREATE TABLE IF NOT EXISTS oracle_fallback_prune_history (
  id              BIGSERIAL   PRIMARY KEY,
  pruned_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_count   BIGINT      NOT NULL,
  retention_days  INT         NOT NULL,
  triggered_by    TEXT        NOT NULL DEFAULT 'pg_cron'
);

COMMENT ON TABLE oracle_fallback_prune_history IS
  'Audit log of every prune_oracle_fallback_events() run, including row counts.';
COMMENT ON COLUMN oracle_fallback_prune_history.triggered_by IS
  'http = POST /api/scheduler/prune-oracle-fallback, pg_cron = scheduled job';

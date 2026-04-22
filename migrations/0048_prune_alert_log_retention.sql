-- Migration: Prune Alert Log Retention (Task #191)
-- Adds a retention/cleanup function for the prune_alert_log table that the
-- alert-cooldown feature uses to record one row per overdue-prune alert sent.
--
-- Without periodic cleanup the table grows unboundedly (one row per alert ×
-- months/years). This migration:
--
--   1. Ensures the prune_alert_log table exists (idempotent, IF NOT EXISTS) so
--      the retention function has a target to operate on. The schema is kept
--      intentionally minimal so the cooldown feature can ALTER TABLE to add
--      columns without conflict.
--   2. Creates prune_prune_alert_log(retention_days INT DEFAULT 90) which
--      deletes rows older than the retention window and returns the row count.
--   3. Registers a daily pg_cron job (when the extension is available) so the
--      cleanup runs automatically without depending on the HTTP scheduler.
--
-- The default retention window matches the oracle-fallback events default
-- (90 days). Operators can override per-database via the GUC
-- app.prune_alert_log_retention_days, e.g.
--   ALTER DATABASE <db> SET "app.prune_alert_log_retention_days" = '30';
--
-- Cooldown semantics are preserved: getLastAlertTime() reads ORDER BY sent_at
-- DESC LIMIT 1, which is unaffected by deleting older rows.

CREATE TABLE IF NOT EXISTS prune_alert_log (
  id            BIGSERIAL    PRIMARY KEY,
  sent_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  alert_status  TEXT         NOT NULL DEFAULT 'stale',
  channels      TEXT[]       NOT NULL DEFAULT '{}'::TEXT[]
);

COMMENT ON TABLE prune_alert_log IS
  'One row per overdue-prune alert dispatch. Pruned by prune_prune_alert_log(). '
  'Schema is intentionally minimal — the alert-cooldown feature is expected to '
  'ALTER TABLE to add columns (e.g., dedupe keys) when it lands. Reconcile this '
  'definition with that migration to avoid schema drift.';

CREATE INDEX IF NOT EXISTS prune_alert_log_sent_at_desc_idx
  ON prune_alert_log (sent_at DESC);

CREATE OR REPLACE FUNCTION prune_prune_alert_log(retention_days INT DEFAULT 90)
RETURNS TABLE(deleted_count BIGINT) AS $$
DECLARE
  v_deleted BIGINT;
  v_window  INT;
BEGIN
  -- Guardrail: clamp non-positive or NULL retention windows to 1 day so a
  -- misconfigured GUC or direct SQL invocation can never wipe the entire
  -- table. App-level callers already validate via getPruneAlertLogRetentionDays
  -- but the DB function defends in depth.
  v_window := COALESCE(retention_days, 90);
  IF v_window < 1 THEN
    v_window := 1;
  END IF;

  DELETE FROM prune_alert_log
  WHERE sent_at < NOW() - (v_window || ' days')::INTERVAL;
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN QUERY SELECT v_deleted;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION prune_prune_alert_log(INT) IS
  'Deletes prune_alert_log rows older than retention_days (default 90). '
  'Invoked by the /api/scheduler/prune-overdue-alert endpoint and a daily '
  'pg_cron job (when the extension is installed).';

-- Attempt to register a daily pg_cron job. Non-fatal if pg_cron is unavailable
-- (mirrors the pattern used in 0045_oracle_fallback_pruning.sql).
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_available_extensions WHERE name = 'pg_cron'
  ) THEN
    CREATE EXTENSION IF NOT EXISTS pg_cron;

    DELETE FROM cron.job WHERE jobname = 'prune_prune_alert_log';

    -- Run every day at 02:30 UTC, 30 minutes after the oracle-fallback prune
    -- to avoid contending for the same maintenance window.
    PERFORM cron.schedule(
      'prune_prune_alert_log',
      '30 2 * * *',
      $cron$SELECT prune_prune_alert_log(
          COALESCE(
            NULLIF(current_setting('app.prune_alert_log_retention_days', true), ''),
            '90'
          )::INT
        )$cron$
    );
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'pg_cron setup skipped (non-fatal): %', SQLERRM;
END;
$$;

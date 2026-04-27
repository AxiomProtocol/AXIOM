-- Migration: Prune Alert Log Cleanup History (Task #206)
-- Adds an audit table that records every invocation of prune_prune_alert_log()
-- so the admin dashboard can show how big the prune_alert_log table currently
-- is, when the last cleanup ran, and how many rows it removed.
--
-- Without this table, only the most recent console log records the deletion
-- count, and pg_cron-triggered runs are completely invisible to operators.
--
-- Mirrors the pattern used in 0047_oracle_fallback_prune_history_logging.sql:
--   - The cleanup function gains a triggered_by parameter (default 'pg_cron')
--   - Each invocation INSERTs one row into the new history table
--   - The pg_cron schedule is recreated to call the new signature

CREATE TABLE IF NOT EXISTS prune_alert_log_cleanup_history (
  id              BIGSERIAL    PRIMARY KEY,
  ran_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  deleted_count   BIGINT       NOT NULL DEFAULT 0,
  retention_days  INT          NOT NULL,
  triggered_by    TEXT         NOT NULL DEFAULT 'pg_cron'
);
--> statement-breakpoint
COMMENT ON TABLE prune_alert_log_cleanup_history IS
  'One row per prune_prune_alert_log() invocation. Surfaces the cleanup '
  'cadence and impact in the admin dashboard so operators can verify that '
  'the prune_alert_log table is actually being trimmed.';
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS prune_alert_log_cleanup_history_ran_at_desc_idx
  ON prune_alert_log_cleanup_history (ran_at DESC);
--> statement-breakpoint
CREATE OR REPLACE FUNCTION prune_prune_alert_log(
  retention_days INT  DEFAULT 90,
  triggered_by   TEXT DEFAULT 'pg_cron'
)
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

  INSERT INTO prune_alert_log_cleanup_history
    (deleted_count, retention_days, triggered_by)
  VALUES (v_deleted, v_window, triggered_by);

  RETURN QUERY SELECT v_deleted;
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
COMMENT ON FUNCTION prune_prune_alert_log(INT, TEXT) IS
  'Deletes prune_alert_log rows older than retention_days (default 90) and '
  'records the run in prune_alert_log_cleanup_history. Invoked by the '
  '/api/scheduler/prune-overdue-alert endpoint (triggered_by=''http'') and a '
  'daily pg_cron job (triggered_by=''pg_cron'').';
--> statement-breakpoint
-- Recreate the pg_cron job so it calls the new two-arg signature explicitly.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_available_extensions WHERE name = 'pg_cron'
  ) THEN
    CREATE EXTENSION IF NOT EXISTS pg_cron;

    DELETE FROM cron.job WHERE jobname = 'prune_prune_alert_log';

    PERFORM cron.schedule(
      'prune_prune_alert_log',
      '30 2 * * *',
      $cron$SELECT prune_prune_alert_log(
          COALESCE(
            NULLIF(current_setting('app.prune_alert_log_retention_days', true), ''),
            '90'
          )::INT,
          'pg_cron'
        )$cron$
    );
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'pg_cron setup skipped (non-fatal): %', SQLERRM;
END;
$$;

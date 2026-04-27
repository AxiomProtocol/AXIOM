-- Migration: Oracle Fallback Event Pruning (Task #113)
-- Adds a reusable pruning function that deletes axusd_oracle_fallback_events
-- rows older than a configurable retention window (default 90 days).
-- The function is invoked via the /api/scheduler/prune-oracle-fallback endpoint.
-- If pg_cron is available in the database, a daily cron job is also registered.

CREATE OR REPLACE FUNCTION prune_oracle_fallback_events(retention_days INT DEFAULT 90)
RETURNS TABLE(deleted_count BIGINT) AS $$
DECLARE
  v_deleted BIGINT;
BEGIN
  DELETE FROM axusd_oracle_fallback_events
  WHERE occurred_at < NOW() - (retention_days || ' days')::INTERVAL;
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN QUERY SELECT v_deleted;
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
-- Attempt to schedule a daily pg_cron job if the extension is available.
-- This block is intentionally non-fatal: if pg_cron is not installed the
-- migration still succeeds and the HTTP endpoint serves as the sole trigger.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_available_extensions WHERE name = 'pg_cron'
  ) THEN
    CREATE EXTENSION IF NOT EXISTS pg_cron;

    -- Remove any stale job with the same name before (re-)registering.
    -- Use a direct DELETE instead of cron.unschedule() for compatibility
    -- across pg_cron versions whose function signatures differ.
    DELETE FROM cron.job WHERE jobname = 'prune_oracle_fallback_events';

    -- Run every day at 02:00 UTC.
    -- Inner dollar-quote uses a distinct tag ($cron$) to avoid conflicting
    -- with the outer dollar-quote block delimiter.
    PERFORM cron.schedule(
      'prune_oracle_fallback_events',
      '0 2 * * *',
      $cron$SELECT prune_oracle_fallback_events(
          COALESCE(
            NULLIF(current_setting('app.oracle_fallback_retention_days', true), ''),
            '90'
          )::INT
        )$cron$
    );
  END IF;
EXCEPTION WHEN OTHERS THEN
  -- Use WARNING so the failure appears in Postgres logs even with default
  -- log_min_messages settings, while still allowing the migration to finish.
  RAISE WARNING 'pg_cron setup skipped (non-fatal): %', SQLERRM;
END;
$$;

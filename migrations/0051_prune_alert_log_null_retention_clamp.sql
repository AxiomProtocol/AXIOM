-- Migration: Prune Alert Log NULL Retention Clamp (Task #233)
-- Aligns prune_prune_alert_log()'s NULL-handling behaviour with the inline
-- guardrail comment.
--
-- Migrations 0048/0049 documented the clamp as:
--   "clamps non-positive or NULL retention windows to 1 day so a
--    misconfiguration cannot wipe the entire alert table"
-- but the implementation evaluated `COALESCE(retention_days, 90)` BEFORE the
-- `< 1 → 1` clamp, so an explicit NULL silently used a 90-day window instead
-- of the 1-day floor the comment promised. Both behaviours prevent a wipe,
-- but the doc/code mismatch is confusing — an operator who sets the GUC to
-- an empty/NULL value expecting an aggressive cleanup window would be
-- surprised by the 90-day fallback.
--
-- This migration fixes the function so NULL really does fall back to 1 day,
-- matching the comment. The two-arg signature added by 0049 is preserved
-- (retention_days INT, triggered_by TEXT) and the cleanup-history INSERT is
-- unchanged. The pg_cron schedule is left as-is — it already supplies an
-- explicit non-NULL integer via the COALESCE/NULLIF chain on the GUC.

CREATE OR REPLACE FUNCTION prune_prune_alert_log(
  retention_days INT  DEFAULT 90,
  triggered_by   TEXT DEFAULT 'pg_cron'
)
RETURNS TABLE(deleted_count BIGINT) AS $$
DECLARE
  v_deleted BIGINT;
  v_window  INT;
BEGIN
  -- Guardrail: clamp non-positive OR NULL retention windows to 1 day so a
  -- misconfigured GUC or direct SQL invocation can never wipe the entire
  -- table. App-level callers already validate via getPruneAlertLogRetentionDays
  -- but the DB function defends in depth.
  --
  -- NOTE: NULL is intentionally treated the same as a non-positive value
  -- here (1-day floor), NOT silently coerced to the 90-day default. An
  -- operator who explicitly nulls the retention setting is asking for the
  -- safest, most aggressive cleanup window the guardrail allows.
  IF retention_days IS NULL OR retention_days < 1 THEN
    v_window := 1;
  ELSE
    v_window := retention_days;
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
  'records the run in prune_alert_log_cleanup_history. NULL or non-positive '
  'retention_days values are clamped to a 1-day floor so a misconfigured GUC '
  'or direct SQL invocation cannot wipe the table. Invoked by the '
  '/api/scheduler/prune-overdue-alert endpoint (triggered_by=''http'') and a '
  'daily pg_cron job (triggered_by=''pg_cron'').';

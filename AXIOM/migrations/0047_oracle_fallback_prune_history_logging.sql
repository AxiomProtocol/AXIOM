-- Migration: Add history logging to prune_oracle_fallback_events (Task #126)
-- Replaces the pruning function with a version that also inserts an audit row
-- into oracle_fallback_prune_history after every run, regardless of whether the
-- caller is the HTTP endpoint or the pg_cron scheduled job.
--
-- The triggered_by parameter defaults to 'pg_cron' so existing cron schedules
-- need no changes. The HTTP endpoint passes 'http' explicitly.

CREATE OR REPLACE FUNCTION prune_oracle_fallback_events(
  retention_days INT DEFAULT 90,
  triggered_by   TEXT DEFAULT 'pg_cron'
)
RETURNS TABLE(deleted_count BIGINT) AS $$
DECLARE
  v_deleted BIGINT;
BEGIN
  DELETE FROM axusd_oracle_fallback_events
  WHERE occurred_at < NOW() - (retention_days || ' days')::INTERVAL;
  GET DIAGNOSTICS v_deleted = ROW_COUNT;

  INSERT INTO oracle_fallback_prune_history (deleted_count, retention_days, triggered_by)
  VALUES (v_deleted, retention_days, triggered_by);

  RETURN QUERY SELECT v_deleted;
END;
$$ LANGUAGE plpgsql;

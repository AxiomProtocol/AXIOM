-- Migration: Integrity Pager Wiring Check Runs (Task #306)
-- Persists the outcome of every scheduled `/api/scheduler/integrity-pager-wiring-check`
-- invocation so an operator can see — at a glance — whether the synthetic
-- on-call wiring check is still firing and still finding both channels
-- healthy. Without this table the only signal would be the runbook
-- owner's email inbox, which silently goes empty when the scheduler
-- itself stops calling the endpoint.
--
-- One row per run. Healthy runs are kept too so the operator can see a
-- recent green tick rather than just "no failures lately".

CREATE TABLE IF NOT EXISTS integrity_pager_wiring_check_runs (
  id                       BIGSERIAL    PRIMARY KEY,
  ran_at                   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  ok                       BOOLEAN      NOT NULL,
  expected_channels        TEXT[]       NOT NULL DEFAULT '{}'::TEXT[],
  channels_paged           TEXT[]       NOT NULL DEFAULT '{}'::TEXT[],
  pager_errors             TEXT[]       NOT NULL DEFAULT '{}'::TEXT[],
  missing_channels         TEXT[]       NOT NULL DEFAULT '{}'::TEXT[],
  owner_notified           BOOLEAN      NOT NULL DEFAULT FALSE,
  owner_notify_error       TEXT         NULL,
  owner_email_configured   BOOLEAN      NOT NULL DEFAULT FALSE,
  skipped_reason           TEXT         NULL,
  triggered_by             TEXT         NOT NULL DEFAULT 'scheduler'
);

COMMENT ON TABLE integrity_pager_wiring_check_runs IS
  'Audit log of every scheduled integrity pager wiring check. Surfaces '
  'whether the synthetic on-call paging path is still healthy between '
  'real `collateral.integrity_failed` events.';

COMMENT ON COLUMN integrity_pager_wiring_check_runs.ok IS
  'TRUE when every expected channel reported success and no pager errors '
  'were returned. FALSE when channels were missing, pager fan-out errored, '
  'or no channels were configured at all.';

COMMENT ON COLUMN integrity_pager_wiring_check_runs.expected_channels IS
  'Channels the env vars claim are configured (subset of {email,discord}).';

COMMENT ON COLUMN integrity_pager_wiring_check_runs.channels_paged IS
  'Channels the synthetic page actually reached. Should equal '
  'expected_channels on a healthy run.';

COMMENT ON COLUMN integrity_pager_wiring_check_runs.owner_notified IS
  'TRUE when the runbook-owner email (INTEGRITY_PAGER_WIRING_OWNER_EMAIL) '
  'was actually sent. Stays FALSE on healthy runs.';

CREATE INDEX IF NOT EXISTS integrity_pager_wiring_check_runs_ran_at_desc_idx
  ON integrity_pager_wiring_check_runs (ran_at DESC);

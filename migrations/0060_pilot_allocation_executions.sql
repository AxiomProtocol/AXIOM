-- Migration: 0060_pilot_allocation_executions
-- Persists every "Execute" action on the Reserves tab allocation panel.
-- One row per (document_id, scope, asset_key) — UNIQUE constraint enforces
-- idempotency so re-clicking "Execute" does not double-dispatch the same
-- rail. Receipts (Stripe charge id, Coinbase Onramp intent id, AXAU mint
-- tx hash) are stored in tx_hash / external_ref / external_url.

CREATE TABLE IF NOT EXISTS pilot_allocation_executions (
  id                UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id       UUID         NOT NULL REFERENCES pilot_settlement_extractions(document_id) ON DELETE CASCADE,
  scope             TEXT         NOT NULL CHECK (scope IN ('driver','treasury')),
  asset_key         TEXT         NOT NULL,
  rail              TEXT         NOT NULL,
  weight_pct        NUMERIC      NOT NULL,
  usd_amount        NUMERIC      NOT NULL,
  status            TEXT         NOT NULL CHECK (status IN ('executed','queued','failed','skipped')),
  tx_hash           TEXT,
  external_ref      TEXT,
  external_url      TEXT,
  note              TEXT,
  weights_snapshot  JSONB,
  rationale         TEXT,
  scope_amount      NUMERIC,
  executed_at       TIMESTAMP    NOT NULL DEFAULT NOW(),
  executed_by       TEXT,
  UNIQUE (document_id, scope, asset_key)
);

CREATE INDEX IF NOT EXISTS pae_doc_idx
  ON pilot_allocation_executions (document_id);

CREATE INDEX IF NOT EXISTS pae_doc_scope_idx
  ON pilot_allocation_executions (document_id, scope);

CREATE INDEX IF NOT EXISTS pae_executed_at_idx
  ON pilot_allocation_executions (executed_at DESC);

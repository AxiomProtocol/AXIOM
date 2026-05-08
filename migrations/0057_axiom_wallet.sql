-- Migration: 0057_axiom_wallet
-- Internal wallet / stored-balance layer for Axiom Protocol.
-- user_id is TEXT (not UUID FK) so it can hold Auth0 sub IDs, wallet
-- addresses, or the sentinel value 'operator_founder' used by the
-- founder-ops Reserves tab in Phase 1.

CREATE TABLE IF NOT EXISTS axiom_wallet_balances (
  user_id               TEXT PRIMARY KEY,
  available_cents       BIGINT NOT NULL DEFAULT 0 CHECK (available_cents >= 0),
  pending_cents         BIGINT NOT NULL DEFAULT 0 CHECK (pending_cents >= 0),
  lifetime_deposited_cents BIGINT NOT NULL DEFAULT 0,
  lifetime_allocated_cents BIGINT NOT NULL DEFAULT 0,
  created_at            TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS axiom_wallet_transactions (
  id                    TEXT PRIMARY KEY,
  user_id               TEXT NOT NULL REFERENCES axiom_wallet_balances(user_id) ON DELETE CASCADE,
  type                  TEXT NOT NULL CHECK (type IN (
                          'TOP_UP','HOLD','HOLD_RELEASE','DEBIT',
                          'FEE','REFUND','REVERSAL','DISPUTE_FREEZE')),
  amount_cents          BIGINT NOT NULL CHECK (amount_cents > 0),
  direction             TEXT NOT NULL CHECK (direction IN ('CREDIT','DEBIT')),
  balance_after_cents   BIGINT NOT NULL,
  status                TEXT NOT NULL DEFAULT 'PENDING'
                          CHECK (status IN ('PENDING','SETTLED','FAILED','REVERSED')),
  reference_type        TEXT,
  reference_id          TEXT,
  allocation_asset      TEXT,
  notes                 TEXT,
  idempotency_key       TEXT UNIQUE,
  created_at            TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_axiom_wallet_txn_user
  ON axiom_wallet_transactions(user_id, created_at DESC);

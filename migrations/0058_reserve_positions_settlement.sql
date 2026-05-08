-- Migration: 0058_reserve_positions_settlement
-- Adds settlement tracking columns to reserve_positions so every auto-executed
-- allocation row carries a verifiable on-chain or custody reference.
--
-- settlement_status values:
--   confirmed          — on-chain tx confirmed (AXAU mint, AXUSD mint)
--   pending_custody    — custody instruction queued in BitGo; awaiting operator funding
--   treasury_hold      — internal protocol hold (AXM, AXUSD earmark); no on-chain tx needed
--   queued_no_buffer   — AXAU mint deferred: deployer PAXG buffer insufficient
--   queued_oracle_stale — AXAU/AXUSD mint deferred: Chainlink XAU/USD oracle is stale
--   queued_no_custody  — BitGo not configured; custody instruction pending manual setup
--   failed             — attempt made but failed; see settlement_note for reason

ALTER TABLE reserve_positions
  ADD COLUMN IF NOT EXISTS tx_hash          VARCHAR(66),
  ADD COLUMN IF NOT EXISTS settlement_status VARCHAR(50),
  ADD COLUMN IF NOT EXISTS settlement_ref   VARCHAR(300),
  ADD COLUMN IF NOT EXISTS settlement_note  TEXT;

CREATE INDEX IF NOT EXISTS rp_settlement_status_idx ON reserve_positions(settlement_status);
CREATE INDEX IF NOT EXISTS rp_tx_hash_idx           ON reserve_positions(tx_hash) WHERE tx_hash IS NOT NULL;

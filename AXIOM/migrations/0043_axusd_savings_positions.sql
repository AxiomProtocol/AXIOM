-- Migration: AXUSD Yield Savings Account
-- Creates the savings_positions table for tracking on-chain vault positions,
-- deposit/withdraw history, and accrued yield per wallet address.

CREATE TABLE IF NOT EXISTS savings_positions (
  id SERIAL PRIMARY KEY,
  wallet_address VARCHAR(42) NOT NULL,
  deposit_amount_axusd DECIMAL(36, 18) NOT NULL DEFAULT '0',
  current_balance_axusd DECIMAL(36, 18) NOT NULL DEFAULT '0',
  yield_earned_axusd DECIMAL(36, 18) NOT NULL DEFAULT '0',
  vault_shares DECIMAL(36, 18) NOT NULL DEFAULT '0',
  tx_hash VARCHAR(66),
  operation VARCHAR(20) NOT NULL DEFAULT 'deposit',
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  last_updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS savings_positions_wallet_idx ON savings_positions (wallet_address);
CREATE INDEX IF NOT EXISTS savings_positions_created_at_idx ON savings_positions (created_at);
CREATE INDEX IF NOT EXISTS savings_positions_tx_hash_idx ON savings_positions (tx_hash) WHERE tx_hash IS NOT NULL;

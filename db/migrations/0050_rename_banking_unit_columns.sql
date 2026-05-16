-- Migration: rename Unit Finance-specific column names to provider-neutral names
-- Reason: Unit Finance account cancelled 2026-04-28; removing provider-specific identifiers
-- These are NON-DESTRUCTIVE renames only — data is preserved

-- banking_customers: unit_customer_id → banking_customer_id
ALTER TABLE banking_customers RENAME COLUMN unit_customer_id TO banking_customer_id;

-- banking_accounts: unit_account_id → banking_account_id
ALTER TABLE banking_accounts RENAME COLUMN unit_account_id TO banking_account_id;

-- syn_capital_calls: unit_payment_id → banking_payment_id
ALTER TABLE syn_capital_calls RENAME COLUMN unit_payment_id TO banking_payment_id;

-- cap_card_deposits: increase_transfer_id → banking_transfer_id
ALTER TABLE cap_card_deposits RENAME COLUMN increase_transfer_id TO banking_transfer_id;

-- bridge_transfers: unit_account_id → banking_account_id
ALTER TABLE bridge_transfers RENAME COLUMN unit_account_id TO banking_account_id;

-- Migration: Rename swf_token_balance to axm_token_balance
-- Date: November 23, 2025
-- Purpose: Update database schema from SWF (Sovran Wealth Fund) to AXM (Axiom Protocol Token)

-- Step 1: Add new axm_token_balance column (allows zero downtime)
ALTER TABLE users ADD COLUMN IF NOT EXISTS axm_token_balance DECIMAL(18, 8) DEFAULT 0;

-- Step 2: Backfill data from old column to new column
UPDATE users SET axm_token_balance = swf_token_balance WHERE swf_token_balance IS NOT NULL;

-- Step 3: Drop old swf_token_balance column (after verifying backfill)
-- Uncomment this line after confirming data migration is successful
-- ALTER TABLE users DROP COLUMN IF EXISTS swf_token_balance;

-- Verification Query (run this to check migration success):
-- SELECT COUNT(*) FROM users WHERE swf_token_balance != axm_token_balance;

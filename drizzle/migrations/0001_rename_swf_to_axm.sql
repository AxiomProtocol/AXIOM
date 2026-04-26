-- Migration: Rename swf_token_balance to axm_token_balance
-- Date: November 23, 2025
-- Purpose: Update database schema from SWF (Sovran Wealth Fund) to AXM (Axiom Protocol Token)
--
-- Idempotency: This migration is safe to re-run on any database, including
-- local dev databases that never had the legacy `swf_token_balance` column
-- and fresh databases that already use `axm_token_balance`. The DO block
-- guards the backfill on the actual presence of the source column instead of
-- assuming the legacy schema.

-- Step 1: Add new axm_token_balance column (allows zero downtime)
ALTER TABLE users ADD COLUMN IF NOT EXISTS axm_token_balance DECIMAL(18, 8) DEFAULT 0;

-- Step 2: Backfill data from old column to new column, but only if the
-- legacy `swf_token_balance` column still exists. On a fresh install or any
-- database where the legacy column was never created (or has already been
-- dropped), this block is a no-op.
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
          FROM information_schema.columns
         WHERE table_schema = 'public'
           AND table_name   = 'users'
           AND column_name  = 'swf_token_balance'
    ) THEN
        EXECUTE
          'UPDATE users '
          '   SET axm_token_balance = swf_token_balance '
          ' WHERE swf_token_balance IS NOT NULL';
    END IF;
END $$;

-- Step 3: Drop old swf_token_balance column (after verifying backfill)
-- Uncomment this line after confirming data migration is successful
-- ALTER TABLE users DROP COLUMN IF EXISTS swf_token_balance;

-- Verification Query (run this to check migration success):
-- SELECT COUNT(*) FROM users WHERE swf_token_balance != axm_token_balance;

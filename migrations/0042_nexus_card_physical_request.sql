-- Migration: 0042_nexus_card_physical_request
-- Purpose: Add physical_card_requested boolean flag to increase_participants for Task #82
--          Axiom Nexus Debit Card consumer product
-- Date: 2026-04-11
-- Note: Wrapped in existence check — increase_participants is no longer provisioned
--       in fresh environments where Increase integration is inactive.

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'increase_participants'
  ) THEN
    ALTER TABLE "increase_participants"
      ADD COLUMN IF NOT EXISTS "physical_card_requested" boolean NOT NULL DEFAULT false,
      ADD COLUMN IF NOT EXISTS "physical_card_requested_at" timestamp;
  END IF;
END $$;

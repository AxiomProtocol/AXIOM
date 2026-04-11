-- Migration: 0042_nexus_card_physical_request
-- Purpose: Add physical_card_requested boolean flag to increase_participants for Task #82
--          Axiom Nexus Debit Card consumer product
-- Date: 2026-04-11

ALTER TABLE "increase_participants"
  ADD COLUMN IF NOT EXISTS "physical_card_requested" boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "physical_card_requested_at" timestamp;

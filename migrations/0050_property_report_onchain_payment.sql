-- Task #230: Move Property Analysis report payments off Stripe.
-- Adds on-chain payment tracking columns to property_reports.
-- The legacy stripe_session_id / stripe_payment_intent_id columns are kept
-- for historical records but are no longer written by the app.

ALTER TABLE "property_reports"
  ADD COLUMN IF NOT EXISTS "payment_tx_hash"      varchar(80),
  ADD COLUMN IF NOT EXISTS "payment_chain_id"     integer,
  ADD COLUMN IF NOT EXISTS "payment_token"        varchar(42),
  ADD COLUMN IF NOT EXISTS "payment_from_address" varchar(42),
  ADD COLUMN IF NOT EXISTS "payment_to_address"   varchar(42),
  ADD COLUMN IF NOT EXISTS "payment_confirmed_at" timestamp;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "prop_report_tx_uq"
  ON "property_reports" ("payment_tx_hash")
  WHERE "payment_tx_hash" IS NOT NULL;

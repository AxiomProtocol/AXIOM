-- Migration: Ensure GIN trigram index on cap_identity_profiles.legal_name
-- Idempotent re-application of 0004_legal_name_trgm_index.sql.
-- Reason: On CI test databases the 0004 migration was recorded as applied when
-- cap_identity_profiles did not yet exist (the table is provisioned via
-- drizzle-kit push, not via a Drizzle-generated migration). The IF EXISTS guard
-- in 0004 skipped the CREATE INDEX, leaving the index absent on those databases.
-- This migration re-applies the same CREATE INDEX IF NOT EXISTS unconditionally
-- so the index is guaranteed to exist regardless of the 0004 history.

CREATE EXTENSION IF NOT EXISTS pg_trgm;

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'cap_identity_profiles'
  ) THEN
    CREATE INDEX IF NOT EXISTS cap_identity_profiles_legal_name_trgm_idx
      ON cap_identity_profiles
      USING gin (legal_name gin_trgm_ops);
  END IF;
END $$;

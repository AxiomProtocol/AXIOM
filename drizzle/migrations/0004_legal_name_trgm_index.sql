-- Migration: Add pg_trgm GIN index on cap_identity_profiles.legal_name
-- Purpose: Speed up ilike / trigram searches used by the user search
--          type-ahead picker. Without this index Postgres performs a full
--          sequential scan of the table on every keystroke.
-- Note: Wrapped in existence check — cap_identity_profiles may not exist on
--       fresh environments where the capinfra schema has not yet been pushed.

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

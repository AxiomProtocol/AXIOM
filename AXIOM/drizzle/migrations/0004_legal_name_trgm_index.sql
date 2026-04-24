-- Migration: Add pg_trgm GIN index on cap_identity_profiles.legal_name
-- Purpose: Speed up ilike / trigram searches used by the user search
--          type-ahead picker. Without this index Postgres performs a full
--          sequential scan of the table on every keystroke.

CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS cap_identity_profiles_legal_name_trgm_idx
  ON cap_identity_profiles
  USING gin (legal_name gin_trgm_ops);

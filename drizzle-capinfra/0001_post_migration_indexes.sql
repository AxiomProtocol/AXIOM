-- Post-migration indexes not captured in drizzle-kit generated SQL.
-- Applied by capinfra-migrate.ts immediately after 0000_slim_tattoo.sql.

CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS cap_identity_profiles_legal_name_trgm_idx
  ON cap_identity_profiles
  USING gin (legal_name gin_trgm_ops);

/**
 * tests/cap-identity-profiles-trgm-index.test.ts
 *
 * Performance smoke test for the GIN trigram index on
 * cap_identity_profiles.legal_name (drizzle/migrations/0004_legal_name_trgm_index.sql).
 *
 * Why this exists:
 *   The user-search type-ahead picker on the Cap-Infra operator console runs
 *   `ilike '%foo%'` queries against cap_identity_profiles.legal_name. Without
 *   the trigram GIN index those queries become full sequential scans and the
 *   picker visibly lags. A future schema change, an accidental DROP INDEX, or
 *   an environment that forgot to install the pg_trgm extension would silently
 *   regress this. This test catches all three failure modes.
 *
 * What it asserts (against a real Postgres database):
 *   1. The pg_trgm extension is installed
 *   2. The index `cap_identity_profiles_legal_name_trgm_idx` exists with the
 *      expected definition (GIN + gin_trgm_ops on legal_name)
 *   3. With a non-trivial number of seeded rows and seq-scan disabled, the
 *      planner can use the trigram index to answer an `ilike` search — proving
 *      the index is wired up and usable for the picker query
 *   4. The same `ilike` search completes within a generous time budget,
 *      catching catastrophic regressions even if the planner picks a different
 *      strategy
 *
 * Skip behaviour:
 *   The integration block is skipped when DATABASE_URL is unset so the suite
 *   stays green in environments without a Postgres instance. CI sets
 *   DATABASE_URL before running this file (see .github/workflows/main.yml,
 *   step "Run user search index smoke test").
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Pool } from 'pg';
import { randomBytes } from 'crypto';

const DB_URL = process.env.DATABASE_URL;
const integrationDescribe = DB_URL ? describe : describe.skip;

const SEED_ROWS = 600;
const SEARCH_TIME_BUDGET_MS = 1_500;
const INDEX_NAME = 'cap_identity_profiles_legal_name_trgm_idx';

// A short marker baked into every seeded legal_name so we can find — and
// later delete — only the rows this test inserted. Trigram-friendly (>=3 chars).
const SEED_TAG = `trgmtest_${randomBytes(4).toString('hex')}`;
const SEARCH_PATTERN = `%${SEED_TAG.slice(0, 8)}%`;

integrationDescribe('cap_identity_profiles legal_name trigram index', () => {
  let pool: Pool;
  const insertedUserIds: string[] = [];

  beforeAll(async () => {
    pool = new Pool({
      connectionString: DB_URL,
      ssl: DB_URL?.includes('neon.tech') ? { rejectUnauthorized: false } : undefined,
      max: 4,
    });

    // Sanity-check: the table must exist (migrations applied).
    const table = await pool.query<{ exists: boolean }>(
      `SELECT EXISTS (
         SELECT 1 FROM information_schema.tables
         WHERE table_schema = 'public' AND table_name = 'cap_identity_profiles'
       ) AS exists`,
    );
    if (!table.rows[0].exists) {
      throw new Error(
        'Integration prerequisite missing: cap_identity_profiles table not found. ' +
          'Run `npm run db:migrate` before this test.',
      );
    }

    // Seed cap_users + cap_identity_profiles. Each legal_name embeds SEED_TAG
    // plus a random suffix so the column has enough distinct trigrams to make
    // the GIN index a sensible choice for the planner.
    interface SeedRow {
      userId: string;
      email: string;
      profileId: string;
      legalName: string;
    }
    const seedRows: SeedRow[] = [];
    for (let i = 0; i < SEED_ROWS; i++) {
      const userId = `usr_trgm_${randomBytes(8).toString('hex')}`;
      seedRows.push({
        userId,
        email: `${userId}@trgm.test`,
        profileId: `ip_trgm_${randomBytes(8).toString('hex')}`,
        legalName: `${SEED_TAG} ${randomBytes(6).toString('hex')} person ${i}`,
      });
      insertedUserIds.push(userId);
    }

    // Insert users first (FK target), then profiles. Chunk inserts to keep
    // each statement well under Postgres' parameter limit (65535).
    const CHUNK = 200;
    for (let i = 0; i < seedRows.length; i += CHUNK) {
      const slice = seedRows.slice(i, i + CHUNK);
      const params: unknown[] = [];
      const tuples = slice
        .map((r) => {
          const off = params.length;
          params.push(r.userId, r.email, r.email);
          return `($${off + 1}, $${off + 2}, 'NATURAL_PERSON', $${off + 3}, 'US', 'ACTIVE')`;
        })
        .join(',');
      await pool.query(
        `INSERT INTO cap_users (id, external_id, entity_type, primary_email, jurisdiction, status)
         VALUES ${tuples}`,
        params,
      );
    }
    for (let i = 0; i < seedRows.length; i += CHUNK) {
      const slice = seedRows.slice(i, i + CHUNK);
      const params: unknown[] = [];
      const tuples = slice
        .map((r) => {
          const off = params.length;
          params.push(r.profileId, r.userId, r.legalName);
          return `($${off + 1}, $${off + 2}, $${off + 3}, 'UNRESTRICTED')`;
        })
        .join(',');
      await pool.query(
        `INSERT INTO cap_identity_profiles (id, user_id, legal_name, exposure_class)
         VALUES ${tuples}`,
        params,
      );
    }

    // Refresh planner statistics so EXPLAIN reflects the new row distribution.
    await pool.query('ANALYZE cap_identity_profiles');
  }, 60_000);

  afterAll(async () => {
    if (insertedUserIds.length > 0) {
      // FK from cap_identity_profiles.user_id has ON DELETE CASCADE, so
      // deleting the seeded users wipes the matching profile rows too.
      const CHUNK = 500;
      for (let i = 0; i < insertedUserIds.length; i += CHUNK) {
        const slice = insertedUserIds.slice(i, i + CHUNK);
        await pool
          .query('DELETE FROM cap_users WHERE id = ANY($1::text[])', [slice])
          .catch(() => {});
      }
    }
    await pool.end().catch(() => {});
  }, 60_000);

  it('has the pg_trgm extension installed', async () => {
    const { rows } = await pool.query<{ extname: string }>(
      `SELECT extname FROM pg_extension WHERE extname = 'pg_trgm'`,
    );
    expect(rows.length).toBe(1);
  });

  it('has the GIN trigram index on legal_name with the expected definition', async () => {
    const { rows } = await pool.query<{ indexname: string; indexdef: string }>(
      `SELECT indexname, indexdef
         FROM pg_indexes
        WHERE schemaname = 'public'
          AND tablename = 'cap_identity_profiles'
          AND indexname = $1`,
      [INDEX_NAME],
    );
    expect(rows.length).toBe(1);
    const def = rows[0].indexdef.toLowerCase();
    expect(def).toContain('using gin');
    expect(def).toContain('legal_name');
    expect(def).toContain('gin_trgm_ops');
  });

  it('planner uses the trigram index for an ilike search on legal_name', async () => {
    const client = await pool.connect();
    try {
      // Force the planner to prefer indexed access so this assertion is
      // deterministic on small tables — the goal is to prove the index is
      // *usable*, not to second-guess the planner's cost model.
      await client.query('BEGIN');
      await client.query('SET LOCAL enable_seqscan = off');
      const explain = await client.query<{ 'QUERY PLAN': unknown[] }>(
        `EXPLAIN (FORMAT JSON)
           SELECT id FROM cap_identity_profiles
            WHERE legal_name ILIKE $1
            LIMIT 10`,
        [SEARCH_PATTERN],
      );
      await client.query('ROLLBACK');

      const planJson = JSON.stringify(explain.rows[0]['QUERY PLAN']);
      expect(
        planJson.includes(INDEX_NAME),
        `expected query plan to reference ${INDEX_NAME}, got: ${planJson}`,
      ).toBe(true);
    } finally {
      client.release();
    }
  });

  it('ilike search on legal_name completes within the time budget', async () => {
    const start = Date.now();
    const { rows } = await pool.query<{ id: string }>(
      `SELECT id FROM cap_identity_profiles
        WHERE legal_name ILIKE $1
        LIMIT 10`,
      [SEARCH_PATTERN],
    );
    const elapsed = Date.now() - start;
    expect(rows.length).toBeGreaterThan(0);
    expect(
      elapsed,
      `legal_name ilike search took ${elapsed}ms, exceeding budget of ${SEARCH_TIME_BUDGET_MS}ms`,
    ).toBeLessThan(SEARCH_TIME_BUDGET_MS);
  });
});

/**
 * Capinfra schema migration runner.
 *
 * Applies all SQL files in ./drizzle-capinfra/ to the DATABASE_URL.
 * Tracks applied migrations in `capinfra_migrations` table.
 *
 * Clean-slate strategy: if the migration has not been tracked as fully applied,
 * any partial cap_* tables/types left by a previous failed run are dropped
 * (CASCADE) before the SQL is re-applied.  This guarantees the schema matches
 * the TypeScript definition exactly, even if a prior CI run died mid-push.
 *
 * Idempotent: once a migration is recorded in `capinfra_migrations` the file
 * is skipped entirely on subsequent runs.
 *
 * Usage:  npx tsx scripts/capinfra-migrate.ts
 */
import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { Pool } from 'pg';

async function dropCapInfraSchema(pool: Pool): Promise<void> {
  const client = await pool.connect();
  try {
    // Discover all cap_* tables and drop them (CASCADE handles FK refs)
    const { rows: tables } = await client.query<{ tablename: string }>(`
      SELECT tablename
      FROM pg_tables
      WHERE schemaname = 'public' AND tablename LIKE 'cap_%'
    `);
    for (const { tablename } of tables) {
      await client.query(`DROP TABLE IF EXISTS "${tablename}" CASCADE`);
      console.log(`[capinfra-migrate] dropped table ${tablename}`);
    }

    // Discover all cap_* enum types and drop them
    const { rows: types } = await client.query<{ typname: string }>(`
      SELECT typname
      FROM pg_type
      WHERE typtype = 'e' AND typname LIKE 'cap_%'
    `);
    for (const { typname } of types) {
      await client.query(`DROP TYPE IF EXISTS "${typname}" CASCADE`);
      console.log(`[capinfra-migrate] dropped type ${typname}`);
    }
  } finally {
    client.release();
  }
}

async function main() {
  const url =
    process.env.NODE_ENV === 'test'
      ? process.env.TEST_DATABASE_URL ?? process.env.DATABASE_URL
      : process.env.DATABASE_URL;

  if (!url) {
    console.error('[capinfra-migrate] DATABASE_URL is not set.');
    process.exit(1);
  }

  const pool = new Pool({ connectionString: url });

  await pool.query(`
    CREATE TABLE IF NOT EXISTS capinfra_migrations (
      filename   text PRIMARY KEY,
      checksum   text NOT NULL,
      applied_at timestamptz NOT NULL DEFAULT now()
    )
  `);

  const { rows } = await pool.query<{ filename: string }>(
    'SELECT filename FROM capinfra_migrations',
  );
  const appliedSet = new Set(rows.map((r) => r.filename));

  const dir = path.join(process.cwd(), 'drizzle-capinfra');
  const files = fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  for (const file of files) {
    if (appliedSet.has(file)) {
      console.log(`[capinfra-migrate] ${file} already applied — skipping.`);
      continue;
    }

    const fullPath = path.join(dir, file);
    const sql = fs.readFileSync(fullPath, 'utf8');
    const checksum = crypto.createHash('sha256').update(sql).digest('hex');

    // Drop any partial cap_* tables/types left by a previous failed attempt
    // so the CREATE statements below run against a clean slate.
    console.log(`[capinfra-migrate] cleaning up partial cap_* schema before applying ${file}…`);
    await dropCapInfraSchema(pool);

    console.log(`[capinfra-migrate] applying ${file}…`);
    const statements = sql
      .split('-->statement-breakpoint')
      .map((s) => s.trim())
      .filter(Boolean);

    for (const stmt of statements) {
      const client = await pool.connect();
      try {
        await client.query(stmt);
      } catch (err: any) {
        client.release();
        await pool.end();
        console.error(
          `[capinfra-migrate] FAILED on statement:\n  ${stmt.slice(0, 200)}\n  Error (${err.code}): ${err.message}`,
        );
        process.exit(1);
      }
      client.release();
    }

    await pool.query(
      'INSERT INTO capinfra_migrations (filename, checksum) VALUES ($1, $2) ON CONFLICT (filename) DO NOTHING',
      [file, checksum],
    );

    console.log(`[capinfra-migrate] ${file} done — ${statements.length} statements applied.`);
  }

  await pool.end();
  console.log('[capinfra-migrate] All capinfra migrations applied.');
}

main().catch((err) => {
  console.error('[capinfra-migrate] fatal:', err);
  process.exit(1);
});

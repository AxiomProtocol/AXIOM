/**
 * Capinfra schema migration runner.
 *
 * Applies all SQL files in ./drizzle-capinfra/ to the DATABASE_URL.
 * Tracks applied migrations in `capinfra_migrations` table (same pattern
 * as `handwritten_migrations` used by scripts/migrate.ts).
 *
 * Idempotent: each statement is attempted individually; "already exists"
 * errors (duplicate_table 42P07, duplicate_object 42710, etc.) are silently
 * skipped so the script is safe to retry after a partial failure.
 *
 * Usage:  npx tsx scripts/capinfra-migrate.ts
 */
import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { Pool } from 'pg';

const ALREADY_EXISTS_CODES = new Set([
  '42P07', // duplicate_table
  '42710', // duplicate_object  (types, indexes, constraints)
  '42P06', // duplicate_schema
  '42P16', // invalid_table_definition (sometimes raised for duplicate index)
  '23505', // unique_violation — tolerated for tracking table inserts
]);

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
  const applied = new Set(rows.map((r) => r.filename));

  const dir = path.join(process.cwd(), 'drizzle-capinfra');
  const files = fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  for (const file of files) {
    if (applied.has(file)) {
      console.log(`[capinfra-migrate] ${file} already applied — skipping.`);
      continue;
    }

    const fullPath = path.join(dir, file);
    const sql = fs.readFileSync(fullPath, 'utf8');
    const checksum = crypto.createHash('sha256').update(sql).digest('hex');

    console.log(`[capinfra-migrate] Applying ${file}…`);
    const statements = sql
      .split('-->statement-breakpoint')
      .map((s) => s.trim())
      .filter(Boolean);

    let applied_count = 0;
    let skipped_count = 0;

    for (const stmt of statements) {
      const client = await pool.connect();
      try {
        await client.query(stmt);
        applied_count++;
      } catch (err: any) {
        if (ALREADY_EXISTS_CODES.has(err.code)) {
          skipped_count++;
        } else {
          await client.release();
          await pool.end();
          console.error(
            `[capinfra-migrate] FAILED on statement:\n  ${stmt.slice(0, 120)}\n  Error: ${err.message}`,
          );
          process.exit(1);
        }
      } finally {
        client.release();
      }
    }

    await pool.query(
      'INSERT INTO capinfra_migrations (filename, checksum) VALUES ($1, $2) ON CONFLICT (filename) DO NOTHING',
      [file, checksum],
    );

    console.log(
      `[capinfra-migrate] ${file} done (${applied_count} applied, ${skipped_count} already-existed).`,
    );
  }

  await pool.end();
  console.log('[capinfra-migrate] All capinfra migrations applied.');
}

main().catch((err) => {
  console.error('[capinfra-migrate] fatal:', err);
  process.exit(1);
});

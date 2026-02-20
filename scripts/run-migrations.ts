/**
 * Database Migration Runner
 *
 * Applies any pending SQL migration files from the migrations/ folder in
 * lexicographic order. Tracks applied migrations in a lightweight
 * `_schema_migrations` table so each file is run exactly once.
 *
 * Supports both plain SQL files and Drizzle-style files that use
 * `-->statement-breakpoint` to separate individual statements.
 *
 * Each statement is wrapped in a SAVEPOINT so that "already exists" errors
 * (e.g. duplicate table, duplicate index) are gracefully skipped instead of
 * aborting the whole migration. This allows the runner to be applied to
 * databases that were bootstrapped before the runner was introduced.
 *
 * Usage:
 *   npx tsx scripts/run-migrations.ts
 */

import fs from 'fs';
import path from 'path';
import { Pool } from 'pg';

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('ERROR: DATABASE_URL environment variable is not set');
  process.exit(1);
}

const MIGRATIONS_DIR = path.join(__dirname, '..', 'migrations');

const BOOTSTRAP_SQL = `
  CREATE TABLE IF NOT EXISTS _schema_migrations (
    filename  TEXT PRIMARY KEY,
    applied_at TIMESTAMP NOT NULL DEFAULT NOW()
  )
`;

/**
 * PostgreSQL error codes that indicate an object already exists.
 * These are safe to skip when applying migrations to a database that was
 * bootstrapped before the migration runner was introduced.
 */
const ALREADY_EXISTS_CODES = new Set([
  '42P07', // duplicate_table
  '42701', // duplicate_column
  '42710', // duplicate_object  (indexes, constraints, sequences, …)
  '42723', // duplicate_function
  '42P06', // duplicate_schema
  '23505', // unique_violation   (e.g. duplicate INSERT into tracking table)
]);

async function main() {
  const pool = new Pool({ connectionString: DATABASE_URL });

  let client;
  try {
    client = await pool.connect();
  } catch (err) {
    await pool.end();
    throw new Error(`Failed to connect to database: ${(err as Error).message}`);
  }

  try {
    // Ensure tracking table exists
    await client.query(BOOTSTRAP_SQL);

    // Fetch already-applied migrations
    const { rows } = await client.query(
      'SELECT filename FROM _schema_migrations ORDER BY filename'
    );
    const applied = new Set<string>(rows.map((r: { filename: string }) => r.filename));

    // Collect .sql files (skip the meta/ sub-directory)
    const files = fs
      .readdirSync(MIGRATIONS_DIR)
      .filter((f) => f.endsWith('.sql'))
      .sort();

    let ran = 0;
    for (const file of files) {
      if (applied.has(file)) {
        console.log(`  skip  ${file} (already applied)`);
        continue;
      }

      const fullPath = path.join(MIGRATIONS_DIR, file);
      const raw = fs.readFileSync(fullPath, 'utf8');

      // Split on Drizzle-style breakpoints; fall back to the whole file.
      const statements = raw
        .split(/-->[ \t]*statement-breakpoint/i)
        .map((s) => s.trim())
        .filter(Boolean);

      console.log(`  apply ${file} (${statements.length} statement(s))`);

      await client.query('BEGIN');
      try {
        // i is a loop counter, so the savepoint name is always safe.
        for (let i = 0; i < statements.length; i++) {
          const sp = `_mig_sp_${i}`;
          await client.query(`SAVEPOINT ${sp}`);
          try {
            await client.query(statements[i]);
            await client.query(`RELEASE SAVEPOINT ${sp}`);
          } catch (stmtErr: any) {
            if (ALREADY_EXISTS_CODES.has(stmtErr.code)) {
              // Object already exists – roll back just this statement and continue.
              await client.query(`ROLLBACK TO SAVEPOINT ${sp}`);
              await client.query(`RELEASE SAVEPOINT ${sp}`);
            } else {
              // Real error – abort the whole migration.
              await client.query('ROLLBACK');
              throw new Error(
                `Migration ${file} statement ${i + 1} failed (${stmtErr.code}): ${stmtErr.message}`
              );
            }
          }
        }
        await client.query(
          'INSERT INTO _schema_migrations (filename) VALUES ($1)',
          [file]
        );
        await client.query('COMMIT');
      } catch (err) {
        // Best-effort rollback for any error not already handled above
        // (e.g. failure in INSERT or COMMIT).
        try { await client.query('ROLLBACK'); } catch { /* ignore */ }
        throw err;
      }

      ran++;
    }

    if (ran === 0) {
      console.log('No new migrations to apply.');
    } else {
      console.log(`\nApplied ${ran} migration(s) successfully.`);
    }
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error('Migration runner error:', err);
  process.exit(1);
});

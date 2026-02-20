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
        for (const stmt of statements) {
          await client.query(stmt);
        }
        await client.query(
          'INSERT INTO _schema_migrations (filename) VALUES ($1)',
          [file]
        );
        await client.query('COMMIT');
      } catch (err) {
        await client.query('ROLLBACK');
        throw new Error(`Migration ${file} failed: ${(err as Error).message}`);
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

/**
 * Capinfra schema migration runner — CI edition.
 *
 * Drops all cap_* tables and enum types then re-applies every SQL file in
 * ./drizzle-capinfra/ from scratch.  This guarantees the schema in the test
 * database exactly matches capInfraSchema.ts regardless of any partial state
 * left by a prior CI run.
 *
 * The script is idempotent: running it twice produces the same clean schema.
 *
 * Usage:  npx tsx scripts/capinfra-migrate.ts
 */
import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { Pool } from 'pg';

async function dropCapInfraSchema(pool: Pool): Promise<void> {
  const client = await pool.connect();
  try {
    const { rows: tables } = await client.query<{ tablename: string }>(`
      SELECT tablename
      FROM pg_tables
      WHERE schemaname = 'public' AND tablename LIKE 'cap_%'
    `);
    for (const { tablename } of tables) {
      await client.query(`DROP TABLE IF EXISTS "${tablename}" CASCADE`);
      console.log(`[capinfra-migrate] dropped table ${tablename}`);
    }

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

  console.log('[capinfra-migrate] dropping any existing cap_* schema…');
  await dropCapInfraSchema(pool);

  const dir = path.join(process.cwd(), 'drizzle-capinfra');
  const files = fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  for (const file of files) {
    const fullPath = path.join(dir, file);
    const sql = fs.readFileSync(fullPath, 'utf8');
    const statements = sql
      .split('-->statement-breakpoint')
      .map((s) => s.trim())
      .filter(Boolean);

    console.log(`[capinfra-migrate] applying ${file} (${statements.length} statements)…`);

    for (const stmt of statements) {
      const client = await pool.connect();
      try {
        await client.query(stmt);
      } catch (err: any) {
        client.release();
        await pool.end();
        console.error(
          `[capinfra-migrate] FAILED:\n  ${stmt.slice(0, 200)}\n  Error (${err.code}): ${err.message}`,
        );
        process.exit(1);
      }
      client.release();
    }

    console.log(`[capinfra-migrate] ${file} done.`);
  }

  await pool.end();
  console.log('[capinfra-migrate] All capinfra migrations applied.');
}

main().catch((err) => {
  console.error('[capinfra-migrate] fatal:', err);
  process.exit(1);
});

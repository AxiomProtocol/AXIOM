import * as fs from 'fs';
import * as path from 'path';
import { Pool } from 'pg';

const MIGRATIONS_DIR = path.join(__dirname, '..', 'migrations');
const MIGRATIONS_TABLE = 'schema_migrations';

interface MigrationRow {
  name: string;
  applied_at: Date;
}

async function ensureMigrationsTable(client: import('pg').PoolClient): Promise<void> {
  await client.query(`
    CREATE TABLE IF NOT EXISTS ${MIGRATIONS_TABLE} (
      name VARCHAR(255) PRIMARY KEY,
      applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )
  `);
}

async function getAppliedMigrations(client: import('pg').PoolClient): Promise<Set<string>> {
  const result = await client.query<MigrationRow>(
    `SELECT name FROM ${MIGRATIONS_TABLE} ORDER BY name`
  );
  return new Set(result.rows.map((r) => r.name));
}

function getMigrationFiles(): string[] {
  return fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.sql') && !f.startsWith('_'))
    .sort();
}

function hasActualSql(fragment: string): boolean {
  // Strip single-line comments and check for non-whitespace content
  const stripped = fragment.replace(/--[^\n]*/g, '').trim();
  return stripped.length > 0;
}

function splitStatements(sql: string): string[] {
  if (sql.includes('--> statement-breakpoint')) {
    return sql
      .split('--> statement-breakpoint')
      .map((s) => s.trim())
      .filter(hasActualSql);
  }

  // For plain SQL files, split on semicolons while respecting dollar-quoted
  // blocks (e.g. DO $$ ... $$;) and single-quoted string literals.
  const statements: string[] = [];
  let start = 0;
  let i = 0;

  while (i < sql.length) {
    // Skip single-line comments
    if (sql[i] === '-' && sql[i + 1] === '-') {
      const newline = sql.indexOf('\n', i);
      i = newline === -1 ? sql.length : newline + 1;
      continue;
    }

    // Skip single-quoted string literals
    if (sql[i] === "'") {
      i++;
      while (i < sql.length) {
        if (sql[i] === "'" && sql[i + 1] === "'") {
          i += 2; // escaped single quote
        } else if (sql[i] === "'") {
          i++;
          break;
        } else {
          i++;
        }
      }
      continue;
    }

    // Handle dollar-quoted strings: $tag$ ... $tag$
    if (sql[i] === '$') {
      let tagEnd = i + 1;
      while (tagEnd < sql.length && sql[tagEnd] !== '$') tagEnd++;
      if (tagEnd < sql.length) {
        const tag = sql.substring(i, tagEnd + 1);
        const closeIdx = sql.indexOf(tag, tagEnd + 1);
        if (closeIdx !== -1) {
          i = closeIdx + tag.length;
          continue;
        }
      }
    }

    // Statement terminator
    if (sql[i] === ';') {
      const stmt = sql.substring(start, i).trim();
      if (hasActualSql(stmt)) {
        statements.push(stmt + ';');
      }
      start = i + 1;
    }

    i++;
  }

  // Handle any remaining content after the last semicolon
  const remaining = sql.substring(start).trim();
  if (hasActualSql(remaining)) {
    statements.push(remaining.endsWith(';') ? remaining : remaining + ';');
  }

  return statements;
}

async function applyMigration(
  client: import('pg').PoolClient,
  name: string,
  filePath: string
): Promise<void> {
  const sql = fs.readFileSync(filePath, 'utf8');
  const statements = splitStatements(sql);

  console.log(`  apply  ${name} (${statements.length} statement(s))`);

  for (let i = 0; i < statements.length; i++) {
    const statement = statements[i];
    try {
      await client.query(statement);
    } catch (err) {
      const error = err as Error & { code?: string };
      throw new Error(
        `Migration ${name} statement ${i + 1} failed (${error.code ?? 'unknown'}): ${error.message}`
      );
    }
  }

  await client.query(
    `INSERT INTO ${MIGRATIONS_TABLE} (name) VALUES ($1) ON CONFLICT (name) DO NOTHING`,
    [name]
  );
}

async function main(): Promise<void> {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error('DATABASE_URL environment variable is not set');
    process.exit(1);
  }

  const pool = new Pool({
    connectionString: databaseUrl,
    ssl: databaseUrl.includes('neon.tech') ? { rejectUnauthorized: false } : undefined,
  });

  const client = await pool.connect();

  try {
    await ensureMigrationsTable(client);

    const applied = await getAppliedMigrations(client);
    const files = getMigrationFiles();

    let appliedCount = 0;
    let skippedCount = 0;

    for (const file of files) {
      const filePath = path.join(MIGRATIONS_DIR, file);
      const stats = fs.statSync(filePath);
      if (stats.isDirectory()) continue;

      if (applied.has(file)) {
        console.log(`  skip   ${file} (already applied)`);
        skippedCount++;
        continue;
      }

      await applyMigration(client, file, filePath);
      appliedCount++;
    }

    console.log(
      `\nMigrations complete: ${appliedCount} applied, ${skippedCount} skipped.`
    );
  } catch (err) {
    const error = err as Error;
    console.error('Migration runner error:', error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

main();

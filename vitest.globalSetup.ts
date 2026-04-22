export async function setup() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.log('[migrate] DATABASE_URL not set — skipping auto-migration');
    return;
  }

  // Set SKIP_MIGRATIONS=true to opt out of running migrations before the test
  // suite (e.g. when the CI database is already migrated or for fast
  // unit-test-only runs) without having to unset DATABASE_URL.
  if (process.env.SKIP_MIGRATIONS === 'true') {
    console.log('[migrate] SKIP_MIGRATIONS=true — skipping auto-migration');
    return;
  }

  // Belt-and-braces: ensure the migrate module's auto-run guard treats this
  // as a non-CLI invocation even if its other heuristics misfire.
  process.env.SKIP_DB_MIGRATE = 'true';

  // Dynamic import so the module's top-level code does not execute at the
  // time vitest loads this setup file — only when setup() is actually called.
  const { runMigrations } = await import('./scripts/migrate');
  await runMigrations(connectionString);
}

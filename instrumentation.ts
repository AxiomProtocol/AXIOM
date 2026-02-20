/**
 * Next.js Instrumentation Hook (Next.js 14+)
 * https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 *
 * Runs once when the Next.js server starts.  Applies any pending Drizzle
 * migrations so that tables like `re_properties` always exist before the
 * first request is served.  Safe to run on every cold-start because
 * drizzle-orm tracks executed migrations in `drizzle.__drizzle_migrations`.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    if (!process.env.DATABASE_URL) {
      console.warn('[instrumentation] DATABASE_URL not set — skipping auto-migration');
      return;
    }

    try {
      const { Pool } = await import('pg');
      const { drizzle } = await import('drizzle-orm/node-postgres');
      const { migrate } = await import('drizzle-orm/node-postgres/migrator');
      const path = await import('path');

      const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: process.env.DATABASE_URL.includes('neon.tech') ? true : undefined,
        max: 1,
      });

      const db = drizzle(pool);

      await migrate(db, {
        migrationsFolder: path.join(process.cwd(), 'migrations'),
      });
      console.log('[instrumentation] Database migrations applied successfully');

      await pool.end();
    } catch (err) {
      console.error('[instrumentation] Failed to apply database migrations:', err);
    }
  }
}

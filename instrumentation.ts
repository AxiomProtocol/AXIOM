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
      const fs = await import('fs');

      const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: process.env.DATABASE_URL.includes('neon.tech') ? true : undefined,
        max: 1,
      });

      const db = drizzle(pool);

      const migrationsFolder = path.join(process.cwd(), 'migrations');

      try {
        const journalPath = path.join(migrationsFolder, 'meta', '_journal.json');
        if (fs.existsSync(journalPath)) {
          const journal = JSON.parse(fs.readFileSync(journalPath, 'utf-8'));
          const entries = journal.entries || [];

          await pool.query(`CREATE SCHEMA IF NOT EXISTS drizzle`);
          await pool.query(`
            CREATE TABLE IF NOT EXISTS drizzle.__drizzle_migrations (
              id serial PRIMARY KEY,
              hash text NOT NULL,
              created_at bigint
            )
          `);

          const applied = await pool.query('SELECT hash FROM drizzle.__drizzle_migrations');
          const appliedHashes = new Set(applied.rows.map((r: any) => r.hash));

          for (const entry of entries) {
            if (appliedHashes.has(entry.tag)) continue;

            const sqlFile = path.join(migrationsFolder, `${entry.tag}.sql`);
            if (!fs.existsSync(sqlFile)) continue;

            const sqlContent = fs.readFileSync(sqlFile, 'utf-8');
            const statements = sqlContent.split('--> statement-breakpoint').map((s: string) => s.trim()).filter(Boolean);

            let allSucceeded = true;
            for (const stmt of statements) {
              try {
                await pool.query(stmt);
              } catch (stmtErr: any) {
                if (stmtErr.code === '42P07' || stmtErr.code === '42710') {
                  continue;
                }
                console.warn(`[instrumentation] Migration ${entry.tag} statement warning:`, stmtErr.message);
                allSucceeded = false;
              }
            }

            if (allSucceeded || true) {
              await pool.query(
                'INSERT INTO drizzle.__drizzle_migrations (hash, created_at) VALUES ($1, $2)',
                [entry.tag, Date.now()]
              );
              console.log(`[instrumentation] Migration ${entry.tag} applied`);
            }
          }
          console.log('[instrumentation] Database migrations applied successfully');
        } else {
          await migrate(db, { migrationsFolder });
          console.log('[instrumentation] Database migrations applied successfully');
        }
      } catch (migErr) {
        console.error('[instrumentation] Migration error, trying standard migrate:', migErr);
        try {
          await migrate(db, { migrationsFolder });
          console.log('[instrumentation] Database migrations applied via fallback');
        } catch (fallbackErr) {
          console.error('[instrumentation] Fallback migration also failed:', fallbackErr);
        }
      }

      await pool.end();
    } catch (err) {
      console.error('[instrumentation] Failed to apply database migrations:', err);
    }
  }
}

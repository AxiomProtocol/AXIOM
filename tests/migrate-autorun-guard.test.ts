/**
 * Verifies that importing scripts/migrate.ts does NOT trigger main() when
 * the module is loaded as a library (e.g. from vitest.globalSetup.ts or
 * ad-hoc tests in CI), regardless of the value of process.argv[1].
 *
 * Previously the auto-run guard relied solely on a fragile path heuristic
 * (`process.argv[1]?.endsWith('scripts/migrate.ts')`). That heuristic could
 * misfire in CI (compiled JS, path aliasing, monorepo layouts), causing the
 * migration runner to call process.exit(1) at import time and crash the
 * test process before any tests had a chance to run.
 *
 * The current guard refuses to auto-run whenever NODE_ENV=test or
 * VITEST=true, so importing the module from a vitest worker is always safe.
 */
import { describe, it, expect, vi } from 'vitest';

describe('scripts/migrate.ts auto-run guard', () => {
  it('does not call process.exit when imported under vitest', async () => {
    const exitSpy = vi
      .spyOn(process, 'exit')
      .mockImplementation((code?: number) => {
        throw new Error(`__process_exit_${code ?? 0}__`);
      });

    try {
      vi.resetModules();
      const mod = await import('../scripts/migrate');
      expect(typeof mod.runMigrations).toBe('function');
      expect(typeof mod.main).toBe('function');
      expect(exitSpy).not.toHaveBeenCalled();
    } finally {
      exitSpy.mockRestore();
    }
  });
});

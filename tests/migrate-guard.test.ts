/**
 * Unit tests for the NODE_ENV=test safety guard in scripts/migrate.ts.
 *
 * The guard refuses to fall back to DATABASE_URL when NODE_ENV=test, so that
 * a stray test run can never migrate a production or staging database.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { main } from '../scripts/migrate';

describe('scripts/migrate.ts main() guard', () => {
  const originalNodeEnv = process.env.NODE_ENV;
  const originalTestUrl = process.env.TEST_DATABASE_URL;
  const originalDbUrl = process.env.DATABASE_URL;

  let exitSpy: ReturnType<typeof vi.spyOn>;
  let errorSpy: ReturnType<typeof vi.spyOn>;
  let logSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    exitSpy = vi.spyOn(process, 'exit').mockImplementation((code?: number) => {
      throw new Error(`__process_exit_${code ?? 0}__`);
    });
    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    exitSpy.mockRestore();
    errorSpy.mockRestore();
    logSpy.mockRestore();
    if (originalNodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = originalNodeEnv;
    if (originalTestUrl === undefined) delete process.env.TEST_DATABASE_URL;
    else process.env.TEST_DATABASE_URL = originalTestUrl;
    if (originalDbUrl === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = originalDbUrl;
  });

  it('exits with a non-zero code and an actionable error when NODE_ENV=test and TEST_DATABASE_URL is missing', async () => {
    process.env.NODE_ENV = 'test';
    delete process.env.TEST_DATABASE_URL;
    process.env.DATABASE_URL = 'postgres://prod-host/should-never-be-used';

    const runner = vi.fn().mockResolvedValue(undefined);

    await expect(main(runner)).rejects.toThrow('__process_exit_1__');

    expect(exitSpy).toHaveBeenCalledWith(1);
    expect(runner).not.toHaveBeenCalled();

    const errorMessage = errorSpy.mock.calls.map((c) => c.join(' ')).join('\n');
    expect(errorMessage).toContain('NODE_ENV=test but TEST_DATABASE_URL is not set');
    expect(errorMessage).toContain('Refusing to fall back to DATABASE_URL');
    expect(errorMessage).toContain('Set TEST_DATABASE_URL');
    // Ensure the production DATABASE_URL was never even mentioned.
    expect(errorMessage).not.toContain('prod-host');
  });

  it('uses TEST_DATABASE_URL (not DATABASE_URL) when NODE_ENV=test and TEST_DATABASE_URL is set', async () => {
    process.env.NODE_ENV = 'test';
    process.env.TEST_DATABASE_URL = 'postgres://test-host/test-db';
    process.env.DATABASE_URL = 'postgres://prod-host/prod-db';

    const runner = vi.fn().mockResolvedValue(undefined);

    await expect(main(runner)).resolves.toBeUndefined();

    expect(exitSpy).not.toHaveBeenCalled();
    expect(runner).toHaveBeenCalledTimes(1);
    expect(runner).toHaveBeenCalledWith('postgres://test-host/test-db');
  });

  it('exits with a non-zero code when NODE_ENV is not test and DATABASE_URL is missing', async () => {
    process.env.NODE_ENV = 'development';
    delete process.env.DATABASE_URL;
    delete process.env.TEST_DATABASE_URL;

    const runner = vi.fn().mockResolvedValue(undefined);

    await expect(main(runner)).rejects.toThrow('__process_exit_1__');
    expect(exitSpy).toHaveBeenCalledWith(1);
    expect(runner).not.toHaveBeenCalled();

    const errorMessage = errorSpy.mock.calls.map((c) => c.join(' ')).join('\n');
    expect(errorMessage).toContain('DATABASE_URL is not set');
  });
});

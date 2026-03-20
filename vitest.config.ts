import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: false,
    environment: 'node',
    include: [
      'lib/**/*.test.ts',
      'tests/cost-intelligence/**/*.test.ts',
      'tests/mirdt-lexicon.test.ts',
    ],
    exclude: [
      'node_modules/**',
      'node_modules_backup/**',
      '.next/**',
      'test/**',
    ],
    testTimeout: 10_000,
    reporters: ['verbose'],
  },
});

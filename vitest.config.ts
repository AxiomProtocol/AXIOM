import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    globalSetup: ['./vitest.globalSetup.ts'],
    globals: false,
    environment: 'node',
    include: [
      'lib/**/*.test.ts',
      'lib/**/*.test.tsx',
      'tests/**/*.test.ts',
      'tests/**/*.test.tsx',
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

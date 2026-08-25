import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['test/**/*.test.ts'],
    environment: 'node',
    // Each test opens its own transaction; they must not interleave on one
    // connection pool while impersonating different roles.
    fileParallelism: false,
    testTimeout: 20_000,
  },
});

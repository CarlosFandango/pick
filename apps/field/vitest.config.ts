import { defineConfig } from 'vitest/config';

export default defineConfig({
  // Node only: these tests exercise sync and migration logic against doubles,
  // deliberately without the Expo runtime or a device.
  test: { include: ['test/**/*.test.ts'], environment: 'node' },
});

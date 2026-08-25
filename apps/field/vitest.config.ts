import path from 'node:path';
import { defineConfig } from 'vitest/config';

/** Matches the `@/*` paths mapping in tsconfig.json. */
const alias = { '@': path.resolve(import.meta.dirname, 'src') };

export default defineConfig({
  test: {
    projects: [
      {
        // Pure logic: sync, migrations, formatting. No React, no platform.
        resolve: { alias },
        test: { name: 'logic', include: ['test/**/*.test.ts'], environment: 'node' },
      },
      {
        // Screens. React Native ships untranspiled Flow, which Vitest cannot
        // parse, so components render through `react-native-web` — the same
        // JSX and the same props, painted into a DOM that Testing Library can
        // drive with real user events. It tests our components, not React
        // Native's renderer.
        resolve: { alias: { ...alias, 'react-native': 'react-native-web' } },
        esbuild: { jsx: 'automatic' },
        test: {
          name: 'screens',
          include: ['test/**/*.test.tsx'],
          environment: 'jsdom',
          setupFiles: ['./test/setup.ts'],
        },
      },
    ],
  },
});

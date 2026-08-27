import path from 'node:path';
import { defineConfig } from 'vitest/config';

/**
 * Component tests for the portal.
 *
 * Playwright proves the app works; it is slow, single-worker and needs a real
 * database, so reaching for it to check a status pill made design iteration
 * cost about twenty seconds a look. This layer renders the presentational
 * components directly and answers in milliseconds.
 *
 * The split that makes it possible: **pages fetch, components render.** A page
 * is an async Server Component doing queries and passing props; everything
 * with JSX worth asserting on is a sync component underneath it. Nothing here
 * renders a page — that is still Playwright's job, and rightly so, because a
 * page is only true against a real session and real RLS.
 *
 * Same tooling and the same setup file as `apps/field`, deliberately: one way
 * to do each thing, and nothing new to learn to write the next test.
 */
export default defineConfig({
  resolve: { alias: { '@': path.resolve(import.meta.dirname, 'src') } },
  esbuild: { jsx: 'automatic' },
  test: {
    name: 'components',
    include: ['test/**/*.test.tsx'],
    environment: 'jsdom',
    setupFiles: ['./test/setup.ts'],
  },
});

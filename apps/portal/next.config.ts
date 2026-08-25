import path from 'node:path';
import type { NextConfig } from 'next';

const config: NextConfig = {
  reactStrictMode: true,
  // Without this Next walks up looking for a lockfile and can settle on one
  // outside the repo entirely (a stray ~/package-lock.json), which silently
  // changes what gets traced into the build.
  outputFileTracingRoot: path.join(import.meta.dirname, '../..'),
  // Workspace packages ship TypeScript source, not a build step.
  transpilePackages: [
    '@picksel/api',
    '@picksel/core',
    '@picksel/db',
    '@picksel/tokens',
    '@picksel/ui',
  ],
};

export default config;

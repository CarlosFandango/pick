import type { NextConfig } from 'next';

const config: NextConfig = {
  reactStrictMode: true,
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

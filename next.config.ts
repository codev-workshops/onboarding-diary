import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // The Docker image ships .next/standalone (a self-contained server.js). Standalone
  // output is opt-in rather than always-on because `next start` refuses to serve a
  // standalone build, which would break the local and CI workflows.
  output: process.env.BUILD_STANDALONE === '1' ? 'standalone' : undefined,
};

export default nextConfig;

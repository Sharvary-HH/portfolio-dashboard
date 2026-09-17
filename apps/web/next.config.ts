import type { NextConfig } from 'next';

const apiBaseUrl = process.env.API_BASE_URL ?? 'http://localhost:4000';

const nextConfig: NextConfig = {
  transpilePackages: ['@portfolio/shared'],
  async rewrites() {
    return [{ source: '/api/:path*', destination: `${apiBaseUrl}/api/:path*` }];
  },
};

export default nextConfig;

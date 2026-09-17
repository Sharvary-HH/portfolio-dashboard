import type { NextConfig } from 'next';

const apiBaseUrl = process.env.API_BASE_URL ?? 'http://localhost:4000';

const nextConfig: NextConfig = {
  transpilePackages: ['@portfolio/shared'],
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'www.google.com', pathname: '/s2/favicons' },
      { protocol: 'https', hostname: 'icons.duckduckgo.com', pathname: '/ip3/**' },
    ],
  },
  async rewrites() {
    return [{ source: '/api/:path*', destination: `${apiBaseUrl}/api/:path*` }];
  },
};

export default nextConfig;

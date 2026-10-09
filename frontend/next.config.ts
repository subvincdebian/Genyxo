import type { NextConfig } from 'next';
const backend = (process.env.BACKEND_URL || process.env.NEXT_PUBLIC_API_BASE_URL || 'http://127.0.0.1:3000').replace(/\/$/, '');
const legacyPages = ['chat', 'profile', 'notifications', 'support', 'dashboard'];
const policyPages = ['policies', 'privacy-policy', 'terms-of-service', 'faq'];
const config: NextConfig = {
  output: 'standalone',
  outputFileTracingRoot: import.meta.dirname,
  poweredByHeader: false,
  experimental: { proxyTimeout: 120_000 },
  async rewrites() {
    return {
      beforeFiles: [
        { source: '/index.html', destination: '/' },
        ...legacyPages.map(page => ({ source: `/${page}.html`, destination: `/${page}` })),
        ...policyPages.flatMap(page => [
          { source: `/policies/${page}.html`, destination: `/policies/${page}` },
          { source: `/${page}.html`, destination: `/policies/${page}` },
        ]),
        { source: '/gate.html', destination: '/admin' },
        { source: '/admin.html', destination: '/admin' },
        { source: '/are-you-sure-you-want-to-admin/panel', destination: '/admin' },
        { source: '/api/:path*', destination: `${backend}/:path*` },
        { source: '/auth/:path*', destination: `${backend}/auth/:path*` },
      ],
      afterFiles: [], fallback: [],
    };
  },
};
export default config;


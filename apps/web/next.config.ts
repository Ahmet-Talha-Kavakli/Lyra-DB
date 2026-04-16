import type { NextConfig } from 'next';
import { withSentryConfig } from '@sentry/nextjs';
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

const nextConfig: NextConfig = {
  // Enable instrumentation hook (Sentry server-side init)
  // Security headers applied to all routes
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options',    value: 'nosniff' },
          { key: 'X-Frame-Options',            value: 'DENY' },
          { key: 'X-XSS-Protection',           value: '1; mode=block' },
          { key: 'Referrer-Policy',            value: 'strict-origin-when-cross-origin' },
          // camera + mic required for therapy sessions; geolocation blocked
          { key: 'Permissions-Policy',         value: 'camera=(self), microphone=(self), geolocation=()' },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
        ],
      },
      {
        // API routes must never be cached
        source: '/api/(.*)',
        headers: [
          { key: 'Cache-Control', value: 'no-store, max-age=0' },
        ],
      },
    ];
  },

  // Rewrites: proxy NestJS WebSocket upgrade and API calls in dev
  async rewrites() {
    const apiUrl = process.env['API_URL'] ?? 'http://localhost:3001';
    return [
      {
        source: '/nest-api/:path*',
        destination: `${apiUrl}/:path*`,
      },
      // PWA manifest — browsers request /[locale]/manifest.json when on a locale-prefixed path
      // Redirect to the root manifest so the service worker scope is always /
      {
        source: '/:locale/manifest.json',
        destination: '/manifest.json',
      },
    ];
  },
};

export default withSentryConfig(withNextIntl(nextConfig), {
  // Sentry project org/project for source map uploads
  org:     process.env['SENTRY_ORG'],
  project: process.env['SENTRY_PROJECT'],

  // Silent in CI — errors still throw, just less noise
  silent: !process.env['CI'],

  // Upload source maps only in production builds
  widenClientFileUpload:    true,
  disableLogger:            true,
  automaticVercelMonitors:  true,
  sourcemaps: {
    disable: false,
  },
});

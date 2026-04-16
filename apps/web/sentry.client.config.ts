import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env['NEXT_PUBLIC_SENTRY_DSN'],

  // Capture 10% of sessions in prod — raise for debugging
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

  // Session replay 5% of sessions, 100% of sessions with errors
  replaysSessionSampleRate: 0.05,
  replaysOnErrorSampleRate: 1.0,

  // Keep debug off — tracing logs flood the console and obscure real errors
  debug: false,

  integrations: [
    Sentry.replayIntegration({
      // PHI masking: block all text and media from being captured
      maskAllText:    true,
      blockAllMedia:  true,
    }),
  ],
});

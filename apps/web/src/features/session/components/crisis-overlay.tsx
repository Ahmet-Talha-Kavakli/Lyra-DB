'use client';

import { useEffect } from 'react';
import { useSessionStore } from '../session.store';

interface CrisisResource {
  label:  string;
  number: string;
  href:   string;
  note:   string;
}

const CRISIS_RESOURCES: CrisisResource[] = [
  {
    label:  'Turkey Mental Health Line',
    number: '182',
    href:   'tel:182',
    note:   'Free, 24/7 — Turkey',
  },
  {
    label:  'Turkey Suicide Prevention',
    number: '156',
    href:   'tel:156',
    note:   'Free, 24/7 — Turkey',
  },
  {
    label:  'International Crisis Centres',
    number: 'Find local support',
    href:   'https://www.iasp.info/resources/Crisis_Centres/',
    note:   'Worldwide directory',
  },
];

/**
 * Graduated crisis UI:
 *
 *   severity 'moderate' (score 5–6):
 *     Soft bottom banner — resources quietly available, no interruption.
 *
 *   severity 'high' (score 7–8):
 *     Side panel slides in — Lyra continues session, resources visible.
 *
 *   severity 'imminent' (score 9–10 / keyword / facial):
 *     Full-screen overlay — session paused, immediate support prioritised.
 */
export function CrisisOverlay() {
  const { activeCrisis, setActiveCrisis } = useSessionStore();

  // Block scroll only for full overlay (imminent)
  useEffect(() => {
    if (activeCrisis?.severity !== 'imminent') return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [activeCrisis]);

  if (!activeCrisis) return null;

  const { severity } = activeCrisis;

  // ── Moderate: soft bottom banner ─────────────────────────────────────────
  if (severity === 'moderate') {
    return (
      <div className="fixed bottom-0 inset-x-0 z-40 border-t border-amber-500/25 bg-gray-950/95 px-6 py-3 backdrop-blur-sm">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4">
          <p className="text-sm text-gray-300">
            Support resources are available whenever you need them.
          </p>
          <div className="flex items-center gap-3">
            <a
              href="tel:182"
              className="rounded-lg border border-amber-500/40 px-3 py-1.5 text-xs font-medium text-amber-300 transition-colors hover:border-amber-400/60 hover:text-amber-200"
            >
              Call 182
            </a>
            <button
              type="button"
              onClick={() => setActiveCrisis(null)}
              className="text-xs text-gray-600 transition-colors hover:text-gray-400"
              aria-label="Dismiss"
            >
              ✕
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── High: right-side panel (session continues behind it) ─────────────────
  if (severity === 'high') {
    return (
      <div className="fixed right-0 top-0 z-40 h-full w-80 border-l border-amber-500/30 bg-gray-950/95 p-6 backdrop-blur-sm">
        <div className="flex h-full flex-col">
          <div className="mb-6 flex items-start justify-between">
            <div>
              <div className="mb-1 flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-amber-400" />
                <span className="text-xs font-semibold uppercase tracking-wider text-amber-400">Support Resources</span>
              </div>
              <p className="text-sm text-gray-300">
                I'm here with you. These resources are available if you need extra support right now.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setActiveCrisis(null)}
              className="ml-2 flex-shrink-0 rounded-full p-1 text-gray-600 transition-colors hover:text-gray-400"
              aria-label="Close"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
              </svg>
            </button>
          </div>

          <ul className="flex-1 space-y-2">
            {CRISIS_RESOURCES.map((r) => (
              <li key={r.label}>
                <a
                  href={r.href}
                  target={r.href.startsWith('http') ? '_blank' : undefined}
                  rel={r.href.startsWith('http') ? 'noopener noreferrer' : undefined}
                  className="flex flex-col rounded-xl border border-amber-500/25 px-4 py-3 text-sm transition-colors hover:border-amber-500/50 hover:bg-amber-500/5"
                >
                  <span className="font-semibold text-white">{r.number}</span>
                  <span className="text-xs text-gray-400">{r.note}</span>
                </a>
              </li>
            ))}
          </ul>

          <button
            type="button"
            onClick={() => setActiveCrisis(null)}
            className="mt-4 w-full rounded-xl border border-gray-700 py-2.5 text-sm text-gray-400 transition-colors hover:border-gray-500 hover:text-white"
          >
            Continue session
          </button>
        </div>
      </div>
    );
  }

  // ── Imminent: full overlay ─────────────────────────────────────────────────
  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="crisis-title"
      aria-describedby="crisis-body"
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
    >
      <div className="absolute inset-0 bg-black/85 backdrop-blur-sm" />

      <div className="relative z-10 w-full max-w-md rounded-2xl border-2 border-red-500/60 bg-gray-950 p-8 shadow-2xl">
        {/* Icon */}
        <div className="mb-6 flex flex-col items-center gap-3 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-red-500/15 ring-1 ring-red-500/30">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-7 w-7 text-red-400">
              <path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12ZM12 8.25a.75.75 0 0 1 .75.75v3.75a.75.75 0 0 1-1.5 0V9a.75.75 0 0 1 .75-.75Zm0 8.25a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Z" clipRule="evenodd" />
            </svg>
          </span>

          <h2 id="crisis-title" className="text-xl font-semibold text-white">
            I hear you — you don't have to face this alone
          </h2>
        </div>

        <p id="crisis-body" className="mb-6 text-center text-sm leading-relaxed text-gray-300">
          What you're going through sounds incredibly difficult. A trained crisis counsellor can provide human support right now — it's free and confidential.
        </p>

        <ul className="mb-6 space-y-2">
          {CRISIS_RESOURCES.map((r) => (
            <li key={r.label}>
              <a
                href={r.href}
                target={r.href.startsWith('http') ? '_blank' : undefined}
                rel={r.href.startsWith('http') ? 'noopener noreferrer' : undefined}
                className="flex flex-col rounded-xl border border-red-500/30 px-4 py-3 text-sm transition-colors hover:border-red-500/60 hover:bg-red-500/5"
              >
                <span className="font-semibold text-white">{r.number}</span>
                <span className="text-xs text-gray-400">{r.note}</span>
              </a>
            </li>
          ))}
        </ul>

        <div className="flex flex-col gap-3">
          <a
            href="tel:182"
            className="flex items-center justify-center rounded-xl bg-red-600 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-red-500"
          >
            Call 182 now
          </a>
          <button
            type="button"
            onClick={() => setActiveCrisis(null)}
            className="rounded-xl border border-white/15 px-6 py-3 text-sm text-gray-400 transition-colors hover:border-white/30 hover:text-white"
          >
            Stay in our session
          </button>
        </div>

        <p className="mt-4 text-center text-xs text-gray-700">
          This session is being held with care. You are not alone.
        </p>
      </div>
    </div>
  );
}

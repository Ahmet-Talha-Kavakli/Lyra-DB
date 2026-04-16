'use client';

import Link from 'next/link';

interface SessionSummaryProps {
  durationMs:      number;
  lastLyraMessage: string | null;
}

function formatDuration(ms: number): string {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const r = s % 60;
  if (m === 0) return `${s} seconds`;
  if (r === 0) return `${m} min`;
  return `${m} min ${r} sec`;
}

/**
 * Shown when the session phase transitions to 'ended'.
 *
 * Gives the user a warm, calm wrap-up: session duration, Lyra's last
 * message, and clear navigation options.
 */
export function SessionSummary({ durationMs, lastLyraMessage }: SessionSummaryProps) {
  const duration = formatDuration(durationMs);

  return (
    <div className="flex h-full flex-col items-center justify-center gap-8 bg-gray-950 px-8 py-12 text-center">
      {/* Completion icon */}
      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-violet-500/15 ring-1 ring-violet-500/30">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="currentColor"
          className="h-9 w-9 text-violet-400"
        >
          <path
            fillRule="evenodd"
            d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12Zm13.36-1.814a.75.75 0 1 0-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 0 0-1.06 1.06l2.25 2.25a.75.75 0 0 0 1.14-.094l3.75-5.25Z"
            clipRule="evenodd"
          />
        </svg>
      </div>

      {/* Header */}
      <div>
        <h2 className="text-xl font-semibold text-white">Session complete</h2>
        <p className="mt-1 text-sm text-gray-500">You spent {duration} with Lyra today</p>
      </div>

      {/* Lyra's last message — gentle, personal close */}
      {lastLyraMessage && (
        <div className="w-full max-w-sm rounded-2xl border border-violet-500/20 bg-violet-500/5 px-6 py-5 text-left">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-violet-400">
            Lyra's closing thought
          </p>
          <p className="text-sm leading-relaxed text-gray-300 line-clamp-5">
            {lastLyraMessage}
          </p>
        </div>
      )}

      {/* Gentle reminder */}
      <p className="max-w-xs text-xs leading-relaxed text-gray-600">
        Your session has been saved. Lyra will remember this conversation for next time.
      </p>

      {/* Navigation */}
      <div className="flex w-full max-w-xs flex-col gap-3">
        <Link
          href="/dashboard"
          className="flex w-full items-center justify-center rounded-xl bg-violet-600 px-6 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-violet-500"
        >
          Back to Dashboard
        </Link>
        <Link
          href="/session/new"
          className="flex w-full items-center justify-center rounded-xl border border-gray-700 px-6 py-3.5 text-sm text-gray-300 transition-colors hover:border-gray-500 hover:text-white"
        >
          Start another session
        </Link>
      </div>
    </div>
  );
}

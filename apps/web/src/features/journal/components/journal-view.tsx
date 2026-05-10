'use client';

import dynamic from 'next/dynamic';
import { Caveat } from 'next/font/google';
import type { JournalBookProps } from './journal-book';

const caveat = Caveat({ subsets: ['latin'], weight: ['400'] });

// react-pageflip uses browser APIs — must be client-only
const JournalBook = dynamic<JournalBookProps>(
  () => import('./journal-book'),
  {
    ssr: false,
    loading: () => (
      <div className="flex flex-col items-center gap-8 py-10 px-4">
        <h1 className={`${caveat.className} text-3xl font-bold text-violet-300`}>Günlük</h1>
        {/* Book skeleton — same proportions as the real book */}
        <div
          className="animate-pulse rounded-sm"
          style={{
            width: 780,
            height: 560,
            maxWidth: '95vw',
            background: 'linear-gradient(155deg, #1e1040 0%, #0f0820 100%)',
            boxShadow: '0 20px 60px rgba(0,0,0,0.7)',
          }}
        />
      </div>
    ),
  },
);

export interface JournalEntry {
  id: string;
  entryDate: string;
  content: string;
}

export function JournalView({
  entries,
  userId,
}: {
  entries: JournalEntry[];
  userId: string;
}) {
  return <JournalBook entries={entries} userId={userId} />;
}

import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { JournalView } from '@/features/journal/components/journal-view';

interface JournalEntryItem {
  id: string;
  entryDate: string;
  content: string;
}

async function fetchJournalEntries(userId: string): Promise<JournalEntryItem[]> {
  try {
    const apiUrl = process.env['API_URL'] ?? 'http://localhost:3001';
    const res = await fetch(`${apiUrl}/journal`, {
      headers: { 'x-clerk-user-id': userId },
      cache: 'no-store',
    });
    if (!res.ok) return [];
    return res.json() as Promise<JournalEntryItem[]>;
  } catch {
    return [];
  }
}

export default async function JournalPage() {
  const { userId } = await auth();
  if (!userId) redirect('/sign-in');
  const entries = await fetchJournalEntries(userId);
  return <JournalView entries={entries} userId={userId} />;
}

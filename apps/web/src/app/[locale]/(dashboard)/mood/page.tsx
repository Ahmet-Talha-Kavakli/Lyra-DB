import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { MoodCheckin } from '@/features/mood/components/mood-checkin';
import { MoodTrendChart } from '@/features/mood/components/mood-trend-chart';

interface MoodPoint { score: number; loggedAt: string; }

async function fetchMoodHistory(userId: string, days: number): Promise<MoodPoint[]> {
  try {
    const apiUrl = process.env['API_URL'] ?? 'http://localhost:3001';
    const res = await fetch(`${apiUrl}/mood/history?days=${days}`, {
      headers: { 'x-clerk-user-id': userId },
      cache: 'no-store',
    });
    if (!res.ok) return [];
    return res.json() as Promise<MoodPoint[]>;
  } catch {
    return [];
  }
}

export default async function MoodPage() {
  const { userId } = await auth();
  if (!userId) redirect('/sign-in');
  const history = await fetchMoodHistory(userId, 30);
  return (
    <div className="px-8 py-10 max-w-3xl">
      <h1 className="text-2xl font-bold text-white mb-8">Duygu Takibi</h1>
      <MoodCheckin userId={userId} />
      <div className="mt-8">
        <MoodTrendChart data={history} />
      </div>
    </div>
  );
}

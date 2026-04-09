import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { GoalsList } from '@/features/goals/components/goals-list';

async function fetchGoals(userId: string): Promise<string[]> {
  try {
    const apiUrl = process.env['API_URL'] ?? 'http://localhost:3001';
    const res = await fetch(`${apiUrl}/user/profile`, {
      headers: { 'x-clerk-user-id': userId },
      cache: 'no-store',
    });
    if (!res.ok) return [];
    const profile = await res.json() as { goals?: string[] };
    return profile.goals ?? [];
  } catch {
    return [];
  }
}

export default async function GoalsPage() {
  const { userId } = await auth();
  if (!userId) redirect('/sign-in');
  const goals = await fetchGoals(userId);
  return (
    <div className="px-8 py-10 max-w-2xl">
      <h1 className="text-2xl font-bold text-white mb-8">Hedeflerim</h1>
      <GoalsList goals={goals} />
    </div>
  );
}

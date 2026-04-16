'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@clerk/nextjs';

interface MoodEntry {
  score: number;
  loggedAt: string;
}

interface Stats {
  streak: number;
  totalMoodLogs: number;
  weeklyMoods: MoodEntry[];
  avgMoodThisWeek: number | null;
}

const DAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

function getMoodColor(score: number): string {
  if (score >= 8) return 'bg-emerald-400';
  if (score >= 6) return 'bg-teal-400';
  if (score >= 4) return 'bg-amber-400';
  if (score >= 2) return 'bg-orange-400';
  return 'bg-red-400';
}

function getMoodEmoji(score: number): string {
  if (score >= 8) return '😊';
  if (score >= 6) return '🙂';
  if (score >= 4) return '😐';
  if (score >= 2) return '😔';
  return '😢';
}

function calculateStreak(entries: MoodEntry[]): number {
  if (entries.length === 0) return 0;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Unique days with entries
  const days = new Set(
    entries.map((e) => {
      const d = new Date(e.loggedAt);
      d.setHours(0, 0, 0, 0);
      return d.getTime();
    }),
  );

  let streak = 0;
  let cursor = today.getTime();

  // Allow today OR yesterday as the most recent entry
  if (!days.has(cursor)) {
    cursor -= 86_400_000; // check yesterday
    if (!days.has(cursor)) return 0;
  }

  while (days.has(cursor)) {
    streak++;
    cursor -= 86_400_000;
  }

  return streak;
}

/**
 * Fetches mood history and computes streak, weekly chart, and average.
 * Renders a compact stats row at the top of the dashboard.
 */
export function DashboardStats() {
  const { userId, getToken } = useAuth();
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    if (!userId) return;

    const apiUrl = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3001';

    async function load() {
      try {
        const res = await fetch(`${apiUrl}/mood/history?days=30`, {
          headers: { 'x-clerk-user-id': userId! },
        });
        if (!res.ok) return;
        const entries: MoodEntry[] = await res.json() as MoodEntry[];

        const last7 = entries.slice(-7);
        const avgMoodThisWeek =
          last7.length > 0
            ? Math.round((last7.reduce((s, e) => s + e.score, 0) / last7.length) * 10) / 10
            : null;

        setStats({
          streak:          calculateStreak(entries),
          totalMoodLogs:   entries.length,
          weeklyMoods:     last7,
          avgMoodThisWeek,
        });
      } catch {
        // Non-critical — stats fail silently
      }
    }

    void load();
  }, [userId]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!stats) {
    // Skeleton
    return (
      <div className="mt-8 grid grid-cols-3 gap-4">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-24 animate-pulse rounded-2xl bg-gray-800/60" />
        ))}
      </div>
    );
  }

  return (
    <div className="mt-8 space-y-4">
      {/* Stat cards row */}
      <div className="grid grid-cols-3 gap-4">
        {/* Streak */}
        <div className="rounded-2xl border border-orange-500/20 bg-gradient-to-br from-orange-500/10 to-red-500/5 p-5">
          <p className="text-xs font-medium uppercase tracking-wider text-orange-400">Streak</p>
          <p className="mt-1 text-3xl font-bold text-white">
            {stats.streak}
            <span className="ml-1 text-lg font-normal text-orange-400">🔥</span>
          </p>
          <p className="mt-0.5 text-xs text-gray-500">consecutive days</p>
        </div>

        {/* Average mood */}
        <div className="rounded-2xl border border-teal-500/20 bg-gradient-to-br from-teal-500/10 to-emerald-500/5 p-5">
          <p className="text-xs font-medium uppercase tracking-wider text-teal-400">Avg Mood</p>
          <p className="mt-1 text-3xl font-bold text-white">
            {stats.avgMoodThisWeek !== null ? stats.avgMoodThisWeek : '—'}
            <span className="ml-1 text-lg">
              {stats.avgMoodThisWeek !== null ? getMoodEmoji(stats.avgMoodThisWeek) : ''}
            </span>
          </p>
          <p className="mt-0.5 text-xs text-gray-500">this week / 10</p>
        </div>

        {/* Check-ins */}
        <div className="rounded-2xl border border-violet-500/20 bg-gradient-to-br from-violet-500/10 to-purple-500/5 p-5">
          <p className="text-xs font-medium uppercase tracking-wider text-violet-400">Check-ins</p>
          <p className="mt-1 text-3xl font-bold text-white">{stats.totalMoodLogs}</p>
          <p className="mt-0.5 text-xs text-gray-500">total entries</p>
        </div>
      </div>

      {/* 7-day mood bar chart */}
      {stats.weeklyMoods.length > 0 && (
        <div className="rounded-2xl border border-white/5 bg-gray-900/60 p-5">
          <p className="mb-4 text-xs font-medium uppercase tracking-wider text-gray-500">
            This week's emotional journey
          </p>
          <div className="flex items-end justify-between gap-2 h-16">
            {/* Fill missing days with empty bars */}
            {(() => {
              const today = new Date();
              const bars = Array.from({ length: 7 }, (_, i) => {
                const day = new Date(today);
                day.setDate(today.getDate() - (6 - i));
                day.setHours(0, 0, 0, 0);

                const entry = stats.weeklyMoods.find((e) => {
                  const d = new Date(e.loggedAt);
                  d.setHours(0, 0, 0, 0);
                  return d.getTime() === day.getTime();
                });

                return { day, entry, isToday: i === 6 };
              });

              return bars.map(({ day, entry, isToday }) => (
                <div key={day.getTime()} className="flex flex-1 flex-col items-center gap-1">
                  {entry ? (
                    <div
                      className={`w-full rounded-t-sm ${getMoodColor(entry.score)} transition-all`}
                      style={{ height: `${(entry.score / 10) * 100}%`, minHeight: '4px' }}
                      title={`Score: ${entry.score}`}
                    />
                  ) : (
                    <div className="w-full flex-1 rounded-t-sm bg-gray-800/60" />
                  )}
                  <span
                    className={`text-xs ${
                      isToday ? 'font-semibold text-violet-400' : 'text-gray-600'
                    }`}
                  >
                    {DAY_LABELS[day.getDay()]}
                  </span>
                </div>
              ));
            })()}
          </div>
        </div>
      )}
    </div>
  );
}

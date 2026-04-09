'use client';

import { useState } from 'react';
import {
  LineChart, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid,
} from 'recharts';

interface MoodPoint { score: number; loggedAt: string; }

const EMOJI_MAP: Record<number, string> = { 1: '😢', 2: '😕', 3: '😐', 4: '🙂', 5: '😄' };

export function MoodTrendChart({ data }: { data: MoodPoint[] }) {
  const [range, setRange] = useState<7 | 30>(7);

  const chartData = data
    .slice(-range)
    .map((d) => ({
      date: new Date(d.loggedAt).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' }),
      score: d.score,
    }));

  if (chartData.length === 0) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6 text-center">
        <p className="text-gray-500 text-sm">Henüz duygu kaydın yok. Yukarıdan başla!</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-white font-semibold">Duygu Trendi</h3>
        <div className="flex gap-2">
          {([7, 30] as const).map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`px-3 py-1 rounded-lg text-sm transition-all ${
                range === r
                  ? 'bg-violet-500/20 text-violet-300 border border-violet-500/30'
                  : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              {r} gün
            </button>
          ))}
        </div>
      </div>
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
          <XAxis dataKey="date" tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} />
          <YAxis domain={[1, 5]} ticks={[1, 2, 3, 4, 5]} tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false}
            tickFormatter={(v: number) => EMOJI_MAP[v] ?? ''} />
          <Tooltip
            contentStyle={{ background: '#1a1829', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, color: '#e5e7eb' }}
            formatter={(value) => [`${EMOJI_MAP[Number(value)] ?? ''} ${String(value)}/5`, 'Duygu']}
          />
          <Line type="monotone" dataKey="score" stroke="#7c3aed" strokeWidth={2.5} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

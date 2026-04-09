'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';

const MOODS = [
  { score: 1, emoji: '😢', label: 'Çok kötü' },
  { score: 2, emoji: '😕', label: 'Kötü' },
  { score: 3, emoji: '😐', label: 'Orta' },
  { score: 4, emoji: '🙂', label: 'İyi' },
  { score: 5, emoji: '😄', label: 'Harika' },
];

export function MoodCheckin({ userId }: { userId: string }) {
  const [selected, setSelected] = useState<number | null>(null);
  const [saved, setSaved] = useState(false);

  const handleSelect = async (score: number) => {
    setSelected(score);
    try {
      const apiUrl = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3001';
      await fetch(`${apiUrl}/mood`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-clerk-user-id': userId,
        },
        body: JSON.stringify({ score }),
      });
      setSaved(true);
    } catch {
      // silent fail
    }
  };

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6">
      <p className="text-gray-400 text-sm mb-4">Bugün nasıl hissediyorsun?</p>
      <div className="flex gap-3 flex-wrap">
        {MOODS.map(({ score, emoji, label }) => (
          <motion.button
            key={score}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => void handleSelect(score)}
            className={`flex flex-col items-center gap-1 px-4 py-3 rounded-2xl border transition-all ${
              selected === score
                ? 'border-violet-500/50 bg-violet-500/10 text-violet-300'
                : 'border-white/5 bg-white/[0.02] text-gray-400 hover:border-white/10'
            }`}
          >
            <span className="text-2xl">{emoji}</span>
            <span className="text-xs font-medium">{label}</span>
          </motion.button>
        ))}
      </div>
      {saved && (
        <motion.p
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-3 text-sm text-emerald-400"
        >
          Kaydedildi!
        </motion.p>
      )}
    </div>
  );
}

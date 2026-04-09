'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, Circle, Target } from 'lucide-react';

export function GoalsList({ goals }: { goals: string[] }) {
  const [checked, setChecked] = useState<Record<number, boolean>>({});

  const toggle = (i: number) => setChecked((prev) => ({ ...prev, [i]: !prev[i] }));

  if (goals.length === 0) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-12 text-center">
        <Target size={32} className="text-gray-600 mx-auto mb-3" />
        <p className="text-gray-400">Henüz hedefiniz yok.</p>
        <p className="text-gray-600 text-sm mt-1">Hedeflerinizi onboarding sırasında ekleyebilirsiniz.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {goals.map((goal, i) => (
        <motion.button
          key={i}
          onClick={() => toggle(i)}
          whileHover={{ x: 4 }}
          className={`flex items-center gap-4 p-5 rounded-2xl border text-left transition-all ${
            checked[i]
              ? 'border-emerald-500/20 bg-emerald-500/5 text-gray-400'
              : 'border-white/10 bg-white/[0.02] text-white hover:border-violet-500/20'
          }`}
        >
          {checked[i]
            ? <CheckCircle2 size={22} className="text-emerald-400 flex-shrink-0" />
            : <Circle size={22} className="text-gray-600 flex-shrink-0" />
          }
          <span className={`font-medium ${checked[i] ? 'line-through text-gray-500' : ''}`}>
            {goal}
          </span>
        </motion.button>
      ))}
    </div>
  );
}

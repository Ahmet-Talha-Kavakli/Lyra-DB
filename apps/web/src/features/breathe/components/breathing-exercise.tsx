'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface Phase { label: string; dur: number; }
interface Exercise { name: string; description: string; phases: Phase[]; }

const EXERCISES: Record<string, Exercise> = {
  '4-7-8': {
    name: '4-7-8 Nefes',
    description: 'Kaygıyı azaltmak ve uykuya yardımcı olmak için.',
    phases: [
      { label: 'Nefes Al', dur: 4 },
      { label: 'Tut', dur: 7 },
      { label: 'Nefes Ver', dur: 8 },
    ],
  },
  box: {
    name: 'Kutu Nefes',
    description: 'Odaklanmak ve stresi azaltmak için.',
    phases: [
      { label: 'Nefes Al', dur: 4 },
      { label: 'Tut', dur: 4 },
      { label: 'Nefes Ver', dur: 4 },
      { label: 'Tut', dur: 4 },
    ],
  },
  calm: {
    name: 'Sakinleştirici Nefes',
    description: 'Anlık kaygıyı hızlıca azaltmak için.',
    phases: [
      { label: 'Nefes Al', dur: 5 },
      { label: 'Nefes Ver', dur: 6 },
    ],
  },
};

export function BreathingExercise() {
  const [selected, setSelected] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [phaseIdx, setPhaseIdx] = useState(0);
  const [countdown, setCountdown] = useState(0);
  const [rounds, setRounds] = useState(0);

  const exercise = selected ? EXERCISES[selected] : null;
  const phase = exercise?.phases[phaseIdx];

  useEffect(() => {
    if (!running || !exercise || !phase) return;
    setCountdown(phase.dur);
    const tick = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          clearInterval(tick);
          const nextIdx = (phaseIdx + 1) % exercise.phases.length;
          setPhaseIdx(nextIdx);
          if (nextIdx === 0) setRounds((r) => r + 1);
          return 0;
        }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(tick);
  }, [running, phaseIdx, exercise, phase]);

  const start = (key: string) => {
    setSelected(key);
    setPhaseIdx(0);
    setRounds(0);
    setCountdown(EXERCISES[key]!.phases[0]!.dur);
    setRunning(true);
  };

  const stop = () => {
    setRunning(false);
    setSelected(null);
    setPhaseIdx(0);
    setRounds(0);
  };

  const isInhale = phase?.label === 'Nefes Al';
  const scale = running ? (isInhale ? 1.5 : 1) : 1;

  if (running && exercise && phase) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[500px] gap-8">
        <p className="text-gray-400 text-sm">{exercise.name} • {rounds} tur</p>
        <div className="relative flex items-center justify-center">
          <motion.div
            animate={{ scale }}
            transition={{ duration: phase.dur, ease: 'easeInOut' }}
            className="w-48 h-48 rounded-full bg-gradient-to-br from-violet-500/30 to-cyan-500/20 border border-violet-500/30 flex flex-col items-center justify-center"
          >
            <p className="text-white font-semibold text-lg">{phase.label}</p>
            <p className="text-violet-300 text-3xl font-bold mt-1">{countdown}</p>
          </motion.div>
          {/* Outer glow ring */}
          <motion.div
            animate={{ scale: scale * 1.15, opacity: isInhale ? 0.4 : 0.1 }}
            transition={{ duration: phase.dur, ease: 'easeInOut' }}
            className="absolute w-48 h-48 rounded-full bg-violet-500/10 border border-violet-500/20"
          />
        </div>
        <button onClick={stop} className="text-sm text-gray-500 hover:text-gray-300 transition-colors mt-4">
          Durdur
        </button>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 max-w-2xl">
      {Object.entries(EXERCISES).map(([key, ex]) => (
        <button
          key={key}
          onClick={() => start(key)}
          className="text-left rounded-2xl border border-white/10 bg-white/[0.02] p-6 hover:border-violet-500/30 hover:bg-violet-500/5 transition-all group"
        >
          <h3 className="text-white font-semibold mb-2 group-hover:text-violet-300 transition-colors">
            {ex.name}
          </h3>
          <p className="text-gray-500 text-sm">{ex.description}</p>
          <p className="text-gray-600 text-xs mt-3">
            {ex.phases.map((p) => `${p.dur}s`).join(' · ')}
          </p>
        </button>
      ))}
    </div>
  );
}

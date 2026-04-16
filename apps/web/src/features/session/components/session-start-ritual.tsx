'use client';

import { useEffect, useState } from 'react';

interface SessionStartRitualProps {
  phase: 'idle' | 'connecting';
}

/**
 * Full-screen breathing ritual shown while the session is connecting.
 *
 * An expanding/contracting circle guides the user through a calming breath
 * cycle (4s in, 4s out) so they arrive at the session in a regulated state.
 * Fades out automatically once phase transitions to 'active'.
 */
export function SessionStartRitual({ phase }: SessionStartRitualProps) {
  const [inhale, setInhale] = useState(false);
  const [label, setLabel]   = useState('Get comfortable');

  // Breathing cycle: 4 s inhale, 4 s exhale
  useEffect(() => {
    // Start breathing after a short settling pause
    const delay = setTimeout(() => {
      setInhale(true);
      setLabel('Breathe in');
    }, 1200);

    const interval = setInterval(() => {
      setInhale((prev) => {
        const next = !prev;
        setLabel(next ? 'Breathe in' : 'Breathe out');
        return next;
      });
    }, 4000);

    return () => {
      clearTimeout(delay);
      clearInterval(interval);
    };
  }, []);

  return (
    <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-gray-950/95 backdrop-blur-sm">
      {/* Brand */}
      <div className="mb-14 text-center">
        <p className="text-xs font-medium uppercase tracking-[0.35em] text-violet-400">
          Lyra
        </p>
        <h2 className="mt-2 text-lg font-light tracking-widest text-white">
          {phase === 'connecting' ? 'Preparing your space' : 'Welcome'}
        </h2>
      </div>

      {/* Breathing animation — three concentric rings */}
      <div className="relative flex items-center justify-center">
        {/* Outer ring */}
        <div
          className={`absolute rounded-full border border-violet-500/20 transition-all ease-in-out ${
            inhale ? 'h-52 w-52' : 'h-32 w-32'
          }`}
          style={{ transitionDuration: '3800ms' }}
        />
        {/* Middle ring */}
        <div
          className={`absolute rounded-full border border-violet-400/35 bg-violet-500/5 transition-all ease-in-out ${
            inhale ? 'h-40 w-40' : 'h-24 w-24'
          }`}
          style={{ transitionDuration: '3800ms' }}
        />
        {/* Inner core */}
        <div
          className={`rounded-full bg-violet-500/25 border border-violet-400/60 transition-all ease-in-out ${
            inhale ? 'h-20 w-20' : 'h-10 w-10'
          }`}
          style={{ transitionDuration: '3800ms' }}
        />
        {/* Centre dot */}
        <div className="absolute h-2.5 w-2.5 rounded-full bg-violet-400" />
      </div>

      {/* Breathe instruction */}
      <p
        className={`mt-10 text-xs font-medium tracking-[0.3em] uppercase transition-all duration-700 ${
          inhale ? 'text-violet-300 opacity-100' : 'text-gray-500 opacity-80'
        }`}
      >
        {label}
      </p>

      {/* Connection status */}
      {phase === 'connecting' && (
        <div className="mt-14 flex items-center gap-2.5">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-violet-400" />
          <span className="text-xs text-gray-500 tracking-wide">
            Connecting to Lyra…
          </span>
        </div>
      )}
    </div>
  );
}

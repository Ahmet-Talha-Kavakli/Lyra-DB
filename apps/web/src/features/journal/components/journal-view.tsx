'use client';

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Caveat } from 'next/font/google';
import { PlusCircle } from 'lucide-react';

const caveat = Caveat({ subsets: ['latin'], weight: ['400', '600'] });

interface JournalEntry {
  id: string;
  entryDate: string;
  content: string;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('tr-TR', {
    day: 'numeric', month: 'long', year: 'numeric',
  });
}

function todayISO() {
  return new Date().toISOString().split('T')[0]!;
}

export function JournalView({ entries: initialEntries, userId }: { entries: JournalEntry[]; userId: string }) {
  const today = todayISO();
  const [entries, setEntries] = useState<JournalEntry[]>(initialEntries);
  const [selectedDate, setSelectedDate] = useState<string>(today);
  const [saving, setSaving] = useState(false);

  const currentEntry = entries.find(
    (e) => e.entryDate.split('T')[0] === selectedDate,
  );
  const [content, setContent] = useState(currentEntry?.content ?? '');

  const selectEntry = (date: string) => {
    setSelectedDate(date);
    const entry = entries.find((e) => e.entryDate.split('T')[0] === date);
    setContent(entry?.content ?? '');
  };

  const save = useCallback(
    async (text: string) => {
      setSaving(true);
      try {
        const apiUrl = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3001';
        const res = await fetch(`${apiUrl}/journal`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'x-clerk-user-id': userId,
          },
          body: JSON.stringify({ date: selectedDate, content: text }),
        });
        if (res.ok) {
          const saved = await res.json() as JournalEntry;
          setEntries((prev) => {
            const idx = prev.findIndex((e) => e.entryDate.split('T')[0] === selectedDate);
            if (idx >= 0) {
              const next = [...prev];
              next[idx] = saved;
              return next;
            }
            return [saved, ...prev];
          });
        }
      } finally {
        setSaving(false);
      }
    },
    [selectedDate, userId],
  );

  let saveTimer: ReturnType<typeof setTimeout> | null = null;
  const handleChange = (text: string) => {
    setContent(text);
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(() => { void save(text); }, 1200);
  };

  const hasTodayEntry = entries.some((e) => e.entryDate.split('T')[0] === today);

  return (
    <div className="px-8 py-10">
      <h1 className="text-2xl font-bold text-white mb-6">Günlük</h1>
      <div className="flex gap-0 rounded-3xl overflow-hidden border border-white/10 min-h-[600px] bg-[#0f0e1a]">
        {/* Left page — entry list */}
        <div className="w-64 flex-shrink-0 border-r border-white/5 p-5 flex flex-col gap-2 bg-[#0d0c18]">
          {!hasTodayEntry && (
            <button
              onClick={() => selectEntry(today)}
              className="flex items-center gap-2 text-sm text-violet-400 hover:text-violet-300 mb-2 transition-colors"
            >
              <PlusCircle size={16} />
              Bugün yaz
            </button>
          )}
          {[...(hasTodayEntry ? [] : [{ id: 'today', entryDate: today, content: '' }]), ...entries].map((e) => {
            const date = e.entryDate.split('T')[0]!;
            const isSelected = date === selectedDate;
            return (
              <button
                key={date}
                onClick={() => selectEntry(date)}
                className={`text-left px-3 py-2 rounded-xl text-sm transition-all ${
                  isSelected
                    ? 'bg-violet-500/15 text-violet-300'
                    : 'text-gray-500 hover:text-gray-300 hover:bg-white/5'
                }`}
              >
                {formatDate(e.entryDate)}
              </button>
            );
          })}
        </div>

        {/* Right page — editor */}
        <div className="flex-1 relative">
          <AnimatePresence mode="wait">
            <motion.div
              key={selectedDate}
              initial={{ x: 40, opacity: 0, rotateY: 5 }}
              animate={{ x: 0, opacity: 1, rotateY: 0 }}
              exit={{ x: -40, opacity: 0, rotateY: -5 }}
              transition={{ duration: 0.2 }}
              className="h-full p-8"
              style={{ perspective: '800px' }}
            >
              {/* Date heading */}
              <p className={`${caveat.className} text-violet-400 text-xl mb-4`}>
                {formatDate(selectedDate)}
              </p>

              {/* Lined paper background + textarea */}
              <div
                className="relative rounded-xl overflow-hidden"
                style={{
                  backgroundImage:
                    'repeating-linear-gradient(transparent, transparent 31px, rgba(255,255,255,0.04) 31px, rgba(255,255,255,0.04) 32px)',
                  minHeight: '480px',
                }}
              >
                <textarea
                  value={content}
                  onChange={(e) => handleChange(e.target.value)}
                  placeholder="Bugün neler hissettin? Aklında neler var..."
                  className={`${caveat.className} w-full h-full min-h-[480px] bg-transparent text-gray-200 text-lg leading-8 resize-none focus:outline-none p-4 placeholder:text-gray-700`}
                />
              </div>

              {/* Save indicator */}
              {saving && (
                <p className="absolute bottom-4 right-6 text-xs text-gray-600">Kaydediliyor...</p>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

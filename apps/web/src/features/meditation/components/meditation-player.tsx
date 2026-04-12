'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Clock } from 'lucide-react';

interface Track {
  id: string;
  title: string;
  duration: string;
  youtubeId: string;
  category: string;
  description: string;
  color: string;
}

const TRACKS: Track[] = [
  // Doğa Sesleri
  {
    id: '1',
    title: 'Yağmur Sesi',
    duration: '3 saat',
    youtubeId: 'mPZkdNFkNps',
    category: 'doga',
    description: 'Hafif yağmur ve doğa sesleri',
    color: 'from-blue-500/20 to-cyan-500/10',
  },
  {
    id: '2',
    title: 'Orman Sesi',
    duration: '8 saat',
    youtubeId: 'xNN7iTA57jM',
    category: 'doga',
    description: 'Kuşlar ve orman ambiyansı',
    color: 'from-emerald-500/20 to-green-500/10',
  },
  {
    id: '3',
    title: 'Okyanus Dalgaları',
    duration: '4 saat',
    youtubeId: 'BHACKCNDMW8',
    category: 'doga',
    description: 'Sakin deniz ve dalga sesleri',
    color: 'from-sky-500/20 to-blue-500/10',
  },
  // Uyku
  {
    id: '4',
    title: 'Derin Uyku Müziği',
    duration: '8 saat',
    youtubeId: 'lTRiuFIWV54',
    category: 'uyku',
    description: 'Yumuşak uyku ve dinlenme müziği',
    color: 'from-indigo-500/20 to-violet-500/10',
  },
  {
    id: '11',
    title: 'Piyano Uyku Müziği',
    duration: '3 saat',
    youtubeId: 'APTPaLBOThe',
    category: 'uyku',
    description: 'Yumuşak piyano ile derin uyku',
    color: 'from-violet-500/20 to-purple-500/10',
  },
  {
    id: '12',
    title: 'Yağmurda Uyku',
    duration: '8 saat',
    youtubeId: 'nMfPqeZjc2c',
    category: 'uyku',
    description: 'Yağmur sesi eşliğinde uyku müziği',
    color: 'from-slate-500/20 to-blue-500/10',
  },
  {
    id: '13',
    title: 'Delta Dalgaları',
    duration: '8 saat',
    youtubeId: 'A7ZTCiKgGUE',
    category: 'uyku',
    description: 'Derin uyku için delta frekansı',
    color: 'from-blue-900/30 to-indigo-500/10',
  },
  {
    id: '14',
    title: 'Şelale Sesi',
    duration: '10 saat',
    youtubeId: 'uo53Zw8CZUY',
    category: 'uyku',
    description: 'Sakinleştirici şelale ve orman sesi',
    color: 'from-teal-500/20 to-emerald-500/10',
  },
  // Ambient
  {
    id: '5',
    title: 'Tibet Şifa Sesleri',
    duration: '3 saat',
    youtubeId: 'FJJvO69bkmc',
    category: 'ambient',
    description: 'Tibetan kase ve meditasyon sesleri',
    color: 'from-amber-500/20 to-orange-500/10',
  },
  {
    id: '6',
    title: 'Uzay Ambiyansı',
    duration: '2 saat',
    youtubeId: 'H-iCZElJ8m0',
    category: 'ambient',
    description: 'Sakinleştirici uzay sesleri',
    color: 'from-purple-500/20 to-indigo-500/10',
  },
  // Binaural
  {
    id: '7',
    title: 'Alpha Dalgaları',
    duration: '3 saat',
    youtubeId: 'WPni755-Krg',
    category: 'binaural',
    description: 'Odaklanma ve rahatlama için alpha frekans',
    color: 'from-teal-500/20 to-cyan-500/10',
  },
  {
    id: '8',
    title: 'Theta Dalgaları',
    duration: '3 saat',
    youtubeId: 'A2sS6O7GGEM',
    category: 'binaural',
    description: 'Derin meditasyon için theta frekans',
    color: 'from-violet-500/20 to-purple-500/10',
  },
  // Lo-fi
  {
    id: '9',
    title: 'Lo-fi Çalışma',
    duration: 'Canlı',
    youtubeId: 'jfKfPfyJRdk',
    category: 'lofi',
    description: 'Rahatlatıcı lo-fi beats',
    color: 'from-pink-500/20 to-rose-500/10',
  },
  {
    id: '10',
    title: 'Kafe Ambiyansı',
    duration: '2 saat',
    youtubeId: 'gaGrAZzANfI',
    category: 'lofi',
    description: 'Hafif kafe müziği ve gürültüsü',
    color: 'from-amber-500/20 to-yellow-500/10',
  },
];

const CATEGORIES = [
  { id: 'all',      label: 'Tümü',          emoji: '✨' },
  { id: 'doga',     label: 'Doğa Sesleri',  emoji: '🌿' },
  { id: 'uyku',     label: 'Uyku',          emoji: '🌙' },
  { id: 'ambient',  label: 'Ambient',       emoji: '🌌' },
  { id: 'binaural', label: 'Binaural',      emoji: '🎧' },
  { id: 'lofi',     label: 'Lo-fi',         emoji: '🎵' },
];

export function MeditationPlayer() {
  const [activeCategory, setActiveCategory] = useState('all');
  const [playing, setPlaying] = useState<Track | null>(null);

  const filtered =
    activeCategory === 'all'
      ? TRACKS
      : TRACKS.filter((t) => t.category === activeCategory);

  return (
    <div className="flex flex-col gap-8">
      {/* Player */}
      <AnimatePresence mode="wait">
        {playing ? (
          <motion.div
            key={playing.id}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.25 }}
            className="rounded-3xl overflow-hidden border border-white/10 bg-[#0f0e1a]"
          >
            {/* Ambient glow header */}
            <div className={`relative h-16 bg-gradient-to-r ${playing.color} flex items-center px-6 gap-4`}>
              <div className="flex-1">
                <p className="text-white font-semibold">{playing.title}</p>
                <p className="text-gray-400 text-xs">{playing.description}</p>
              </div>
              <button
                onClick={() => setPlaying(null)}
                className="text-gray-400 hover:text-white text-xs transition-colors"
              >
                Kapat
              </button>
            </div>

            {/* YouTube iframe */}
            <div className="relative w-full" style={{ paddingTop: '56.25%' }}>
              <iframe
                key={playing.youtubeId}
                src={`https://www.youtube-nocookie.com/embed/${playing.youtubeId}?autoplay=1&rel=0&modestbranding=1&controls=1`}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="absolute inset-0 w-full h-full"
              />
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="placeholder"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="rounded-3xl border border-white/5 bg-white/[0.02] h-36 flex flex-col items-center justify-center gap-2"
          >
            <div className="w-10 h-10 rounded-full bg-violet-500/10 flex items-center justify-center">
              <Play size={18} className="text-violet-400 ml-0.5" />
            </div>
            <p className="text-gray-500 text-sm">Bir parça seç</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Category tabs */}
      <div className="flex gap-2 flex-wrap">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setActiveCategory(cat.id)}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
              activeCategory === cat.id
                ? 'bg-violet-500/20 text-violet-300 border border-violet-500/30'
                : 'text-gray-500 hover:text-gray-300 border border-white/5 hover:border-white/10'
            }`}
          >
            <span>{cat.emoji}</span>
            {cat.label}
          </button>
        ))}
      </div>

      {/* Track grid */}
      <motion.div
        layout
        className="grid grid-cols-1 gap-3 sm:grid-cols-2"
      >
        <AnimatePresence>
          {filtered.map((track) => (
            <motion.button
              key={track.id}
              layout
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.15 }}
              onClick={() => setPlaying(track)}
              className={`group text-left rounded-2xl border p-5 transition-all ${
                playing?.id === track.id
                  ? 'border-violet-500/40 bg-violet-500/10'
                  : 'border-white/5 bg-white/[0.02] hover:border-white/10 hover:bg-white/[0.04]'
              }`}
            >
              {/* Color bar */}
              <div className={`w-8 h-1.5 rounded-full bg-gradient-to-r ${track.color.replace('/20', '').replace('/10', '')} mb-4 opacity-70`} />

              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className={`font-semibold text-sm mb-1 transition-colors ${
                    playing?.id === track.id ? 'text-violet-300' : 'text-white group-hover:text-violet-300'
                  }`}>
                    {track.title}
                  </p>
                  <p className="text-gray-500 text-xs">{track.description}</p>
                </div>
                <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                  playing?.id === track.id
                    ? 'bg-violet-500/30'
                    : 'bg-white/5 group-hover:bg-violet-500/20'
                }`}>
                  <Play size={14} className={`ml-0.5 ${playing?.id === track.id ? 'text-violet-300' : 'text-gray-400 group-hover:text-violet-300'}`} />
                </div>
              </div>

              <div className="flex items-center gap-1 mt-3">
                <Clock size={11} className="text-gray-600" />
                <span className="text-gray-600 text-xs">{track.duration}</span>
              </div>
            </motion.button>
          ))}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}

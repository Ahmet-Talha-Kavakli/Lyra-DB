import { create } from 'zustand';

interface MoodEntry {
  value: number;     // 1-10 scale
  label: string;     // e.g. "happy", "anxious", "calm"
  note?: string;
  createdAt: string;
}

interface MoodState {
  todayMood: MoodEntry | null;
  recentMoods: MoodEntry[];

  setTodayMood: (mood: MoodEntry) => void;
  setRecentMoods: (moods: MoodEntry[]) => void;
  reset: () => void;
}

export const useMoodStore = create<MoodState>((set) => ({
  todayMood: null,
  recentMoods: [],

  setTodayMood: (todayMood) => set({ todayMood }),
  setRecentMoods: (recentMoods) => set({ recentMoods }),
  reset: () => set({ todayMood: null, recentMoods: [] }),
}));

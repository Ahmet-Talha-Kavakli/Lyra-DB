import { create } from 'zustand';
import type { TEmotionLabel, ICrisisSignal } from '@ai-therapist/types';

type TSessionPhase = 'idle' | 'connecting' | 'active' | 'ended';

interface SessionState {
  // Session metadata
  sessionId: string | null;
  phase: TSessionPhase;

  // Conversation
  transcript: string;
  aiResponseChunks: string[];
  conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }>;

  // Avatar state
  isAvatarSpeaking: boolean;
  avatarAudioSrc: string | null;

  // Emotion / vision
  currentEmotion: TEmotionLabel;
  emotionScore: number;
  activeCrisis: ICrisisSignal | null;

  // Crisis
  lastCrisisScore: number;

  // Vision (GPT-4o periodic webcam analysis)
  visionContext: string | null;
  setVisionContext: (ctx: string | null) => void;

  // Data channel messages (raw)
  lastDataMessage: string | null;

  // Actions
  setSessionId: (id: string) => void;
  setLastCrisisScore: (score: number) => void;
  setPhase: (phase: TSessionPhase) => void;
  setTranscript: (text: string) => void;
  appendAiChunk: (chunk: string) => void;
  flushAiResponse: () => void;
  setAvatarSpeaking: (speaking: boolean) => void;
  setAvatarAudioSrc: (src: string | null) => void;
  setCurrentEmotion: (emotion: TEmotionLabel, score: number) => void;
  setActiveCrisis: (signal: ICrisisSignal | null) => void;
  addDataMessage: (msg: string) => void;
  reset: () => void;
}

const INITIAL_STATE = {
  sessionId: null,
  phase: 'idle' as TSessionPhase,
  transcript: '',
  aiResponseChunks: [] as string[],
  conversationHistory: [] as Array<{ role: 'user' | 'assistant'; content: string }>,
  isAvatarSpeaking: false,
  avatarAudioSrc: null,
  currentEmotion: 'neutral' as TEmotionLabel,
  emotionScore: 0,
  activeCrisis: null,
  lastCrisisScore: 0,
  lastDataMessage: null,
  visionContext: null,
};

export const useSessionStore = create<SessionState>((set, get) => ({
  ...INITIAL_STATE,

  setSessionId: (id) => set({ sessionId: id }),

  setPhase: (phase) => set({ phase }),

  setTranscript: (text) => set({ transcript: text }),

  appendAiChunk: (chunk) =>
    set((state) => ({ aiResponseChunks: [...state.aiResponseChunks, chunk] })),

  flushAiResponse: () => {
    const { aiResponseChunks, conversationHistory, transcript } = get();
    const fullResponse = aiResponseChunks.join('');
    if (!fullResponse) return;

    set({
      aiResponseChunks: [],
      transcript: '',
      conversationHistory: [
        ...conversationHistory,
        { role: 'user', content: transcript },
        { role: 'assistant', content: fullResponse },
      ],
    });
  },

  setAvatarSpeaking: (speaking) => set({ isAvatarSpeaking: speaking }),

  setAvatarAudioSrc: (src) => set({ avatarAudioSrc: src }),

  setCurrentEmotion: (emotion, score) => set({ currentEmotion: emotion, emotionScore: score }),

  setActiveCrisis: (signal) => set({ activeCrisis: signal }),

  setLastCrisisScore: (score) => set({ lastCrisisScore: score }),

  addDataMessage: (msg) => set({ lastDataMessage: msg }),

  setVisionContext: (ctx) => set({ visionContext: ctx }),

  reset: () => set(INITIAL_STATE),
}));

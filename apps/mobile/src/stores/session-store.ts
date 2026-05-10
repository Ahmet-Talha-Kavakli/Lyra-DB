import { create } from 'zustand';

type SessionStatus = 'idle' | 'connecting' | 'active' | 'paused' | 'ended';

interface SessionState {
  sessionId: string | null;
  status: SessionStatus;
  isListening: boolean;
  isSpeaking: boolean;
  currentEmotion: string | null;

  // Actions
  startSession: (sessionId: string) => void;
  endSession: () => void;
  setStatus: (status: SessionStatus) => void;
  setListening: (listening: boolean) => void;
  setSpeaking: (speaking: boolean) => void;
  setEmotion: (emotion: string | null) => void;
  reset: () => void;
}

const initialState = {
  sessionId: null,
  status: 'idle' as SessionStatus,
  isListening: false,
  isSpeaking: false,
  currentEmotion: null,
};

export const useSessionStore = create<SessionState>((set) => ({
  ...initialState,

  startSession: (sessionId) => set({ sessionId, status: 'connecting' }),
  endSession: () => set({ ...initialState, status: 'ended' }),
  setStatus: (status) => set({ status }),
  setListening: (isListening) => set({ isListening }),
  setSpeaking: (isSpeaking) => set({ isSpeaking }),
  setEmotion: (currentEmotion) => set({ currentEmotion }),
  reset: () => set(initialState),
}));

'use client';

import { useEffect, useCallback, useRef, useState } from 'react';
import { useAuth, useUser } from '@clerk/nextjs';
import dynamic from 'next/dynamic';
import { useSessionStore } from '../session.store';
import { useSocketSession } from '../hooks/use-socket-session';
import { useSpeechRecognition } from '../hooks/use-speech-recognition';
import { useCrisisDetector } from '../hooks/use-crisis-detector';
import { SessionHeader } from './session-header';
import { TranscriptPanel } from './transcript-panel';
import { SessionControls } from './session-controls';
import { CrisisOverlay } from './crisis-overlay';
import { SessionStartRitual } from './session-start-ritual';
import { SessionSummary } from './session-summary';
import { UserCamera } from '@/features/vision/components/user-camera';
import { ttsAudio } from '@/features/session/tts-audio';
import type { TEmotionLabel } from '@ai-therapist/types';

/** Avatar uses WebGL — must be client-only. */
const AvatarCanvas = dynamic(
  () => import('@/features/avatar').then((m) => ({ default: m.AvatarCanvas })),
  {
    ssr:     false,
    loading: () => <div className="h-full w-full bg-gray-900" />,
  },
);

const EMOTION_EMOJI: Record<TEmotionLabel, string> = {
  neutral:   '😐',
  happy:     '😊',
  sad:       '😢',
  angry:     '😠',
  fearful:   '😨',
  disgusted: '😒',
  surprised: '😮',
  contempt:  '😶',
};

interface SessionViewProps {
  roomName: string;
}

export function SessionView({ roomName }: SessionViewProps) {
  // Chat panel default closed — immersive avatar experience first
  const [chatOpen, setChatOpen] = useState(false);

  const { userId } = useAuth();
  const { user }   = useUser();
  const userName   = user?.firstName ?? user?.username ?? 'there';

  const phase               = useSessionStore((s) => s.phase);
  const sessionId           = useSessionStore((s) => s.sessionId);
  const conversationHistory = useSessionStore((s) => s.conversationHistory);
  const currentEmotion      = useSessionStore((s) => s.currentEmotion);
  const emotionScore        = useSessionStore((s) => s.emotionScore);
  const visionContext       = useSessionStore((s) => s.visionContext);
  const lastCrisisScore     = useSessionStore((s) => s.lastCrisisScore);
  const avatarAudioSrc      = useSessionStore((s) => s.avatarAudioSrc);
  const setAvatarSpeaking   = useSessionStore((s) => s.setAvatarSpeaking);

  const audioRef       = useRef<HTMLAudioElement | null>(null);
  const sessionStartAt = useRef<number>(0);

  const { connect, startSession, sendMessage, endSession, disconnect } = useSocketSession();

  useCrisisDetector({ crisisScore: lastCrisisScore });

  // ── TTS audio playback ────────────────────────────────────────────────────
  // Plays each TTS chunk, mutes STT while speaking, drives lip sync via
  // Web Audio API, and guarantees mic is unmuted even on error/timeout.
  useEffect(() => {
    if (!avatarAudioSrc) return;

    // Stop any current audio
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }

    const audio = new Audio(avatarAudioSrc);
    audioRef.current = audio;

    // Wire to Web Audio context so lip sync hook can analyse frequencies
    ttsAudio.connect(audio);

    setMutedRef.current(true);
    setAvatarSpeaking(true);

    const unmute = () => {
      setMutedRef.current(false);
      setAvatarSpeaking(false);
    };

    audio.addEventListener('ended', unmute);
    audio.addEventListener('error', unmute);

    // Safety valve: never stay muted for more than 90 s
    const safetyTimer = setTimeout(unmute, 90_000);

    audio.play().catch(() => unmute());

    return () => {
      clearTimeout(safetyTimer);
      audio.removeEventListener('ended', unmute);
      audio.removeEventListener('error', unmute);
      audio.pause();
      unmute();
    };
  }, [avatarAudioSrc, setAvatarSpeaking]);

  // Track session start time for duration display in summary
  useEffect(() => {
    if (phase === 'active') sessionStartAt.current = Date.now();
  }, [phase]);

  // ── STT → send message ────────────────────────────────────────────────────
  const handleFinalTranscript = useCallback(
    (transcript: string) => {
      if (!sessionId || !userId) return;
      sendMessage({
        clerkUserId: userId,
        userName,
        sessionId,
        transcript,
        emotion: {
          timestamp:       Date.now(),
          dominant:        currentEmotion,
          scores:          {
            neutral: 0, happy: 0, sad: 0, angry: 0,
            fearful: 0, disgusted: 0, surprised: 0, contempt: 0,
            [currentEmotion]: emotionScore,
          },
          fatigueScore:    0,
          eyeContactScore: 0,
        },
        visionContext,
        conversationHistory,
      });
    },
    [sessionId, userId, userName, currentEmotion, emotionScore, visionContext, conversationHistory, sendMessage],
  );

  // Detect session language:
  // 1. If ANY user message contains "speak turkish" / "türkçe" → switch to tr-TR
  // 2. Else if last AI response contains Turkish chars → tr-TR (already switched)
  // 3. Default → en-US
  const lastAiContent  = conversationHistory.filter((m) => m.role === 'assistant').at(-1)?.content ?? '';
  const allUserContent = conversationHistory.filter((m) => m.role === 'user').map((m) => m.content).join(' ');
  const userRequestedTurkish = /speak\s+turkish|türkçe\s+konuş|türkçe|switch\s+to\s+turkish/i.test(allUserContent);
  const sttLang = (userRequestedTurkish || /[ğüöçışĞÜÖÇİŞ]/.test(lastAiContent)) ? 'tr-TR' : 'en-US';

  const { muted, setMuted } = useSpeechRecognition({ onFinalTranscript: handleFinalTranscript, lang: sttLang });
  const setMutedRef = useRef(setMuted);
  useEffect(() => { setMutedRef.current = setMuted; }, [setMuted]);

  // Connect and start session on mount
  useEffect(() => {
    if (!userId) return;
    connect();
    const id = setTimeout(() => startSession(userId, userName), 300);
    return () => { clearTimeout(id); disconnect(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, roomName]);

  const handleEnd = useCallback(() => {
    if (!sessionId || !userId) { disconnect(); return; }
    endSession(sessionId, userId, conversationHistory);
    disconnect();
  }, [sessionId, userId, conversationHistory, endSession, disconnect]);

  // ── Derived display values ────────────────────────────────────────────────
  const sessionDurationMs = phase === 'ended' && sessionStartAt.current > 0
    ? Date.now() - sessionStartAt.current
    : 0;

  const lastLyraMessage = conversationHistory
    .filter((m) => m.role === 'assistant')
    .at(-1)?.content ?? null;

  const showRitual  = phase === 'idle' || phase === 'connecting';
  const showSummary = phase === 'ended';

  return (
    <div className="flex h-screen flex-col bg-gray-950 text-white">
      {/* Crisis overlay renders above everything */}
      <CrisisOverlay />

      <SessionHeader />

      <main className="flex flex-1 overflow-hidden">
        {/* ── Left column: Lyra full-height + UserCamera PiP ──────────────── */}
        <section className="relative flex-1 overflow-hidden bg-gray-900">

          {showSummary ? (
            <SessionSummary
              durationMs={sessionDurationMs}
              lastLyraMessage={lastLyraMessage}
            />
          ) : (
            <>
              {/* Avatar fills the full section height */}
              <AvatarCanvas />

              {/* "Lyra" identity badge — top left */}
              <div className="absolute left-3 top-3 z-10 flex items-center gap-2 rounded-full bg-black/55 px-3 py-1.5 backdrop-blur-sm">
                <span className="h-2 w-2 animate-pulse rounded-full bg-violet-400" />
                <span className="text-xs font-medium text-gray-200">Lyra</span>
              </div>

              {/* Current user emotion badge — top right (subtle, non-intrusive) */}
              {phase === 'active' && currentEmotion !== 'neutral' && (
                <div className="absolute right-3 top-3 z-10 rounded-full bg-black/55 px-3 py-1.5 text-xs text-gray-300 backdrop-blur-sm">
                  {EMOTION_EMOJI[currentEmotion]}&nbsp;{currentEmotion}
                </div>
              )}

              {/* User camera PiP — bottom left */}
              {phase !== 'idle' && (
                <div className="absolute bottom-20 left-4 z-10 h-28 w-36 overflow-hidden rounded-xl border border-gray-700/50 shadow-xl ring-1 ring-black/20">
                  <UserCamera />
                </div>
              )}

              {/* Start ritual overlay (connecting state) */}
              {showRitual && <SessionStartRitual phase={phase} />}
            </>
          )}
        </section>

        {/* ── Right: Collapsible conversation transcript ───────────────────── */}
        <div className="relative flex flex-shrink-0">
          {/* Toggle tab */}
          <button
            type="button"
            onClick={() => setChatOpen((o) => !o)}
            aria-label={chatOpen ? 'Hide conversation' : 'Show conversation'}
            className="absolute -left-6 top-1/2 z-20 flex h-12 w-6 -translate-y-1/2 items-center justify-center rounded-l-md border border-r-0 border-gray-700 bg-gray-800 transition-colors hover:bg-gray-700"
          >
            <span className="select-none text-sm text-gray-300">
              {chatOpen ? '›' : '‹'}
            </span>
          </button>

          <aside
            className={`flex flex-col overflow-hidden border-l border-gray-800 bg-gray-950 transition-[width] duration-300 ${
              chatOpen ? 'w-96' : 'w-0'
            }`}
          >
            <div className="flex h-full flex-col" style={{ width: '384px' }}>
              <div className="flex-shrink-0 border-b border-gray-800 px-4 py-3">
                <h2 className="text-sm font-medium text-gray-400">Conversation</h2>
              </div>
              <div className="flex-1 overflow-hidden">
                <TranscriptPanel />
              </div>
            </div>
          </aside>
        </div>
      </main>

      {phase === 'active' && (
        <footer className="border-t border-gray-800 bg-gray-900 px-6 py-4">
          <SessionControls
            muted={muted}
            onMuteToggle={() => setMuted((m) => !m)}
            onEnd={handleEnd}
          />
        </footer>
      )}
    </div>
  );
}

'use client';

import { useEffect, useCallback, useRef } from 'react';
import { useAuth, useUser } from '@clerk/nextjs';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { useSessionStore } from '../session.store';
import { useSocketSession } from '../hooks/use-socket-session';
import { useSpeechRecognition } from '../hooks/use-speech-recognition';
import { useCrisisDetector } from '../hooks/use-crisis-detector';
import { SessionHeader } from './session-header';
import { TranscriptPanel } from './transcript-panel';
import { SessionControls } from './session-controls';
import { CrisisOverlay } from './crisis-overlay';
import { UserCamera } from '@/features/vision/components/user-camera';

/**
 * AvatarCanvas uses WebGL — must be loaded client-side only.
 */
const AvatarCanvas = dynamic(
  () => import('@/features/avatar').then((m) => ({ default: m.AvatarCanvas })),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full w-full items-center justify-center bg-gray-900">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
      </div>
    ),
  },
);

interface SessionViewProps {
  roomName: string;
}

export function SessionView({ roomName }: SessionViewProps) {
  const { userId } = useAuth();
  const { user } = useUser();
  const userName = user?.firstName ?? user?.username ?? 'there';

  const phase               = useSessionStore((s) => s.phase);
  const sessionId           = useSessionStore((s) => s.sessionId);
  const conversationHistory = useSessionStore((s) => s.conversationHistory);
  const currentEmotion      = useSessionStore((s) => s.currentEmotion);
  const emotionScore        = useSessionStore((s) => s.emotionScore);
  const visionContext       = useSessionStore((s) => s.visionContext);
  const lastCrisisScore     = useSessionStore((s) => s.lastCrisisScore);

  const avatarAudioSrc = useSessionStore((s) => s.avatarAudioSrc);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const { connect, startSession, sendMessage, endSession, disconnect } = useSocketSession();

  // Crisis detection (AI score + emotion + keywords)
  useCrisisDetector({ crisisScore: lastCrisisScore });

  // Play TTS audio when avatarAudioSrc changes; mute mic while AI speaks
  useEffect(() => {
    if (!avatarAudioSrc) return;
    if (audioRef.current) {
      audioRef.current.pause();
    }
    const audio = new Audio(avatarAudioSrc);
    audioRef.current = audio;
    setMutedRef.current(true);                       // mute mic while AI speaks
    audio.onended = () => setMutedRef.current(false); // unmute when audio finishes
    audio.play().catch((err) => {
      console.warn('[TTS] Audio play failed:', err);
      setMutedRef.current(false);                    // unmute on error too
    });
    return () => { audio.pause(); };
  }, [avatarAudioSrc]);

  // STT → send message when final transcript arrives
  const handleFinalTranscript = useCallback((transcript: string) => {
    if (!sessionId || !userId) return;
    sendMessage({
      clerkUserId:         userId,
      userName,
      sessionId,
      transcript,
      emotion:             {
        timestamp:       Date.now(),
        dominant:        currentEmotion,
        scores:          { neutral: 0, happy: 0, sad: 0, angry: 0, fearful: 0, disgusted: 0, surprised: 0, contempt: 0, [currentEmotion]: emotionScore },
        fatigueScore:    0,
        eyeContactScore: 0,
      },
      visionContext,
      conversationHistory,
    });
  }, [sessionId, userId, currentEmotion, emotionScore, visionContext, conversationHistory, sendMessage]);

  // Auto-detect language from last AI response (Turkish chars → tr-TR)
  const lastAiContent = conversationHistory.filter((m) => m.role === 'assistant').at(-1)?.content ?? '';
  const sttLang = /[ğüöçışĞÜÖÇİŞ]/.test(lastAiContent) ? 'tr-TR' : 'en-US';

  const { muted, setMuted } = useSpeechRecognition({ onFinalTranscript: handleFinalTranscript, lang: sttLang });
  const setMutedRef = useRef(setMuted);
  useEffect(() => { setMutedRef.current = setMuted; }, [setMuted]);

  // Connect socket on mount; start session once connected
  useEffect(() => {
    if (!userId) return;
    connect();
    // Give socket a tick to connect before starting session
    const id = setTimeout(() => startSession(userId, userName), 300);
    return () => {
      clearTimeout(id);
      disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, roomName]);

  const handleEnd = useCallback(() => {
    if (!sessionId || !userId) {
      disconnect();
      return;
    }
    endSession(sessionId, userId, conversationHistory);
    disconnect();
  }, [sessionId, userId, conversationHistory, endSession, disconnect]);

  return (
    <div className="flex h-screen flex-col bg-gray-950 text-white">
      {/* Crisis overlay — renders on top of everything */}
      <CrisisOverlay />

      <SessionHeader />

      <main className="flex flex-1 overflow-hidden">
        {/* Left: 3D Avatar */}
        <section className="relative flex flex-1 bg-gray-900">
          {phase === 'connecting' && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-gray-900/80 backdrop-blur-sm">
              <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
              <p className="mt-3 text-sm text-gray-400">Connecting…</p>
            </div>
          )}

          {phase === 'ended' ? (
            <div className="flex h-full w-full flex-col items-center justify-center gap-4">
              <p className="text-lg text-gray-300">Session ended</p>
              <Link
                href="/dashboard"
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500"
              >
                Back to Dashboard
              </Link>
            </div>
          ) : (
            <>
              <AvatarCanvas />
              <UserCamera />
            </>
          )}
        </section>

        {/* Right: Conversation */}
        <aside className="flex w-96 flex-col border-l border-gray-800 bg-gray-950">
          <div className="border-b border-gray-800 px-4 py-3">
            <h2 className="text-sm font-medium text-gray-400">Conversation</h2>
          </div>
          <div className="flex-1 overflow-hidden">
            <TranscriptPanel />
          </div>
        </aside>
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

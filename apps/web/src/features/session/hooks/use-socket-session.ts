'use client';

import { useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { useSessionStore } from '../session.store';
import type { IEmotionSnapshot } from '@ai-therapist/types';

const SOCKET_URL =
  process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3001';

interface SendMessagePayload {
  clerkUserId:         string;
  userName:            string;
  sessionId:           string;
  transcript:          string;
  emotion?:            IEmotionSnapshot | null;
  visionContext?:      string | null;
  conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }>;
}

/**
 * Manages the Socket.IO connection to the NestJS /session gateway.
 *
 * Lifecycle:
 *   connect()   → socket connects, then you call startSession()
 *   startSession() → emits session:start → receives session:started { sessionId }
 *   sendMessage()  → emits session:message → receives ai:chunk / ai:audio / ai:done
 *   endSession()   → emits session:end → receives session:ended
 *   disconnect()   → tears down the socket
 */
export function useSocketSession() {
  const socketRef = useRef<Socket | null>(null);

  const {
    setSessionId,
    setPhase,
    appendAiChunk,
    flushAiResponse,
    setAvatarSpeaking,
    setAvatarAudioSrc,
    setLastCrisisScore,
  } = useSessionStore();

  // ── Connect ───────────────────────────────────────────────────────────────
  const connect = useCallback(() => {
    if (socketRef.current?.connected) return;

    const socket = io(`${SOCKET_URL}/session`, {
      transports:          ['websocket', 'polling'], // polling fallback prevents hard disconnect
      autoConnect:         true,
      reconnection:        true,
      reconnectionAttempts: 5,
      reconnectionDelay:   1000,
      reconnectionDelayMax: 5000,
      timeout:             10_000,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      setPhase('connecting');
    });

    socket.on('disconnect', (reason) => {
      // Transport-level disconnect (server restart, network blip) — only end the
      // session if the server explicitly told us to (i/o server disconnect).
      // Transient disconnects (transport close, ping timeout) let Socket.IO reconnect.
      if (reason === 'io server disconnect') {
        setPhase('ended');
      }
    });

    socket.on('connect_error', (err) => {
      console.warn('[Socket] connect error:', err.message);
    });

    socket.on('session:started', (data: { sessionId: string }) => {
      setSessionId(data.sessionId);
      setPhase('active');
    });

    socket.on('ai:chunk', (data: { text: string }) => {
      appendAiChunk(data.text);
    });

    socket.on('ai:audio', (data: { audioSrc: string }) => {
      setAvatarAudioSrc(data.audioSrc);
      setAvatarSpeaking(true);
    });

    socket.on('ai:done', (data: { crisisScore?: number }) => {
      flushAiResponse();
      setAvatarSpeaking(false);
      if (typeof data.crisisScore === 'number') {
        setLastCrisisScore(data.crisisScore);
      }
    });

    socket.on('session:ended', () => {
      setPhase('ended');
    });

    socket.on('session:error', (data: { message: string }) => {
      console.error('[SocketSession] error:', data.message);
    });
  }, [setPhase, setSessionId, appendAiChunk, flushAiResponse, setAvatarSpeaking, setAvatarAudioSrc, setLastCrisisScore]);

  // ── Session lifecycle ─────────────────────────────────────────────────────
  const startSession = useCallback((clerkUserId: string, userName: string) => {
    socketRef.current?.emit('session:start', { clerkUserId, userName });
  }, []);

  const sendMessage = useCallback((payload: SendMessagePayload) => {
    if (!socketRef.current?.connected) return;
    socketRef.current.emit('session:message', payload);
  }, []);

  const endSession = useCallback((
    sessionId: string,
    userId: string,
    conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }>,
  ) => {
    socketRef.current?.emit('session:end', { sessionId, userId, conversationHistory });
  }, []);

  const disconnect = useCallback(() => {
    socketRef.current?.disconnect();
    socketRef.current = null;
  }, []);

  // ── Auto-cleanup on unmount ───────────────────────────────────────────────
  useEffect(() => {
    return () => {
      socketRef.current?.disconnect();
      socketRef.current = null;
    };
  }, []);

  return { connect, startSession, sendMessage, endSession, disconnect };
}

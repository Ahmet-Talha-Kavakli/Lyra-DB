'use client';

import { useCallback, useEffect, useRef } from 'react';
import {
  Room,
  RoomEvent,
  ConnectionState,
  type RemoteParticipant,
} from 'livekit-client';
import { getLiveKitToken } from '@/lib/livekit/client';
import { posthog } from '@/lib/posthog/client';
import { useSessionStore } from '../session.store';

const ROOM_OPTIONS = {
  adaptiveStream: true,
  dynacast: true,
  audioCaptureDefaults: {
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true,
  },
};

export function useLiveKit() {
  const roomRef = useRef<Room | null>(null);

  const {
    setPhase,
    setSessionId,
    setTranscript,
    appendAiChunk,
    flushAiResponse,
    setAvatarSpeaking,
    enqueueAudio,
    setLastCrisisScore,
    addDataMessage,
  } = useSessionStore();

  const handleDataReceived = useCallback(
    (payload: Uint8Array, _participant?: RemoteParticipant) => {
      try {
        const text = new TextDecoder().decode(payload);
        addDataMessage(text);

        const msg = JSON.parse(text) as {
          type:        string;
          chunk?:      string;
          audioSrc?:   string;
          transcript?: string;
          crisisScore?: number;
        };

        switch (msg.type) {
          case 'transcript':
            if (msg.transcript) setTranscript(msg.transcript);
            break;
          case 'ai_chunk':
            if (msg.chunk) appendAiChunk(msg.chunk);
            break;
          case 'ai_audio':
            if (msg.audioSrc) {
              enqueueAudio(msg.audioSrc);
              setAvatarSpeaking(true);
            }
            break;
          case 'ai_done':
            flushAiResponse();
            setAvatarSpeaking(false);
            if (typeof msg.crisisScore === 'number') {
              setLastCrisisScore(msg.crisisScore);
            }
            break;
          default:
            break;
        }
      } catch {
        // non-JSON data messages are ignored
      }
    },
    [addDataMessage, setTranscript, appendAiChunk, enqueueAudio, setAvatarSpeaking, flushAiResponse, setLastCrisisScore],
  );

  const connect = useCallback(
    async (roomName: string) => {
      if (roomRef.current) return;

      setPhase('connecting');

      try {
        const { token, serverUrl } = await getLiveKitToken(roomName);

        const room = new Room(ROOM_OPTIONS);
        roomRef.current = room;

        room.on(RoomEvent.Connected, () => {
          setSessionId(room.name);
          setPhase('active');
          posthog.capture('session_started', { room: room.name });
        });

        room.on(RoomEvent.Disconnected, () => {
          setPhase('ended');
          posthog.capture('session_ended', { room: room.name });
        });

        room.on(RoomEvent.Reconnecting, () => {
          setPhase('connecting');
        });

        room.on(RoomEvent.Reconnected, () => {
          setPhase('active');
        });

        room.on(RoomEvent.DataReceived, handleDataReceived);

        await room.connect(serverUrl, token);
        await room.localParticipant.setMicrophoneEnabled(true);
      } catch (err) {
        console.error('[LiveKit] connection error', err);
        setPhase('ended');
        roomRef.current = null;
      }
    },
    [setPhase, setSessionId, handleDataReceived],
  );

  const disconnect = useCallback(async () => {
    if (!roomRef.current) return;
    await roomRef.current.disconnect();
    roomRef.current = null;
    setPhase('ended');
  }, [setPhase]);

  const sendData = useCallback((data: object) => {
    if (!roomRef.current) return;
    const encoded = new TextEncoder().encode(JSON.stringify(data));
    roomRef.current.localParticipant
      .publishData(encoded, { reliable: true })
      .catch((err) => console.error('[LiveKit] sendData error', err));
  }, []);

  // Auto-disconnect on unmount
  useEffect(() => {
    return () => {
      if (roomRef.current?.state === ConnectionState.Connected) {
        roomRef.current.disconnect();
        roomRef.current = null;
      }
    };
  }, []);

  return { connect, disconnect, sendData };
}

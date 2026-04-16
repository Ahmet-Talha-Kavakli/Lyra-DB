'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { useSessionStore } from '../session.store';

type SpeechRecognitionEvent = {
  results: SpeechRecognitionResultList;
  resultIndex: number;
};

type SpeechRecognitionErrorEvent = {
  error: string;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SpeechRecognitionInstance = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SpeechRecognitionCtor = new () => SpeechRecognitionInstance;

declare global {
  interface Window {
    SpeechRecognition:       SpeechRecognitionCtor | undefined;
    webkitSpeechRecognition: SpeechRecognitionCtor | undefined;
  }
}

interface UseSpeechRecognitionOptions {
  onFinalTranscript: (text: string) => void;
  lang?: string;
}

/** Errors where retrying is pointless — user must act (grant mic permission, etc.) */
const FATAL_STT_ERRORS = new Set(['not-allowed', 'service-not-allowed', 'audio-capture']);

/** Max consecutive auto-restarts before giving up */
const MAX_STT_RETRIES = 4;

/** Backoff delays in ms for each retry attempt */
const RETRY_DELAYS = [200, 600, 1500, 3000];

export function useSpeechRecognition({
  onFinalTranscript,
  lang = 'en-US',
}: UseSpeechRecognitionOptions) {
  const phase         = useSessionStore((s) => s.phase);
  const setTranscript = useSessionStore((s) => s.setTranscript);

  const recognitionRef           = useRef<SpeechRecognitionInstance | null>(null);
  const activeRef                = useRef(false);
  const phaseRef                 = useRef(phase);
  const [muted, setMuted]        = useState(false);
  const mutedRef                 = useRef(muted);
  const onFinalTranscriptRef     = useRef(onFinalTranscript);
  const setTranscriptRef         = useRef(setTranscript);
  // Prevents onend from auto-restarting when stop() is called intentionally
  const intentionalStopRef       = useRef(false);
  // Consecutive restart counter — resets to 0 on successful result
  const retryCountRef            = useRef(0);
  // Flag set when a fatal STT error occurs — prevents any restart attempt
  const fatalErrorRef            = useRef(false);

  useEffect(() => { phaseRef.current = phase; }, [phase]);
  useEffect(() => { mutedRef.current = muted; }, [muted]);
  useEffect(() => { onFinalTranscriptRef.current = onFinalTranscript; }, [onFinalTranscript]);
  useEffect(() => { setTranscriptRef.current = setTranscript; }, [setTranscript]);

  const isSupported = useCallback(() => {
    return typeof window !== 'undefined' &&
      (window.SpeechRecognition ?? window.webkitSpeechRecognition) != null;
  }, []);

  const start = useCallback(() => {
    if (!isSupported() || activeRef.current) return;

    const Ctor = window.SpeechRecognition ?? window.webkitSpeechRecognition!;
    const recognition = new Ctor();
    recognitionRef.current = recognition;

    recognition.lang            = lang;
    recognition.continuous      = true;
    recognition.interimResults  = true;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      // Successful result — reset retry counter
      retryCountRef.current = 0;

      let interim = '';
      let final   = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          final += (result[0].transcript as string);
        } else {
          interim += (result[0].transcript as string);
        }
      }

      if (interim) setTranscriptRef.current(interim);

      if (final.trim()) {
        setTranscriptRef.current(final.trim());
        onFinalTranscriptRef.current(final.trim());
      }
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      if (FATAL_STT_ERRORS.has(event.error)) {
        // Fatal — mic permission denied or hardware unavailable, don't retry
        fatalErrorRef.current = true;
        console.error('[STT] Fatal error, microphone unavailable:', event.error);
        return;
      }
      // non-fatal: no-speech / aborted / network — let onend handle restart
      if (event.error !== 'no-speech' && event.error !== 'aborted') {
        console.warn('[STT] transient error:', event.error);
      }
    };

    recognition.onend = () => {
      activeRef.current = false;
      const wasIntentional = intentionalStopRef.current;
      intentionalStopRef.current = false;

      const shouldRestart =
        !wasIntentional &&
        !fatalErrorRef.current &&
        phaseRef.current === 'active' &&
        !mutedRef.current;

      if (!shouldRestart) {
        // Intentional stop or fatal error — reset retry counter
        if (!fatalErrorRef.current) retryCountRef.current = 0;
        return;
      }

      if (retryCountRef.current >= MAX_STT_RETRIES) {
        console.warn('[STT] Max retries reached — microphone may be unavailable');
        return;
      }

      const delay = RETRY_DELAYS[retryCountRef.current] ?? 3000;
      retryCountRef.current += 1;
      setTimeout(() => start(), delay);
    };

    recognition.start();
    activeRef.current = true;
  }, [isSupported, lang]);

  const stop = useCallback(() => {
    intentionalStopRef.current = true;
    activeRef.current = false;
    recognitionRef.current?.stop();
    recognitionRef.current = null;
  }, []);

  // Restart when phase, muted, or lang changes
  useEffect(() => {
    if (phase === 'active' && !muted) {
      // Reset retry state whenever we intentionally (re)start
      fatalErrorRef.current = false;
      retryCountRef.current = 0;
      start();
    } else {
      stop();
    }
    return stop;
  }, [phase, muted, lang]); // eslint-disable-line react-hooks/exhaustive-deps

  return { muted, setMuted, isSupported };
}

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ExpoSpeechRecognitionModule,
  useSpeechRecognitionEvent,
} from 'expo-speech-recognition';
import * as Haptics from 'expo-haptics';

/**
 * Sesli giriş hook'u — Apple Speech (iOS) / Google Speech (Android) ile
 * gerçek zamanlı transkript üretir. Türkçe destekli, on-device çalışabilir.
 *
 * Kullanım:
 *   const { isListening, partialText, start, stop } = useVoiceInput({
 *     onFinalResult: (text) => appendToJournal(text),
 *   });
 *
 * - `start()` — mikrofon iznini ister, dinlemeye başlar.
 * - `partialText` — kullanıcı konuştukça canlı güncellenen kısmi transkript.
 * - `onFinalResult` — recognizer cümleyi finalize ettiğinde çağrılır
 *   (genellikle 1-2 saniye sessizlikten sonra). Bu noktada `partialText`
 *   sıfırlanır ve final metin handler'a iletilir.
 * - `stop()` — dinlemeyi sonlandırır; varsa son partial'ı final olarak teslim eder.
 */
export function useVoiceInput({
  onFinalResult,
  locale = 'tr-TR',
}: {
  onFinalResult: (text: string) => void;
  locale?: string;
}) {
  const [isListening, setIsListening] = useState(false);
  const [partialText, setPartialText] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Final result emit'i sırasında stale closure'ı önlemek için ref'te tutuyoruz
  const onFinalResultRef = useRef(onFinalResult);
  useEffect(() => {
    onFinalResultRef.current = onFinalResult;
  }, [onFinalResult]);

  useSpeechRecognitionEvent('start', () => {
    setIsListening(true);
    setError(null);
  });

  useSpeechRecognitionEvent('end', () => {
    setIsListening(false);
    setPartialText('');
  });

  useSpeechRecognitionEvent('result', (event) => {
    const transcript = event.results[0]?.transcript ?? '';
    if (event.isFinal) {
      setPartialText('');
      if (transcript.trim().length > 0) {
        onFinalResultRef.current(transcript);
      }
    } else {
      setPartialText(transcript);
    }
  });

  useSpeechRecognitionEvent('error', (event) => {
    setError(event.message ?? 'speech-recognition-error');
    setIsListening(false);
    setPartialText('');
  });

  const start = useCallback(async () => {
    try {
      const result = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
      if (!result.granted) {
        setError('permissions-denied');
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        return false;
      }

      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      ExpoSpeechRecognitionModule.start({
        lang: locale,
        interimResults: true,
        continuous: true,
        // iOS: cihaz üzerinde tanıma — internet gerektirmez (varsa)
        requiresOnDeviceRecognition: false,
        addsPunctuation: true,
      });
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'start-failed');
      return false;
    }
  }, [locale]);

  const stop = useCallback(() => {
    if (!isListening) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    ExpoSpeechRecognitionModule.stop();
  }, [isListening]);

  // Component unmount olursa temiz kapat
  useEffect(() => {
    return () => {
      try {
        ExpoSpeechRecognitionModule.stop();
      } catch {
        // ignore
      }
    };
  }, []);

  return {
    isListening,
    partialText,
    error,
    start,
    stop,
  };
}

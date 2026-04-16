'use client';

import { useCallback, useEffect, useRef } from 'react';
import { FaceLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';
import { useSessionStore } from '../../session/session.store';
import { analyzeEmotion } from '../analyzers/emotion-analyzer';
import { CrisisDetector } from '../analyzers/crisis-detector';
import type { CameraControls } from './use-camera';

/**
 * MediaPipe WASM bundle — loaded from CDN matching the installed package version.
 * Version is pinned to match package.json: @mediapipe/tasks-vision@0.10.34
 */
const WASM_CDN =
  'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.34/wasm';

const FACE_MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task';

/** Detection interval in ms — 5 fps is plenty for emotion analysis. */
const DETECT_INTERVAL_MS = 200;

/** How often to POST an emotion snapshot to Redis (ms). */
const BATCH_INTERVAL_MS = 2_000;

async function initLandmarker(): Promise<FaceLandmarker> {
  const vision = await FilesetResolver.forVisionTasks(WASM_CDN);
  // CPU only — GPU delegate conflicts with Three.js and causes WebGL context loss
  return FaceLandmarker.createFromOptions(vision, {
    baseOptions: { modelAssetPath: FACE_MODEL_URL, delegate: 'CPU' },
    runningMode: 'VIDEO',
    numFaces: 1,
    minFaceDetectionConfidence: 0.5,
    minFacePresenceConfidence: 0.5,
    minTrackingConfidence: 0.5,
    outputFaceBlendshapes: true,
  });
}

/**
 * Drives the continuous MediaPipe face analysis loop.
 *
 * Lifecycle:
 *   1. Initializes FaceLandmarker (WASM + model download, ~1–2 s on first load)
 *   2. Starts a requestAnimationFrame loop throttled to DETECT_INTERVAL_MS
 *   3. On each frame: detectForVideo → analyzeEmotion → update session store
 *   4. Every BATCH_INTERVAL_MS: POST snapshot to /api/vision/emotion (Redis)
 *   5. On unmount: cancels loop + closes landmarker
 *
 * Only runs when session phase is 'active' — pauses automatically otherwise.
 */
export function useMediaPipe(camera: CameraControls) {
  const { videoRef, isReady } = camera;

  const landmarkerRef    = useRef<FaceLandmarker | null>(null);
  const animFrameRef     = useRef<number>(0);
  const lastDetectRef    = useRef<number>(0);
  const lastBatchRef     = useRef<number>(0);
  const crisisDetector   = useRef(new CrisisDetector());
  const initStartedRef   = useRef(false);

  // ── Batch upload to Redis via API route ─────────────────────────────────
  const flushBatch = useCallback((sessionId: string) => {
    const { currentEmotion, emotionScore } = useSessionStore.getState();
    fetch('/api/vision/emotion', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId,
        emotion: currentEmotion,
        score: emotionScore,
        capturedAt: Date.now(),
      }),
    }).catch(() => {
      // Non-critical — silently drop if offline
    });
  }, []);

  // ── Detection frame loop ─────────────────────────────────────────────────
  const runLoop = useCallback(
    (timestamp: number) => {
      animFrameRef.current = requestAnimationFrame(runLoop);

      const phase = useSessionStore.getState().phase;
      if (phase !== 'active') return;
      if (!isReady()) return;
      if (!landmarkerRef.current) return;

      const video = videoRef.current;
      if (!video) return;

      // Throttle to DETECT_INTERVAL_MS
      if (timestamp - lastDetectRef.current < DETECT_INTERVAL_MS) return;
      lastDetectRef.current = timestamp;

      // detectForVideo requires a monotonically increasing timestamp in ms
      let result;
      try {
        result = landmarkerRef.current.detectForVideo(video, Date.now());
      } catch {
        return; // Detection errors are non-fatal — skip this frame
      }

      const blendshapes = result.faceBlendshapes?.[0];
      if (!blendshapes) return;

      // Emotion classification
      const { label, score } = analyzeEmotion(blendshapes);
      useSessionStore.getState().setCurrentEmotion(label, score);

      // Crisis detection (facial layer only — combined with NLP in Phase 8)
      const signal = crisisDetector.current.analyze(blendshapes);
      if (signal) {
        useSessionStore.getState().setActiveCrisis(signal);
      }

      // Batch flush to Redis
      const now = Date.now();
      if (now - lastBatchRef.current >= BATCH_INTERVAL_MS) {
        lastBatchRef.current = now;
        const { sessionId } = useSessionStore.getState();
        if (sessionId) flushBatch(sessionId);
      }
    },
    [videoRef, isReady, flushBatch],
  );

  // ── Init ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (initStartedRef.current) return;
    initStartedRef.current = true;

    initLandmarker()
      .then((lm) => {
        landmarkerRef.current = lm;
        // Start loop after init
        animFrameRef.current = requestAnimationFrame(runLoop);
      })
      .catch((err) => {
        console.error('[useMediaPipe] init failed:', err);
      });

    return () => {
      cancelAnimationFrame(animFrameRef.current);
      landmarkerRef.current?.close();
      landmarkerRef.current = null;
      crisisDetector.current.reset();
    };
  }, [runLoop]);
}

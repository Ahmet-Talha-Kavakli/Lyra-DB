'use client';

import { useEffect, useRef } from 'react';
import { useSessionStore } from '@/features/session/session.store';

const CAPTURE_INTERVAL_MS = 15_000; // 15 seconds
const CANVAS_WIDTH        = 320;
const CANVAS_HEIGHT       = 240;

/**
 * Periodically captures a webcam frame every 30 s, sends it to
 * /api/vision/analyze (GPT-4o Vision), and stores the result in
 * session store as `visionContext`.
 *
 * The hook is a no-op when:
 *  - the session is not active
 *  - the browser doesn't have camera access
 *  - NEXT_PUBLIC_VISION_ENABLED is not "true"
 */
export function useVisionCapture(videoRef: React.RefObject<HTMLVideoElement | null>) {
  const setVisionContext = useSessionStore((s) => s.setVisionContext);
  const phase            = useSessionStore((s) => s.phase);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (phase !== 'active') return;
    if (process.env['NEXT_PUBLIC_VISION_ENABLED'] !== 'true') return;

    // Lazy-create off-screen canvas once
    if (!canvasRef.current) {
      canvasRef.current = document.createElement('canvas');
      canvasRef.current.width  = CANVAS_WIDTH;
      canvasRef.current.height = CANVAS_HEIGHT;
    }

    async function capture() {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas || video.readyState < 2) return;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.drawImage(video, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      const imageDataUrl = canvas.toDataURL('image/jpeg', 0.7);

      try {
        const res = await fetch('/api/vision/analyze', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ imageDataUrl }),
        });
        if (res.ok) {
          const data = await res.json() as { visionContext?: string | null };
          if (data.visionContext) {
            setVisionContext(data.visionContext);
          }
        }
      } catch {
        // Vision is best-effort; never block the session
      }
    }

    // Capture once immediately, then on the interval
    void capture();
    const id = setInterval(capture, CAPTURE_INTERVAL_MS);
    return () => clearInterval(id);
  }, [phase, videoRef, setVisionContext]);
}

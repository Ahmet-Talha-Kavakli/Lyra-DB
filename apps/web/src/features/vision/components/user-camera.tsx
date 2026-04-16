'use client';

import { useEffect, useRef } from 'react';
import { useSessionStore } from '../../session/session.store';
import { useCamera } from '../hooks/use-camera';
import { useMediaPipe } from '../hooks/use-mediapipe';
import { useVisionCapture } from '../hooks/use-vision-capture';

export function UserCamera() {
  const phase  = useSessionStore((s) => s.phase);
  const camera = useCamera();
  const { videoRef, startCamera, stopCamera } = camera;

  const cameraActiveRef = useRef(false);

  useEffect(() => {
    if (phase === 'active' && !cameraActiveRef.current) {
      cameraActiveRef.current = true;
      startCamera();
    }
    if (phase === 'ended' && cameraActiveRef.current) {
      cameraActiveRef.current = false;
      stopCamera();
    }
  }, [phase, startCamera, stopCamera]);

  useMediaPipe(camera);
  useVisionCapture(videoRef);

  if (phase === 'idle') return null;

  return (
    <div className="relative h-full w-full overflow-hidden bg-black">
      {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="h-full w-full object-cover"
        style={{ transform: 'scaleX(-1)' }}
      />

      {/* Live indicator */}
      {phase === 'active' && (
        <div className="absolute bottom-2 right-2 flex items-center gap-1.5 rounded-full bg-black/60 px-2 py-0.5">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-green-400" />
          <span className="text-xs text-gray-400">Live</span>
        </div>
      )}
    </div>
  );
}

'use client';

import { useState, useCallback } from 'react';
import { Canvas } from '@react-three/fiber';
import {
  Environment,
  ContactShadows,
  PerspectiveCamera,
} from '@react-three/drei';
import { AvatarScene } from './avatar-scene';
import { AvatarModel } from './avatar-model';

/**
 * Self-contained 3D scene for the AI therapist avatar.
 *
 * Scene composition:
 *   - PerspectiveCamera  head-and-shoulders framing (fov 42, z 2.2)
 *   - Key light          warm directional from upper-right
 *   - Fill light         cool point from upper-left
 *   - Environment        "studio" HDRI for subtle skin reflections
 *   - ContactShadows     soft ground shadow for depth
 *   - AvatarScene        Suspense + ErrorBoundary → AvatarModel (or placeholder)
 *
 * Always renders with alpha: true so the parent background shows through.
 * SSR is disabled at the import site (dynamic import with ssr:false).
 */
export function AvatarCanvas() {
  const [canvasKey, setCanvasKey] = useState(0);

  // Remount the entire Canvas when WebGL context is lost — this recovers the scene
  // Context loss happens when GPU memory is under pressure (common with MediaPipe + Three.js)
  const handleContextLost = useCallback((event: Event) => {
    event.preventDefault(); // prevent browser from tearing down context
    console.warn('[AvatarCanvas] WebGL context lost — remounting in 1s');
    setTimeout(() => setCanvasKey((k) => k + 1), 1000);
  }, []);

  return (
    <div className="h-full w-full" aria-label="AI therapist avatar">
      <Canvas
        key={canvasKey}
        shadows
        gl={{
          antialias: true,
          alpha: true,
          powerPreference: 'low-power', // reduces GPU memory pressure alongside MediaPipe
          failIfMajorPerformanceCaveat: false,
        }}
        style={{ background: 'transparent' }}
        dpr={[1, 1.5]} // lower max DPR to reduce GPU memory pressure
        onCreated={({ gl }) => {
          gl.domElement.addEventListener('webglcontextlost', handleContextLost, false);
        }}
      >
        {/* Camera — head-and-shoulders portrait framing */}
        <PerspectiveCamera makeDefault position={[0, 0.5, 2.2]} fov={42} />

        {/* Lighting */}
        <ambientLight intensity={0.55} />
        <directionalLight
          position={[2, 4, 3]}
          intensity={1.2}
          castShadow
          shadow-mapSize-width={1024}
          shadow-mapSize-height={1024}
        />
        {/* Cool fill — gives depth without harsh shadows */}
        <pointLight position={[-2, 2, 2]} intensity={0.35} color="#b8d4ff" />

        {/* Soft studio environment (skin reflections) */}
        <Environment preset="studio" />

        {/* Avatar with graceful fallback */}
        <AvatarScene>
          <AvatarModel />
        </AvatarScene>

        {/* Ground shadow for perceived depth */}
        <ContactShadows
          position={[0, -1.4, 0]}
          opacity={0.35}
          scale={4}
          blur={2.5}
          far={2}
        />
      </Canvas>
    </div>
  );
}

'use client';

import { useEffect, useRef } from 'react';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { useMorphTargets } from '../hooks/use-morph-targets';
import { useAvatarIdle } from '../hooks/use-avatar-idle';
import { useAvatarSpeaking } from '../hooks/use-avatar-speaking';
import { useAvatarEmotion } from '../hooks/use-avatar-emotion';
import { useAvatarLipSync } from '../hooks/use-avatar-lip-sync';

/**
 * Path to the Reallusion GLB inside /public.
 * Drop your exported character here:  apps/web/public/models/therapist.glb
 *
 * Export checklist (Character Creator 4):
 *  ✓ Format: FBX for Unity/Unreal → re-export as GLB, OR use CC4 Direct Export → GLB
 *  ✓ Enable: Blend Shape / Morph Target
 *  ✓ Enable: Embed Textures
 *  ✓ LOD: High / Standard
 *  ✓ Mesh: Combine meshes OFF (keeps separate face/body meshes — morph targets work better)
 */
const MODEL_PATH = '/models/therapist.glb';

/**
 * Loads the Reallusion GLB and wires all three animation hooks:
 *   idle  → eye blink + head sway
 *   speaking → jaw oscillation
 *   emotion  → facial expression lerp
 *
 * Hook execution order is intentional:
 *   1. useAvatarIdle    — sets blink morphs + group rotation
 *   2. useAvatarSpeaking — sets mouthOpen (overrides any idle mouth value)
 *   3. useAvatarEmotion  — sets everything else (excludes blink + mouthOpen)
 * No two hooks write the same morph key → zero conflicts.
 */
export function AvatarModel() {
  const groupRef = useRef<THREE.Group>(null);
  const gltf     = useGLTF(MODEL_PATH);

  const morphs = useMorphTargets(groupRef);

  // Invalidate morph cache if the scene object ever changes (GLB hot-reload in dev)
  useEffect(() => {
    morphs.invalidateCache();
  }, [gltf.scene]); // eslint-disable-line react-hooks/exhaustive-deps

  // Hook execution order is intentional:
  //  1. useAvatarIdle    — sets base rotation, breathing, blink
  //  2. useAvatarSpeaking — adds nod + lean on top of idle rotation
  //  3. useAvatarEmotion  — sets non-mouth facial morphs
  //  4. useAvatarLipSync  — drives mouth morphs from real audio FFT
  useAvatarIdle(groupRef, morphs);
  useAvatarSpeaking(groupRef, morphs);
  useAvatarEmotion(morphs);
  useAvatarLipSync(morphs);

  return (
    /**
     * Position / scale tuned for a head-and-shoulders framing at the default
     * camera (position [0, 0.5, 2.2], fov 42).
     *
     * Reallusion CC4 characters are exported at real-world scale (~1.7 m tall).
     * position Y –1.2 moves the feet below the frame so only the upper body shows.
     */
    <group ref={groupRef} position={[0, -1.2, 0]} scale={1}>
      <primitive object={gltf.scene} />
    </group>
  );
}

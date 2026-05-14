'use client';

// Phase 1 placeholder; real avatar mesh in Phase 1.5.

import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import type { Mesh } from 'three';

export default function AvatarCube() {
  const meshRef = useRef<Mesh>(null);

  useFrame((_, delta) => {
    const mesh = meshRef.current;
    if (mesh) {
      mesh.rotation.x += delta * 0.5;
      mesh.rotation.y += delta * 0.75;
    }
  });

  return (
    <mesh ref={meshRef}>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial color="#888" />
    </mesh>
  );
}

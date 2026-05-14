'use client';

import { Canvas } from '@react-three/fiber';
import { Suspense } from 'react';
import AvatarCube from './AvatarCube';

export default function ClosetCanvas() {
  return (
    <Canvas camera={{ position: [3, 2, 3], fov: 50 }}>
      <ambientLight intensity={0.6} />
      <directionalLight position={[5, 5, 5]} intensity={0.8} />
      <Suspense fallback={null}>
        <AvatarCube />
      </Suspense>
    </Canvas>
  );
}

'use client';

import dynamic from 'next/dynamic';

const ClosetCanvas = dynamic(() => import('./ClosetCanvas'), {
  ssr: false,
  loading: () => <div className="p-6 text-sm">loading closet…</div>,
});

export default function ClosetCanvasLoader() {
  return <ClosetCanvas />;
}

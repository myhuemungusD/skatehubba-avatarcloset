import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import Header from '../components/Header';
import './globals.css';

export const metadata: Metadata = {
  title: 'SkateHubba: Avatar Closet',
  description: 'Collect, customize, show off, trade. The skate-culture closet game.',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Header />
        {children}
      </body>
    </html>
  );
}

import type { Metadata, Viewport } from 'next';
import './globals.css';
import { SoundProvider } from './components/SoundEffects';

export const viewport: Viewport = {
  themeColor: '#000be0',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export const metadata: Metadata = {
  title: 'eFootball 2026 • Free Community Tournaments & Esports Arena',
  description: 'Join free 8-player eFootball Mobile community tournaments, live brackets, and AI media generator.',
  metadataBase: new URL('https://www.efootball2026.online'),
  alternates: { canonical: '/' },
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'eFootball 2026',
  },
  openGraph: {
    title: 'eFootball 2026 Community Tournaments & Esports Arena',
    description: 'Join free 8-player eFootball Mobile tournaments, live brackets, and career ranking passport.',
    url: 'https://www.efootball2026.online',
    siteName: 'eFootball 2026',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'eFootball 2026 Community Tournaments & Esports Arena',
    description: 'Join free 8-player eFootball Mobile tournaments.',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <SoundProvider>{children}</SoundProvider>
      </body>
    </html>
  );
}

import { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'eFootball 2026 Community Cups & Esports Arena',
    short_name: 'eFootball 2026',
    description: 'Official eFootball 2026 esports tournaments, competitive brackets, and AI media generator.',
    start_url: '/',
    display: 'standalone',
    background_color: '#000830',
    theme_color: '#000be0',
    orientation: 'portrait',
    icons: [
      {
        src: '/icon.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/icon.png',
        sizes: '512x512',
        type: 'image/png',
      },
    ],
  };
}

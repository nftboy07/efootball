import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = { title: 'eFootball 2026 • Free Community Tournaments', description: 'Join free 8-player eFootball Mobile community tournaments.', metadataBase: new URL('https://www.efootball2026.online'), alternates:{canonical:'/'}, openGraph:{title:'eFootball 2026 Community Tournaments',description:'Join free 8-player eFootball Mobile tournaments.',url:'https://www.efootball2026.online',siteName:'eFootball 2026',type:'website'}, twitter:{card:'summary',title:'eFootball 2026 Community Tournaments',description:'Join free 8-player eFootball Mobile tournaments.'} };
export default function RootLayout({ children }: Readonly<{children: React.ReactNode}>) { return <html lang="en"><body>{children}</body></html>; }

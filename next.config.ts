import type { NextConfig } from 'next';
// The API origin the browser is allowed to call. Derived from env so pointing
// the app at a different backend does not silently get blocked by CSP.
const apiOrigin = (() => {
  const raw = process.env.NEXT_PUBLIC_API_URL || 'https://efootball-tournament-kwq4.onrender.com';
  try {
    return new URL(raw).origin;
  } catch {
    return 'https://efootball-tournament-kwq4.onrender.com';
  }
})();

const connectSrc = [
  "'self'",
  'http://127.0.0.1:8000',
  'http://localhost:8000',
  apiOrigin,
  'https://image.pollinations.ai',
]
  // Deduplicate in case apiOrigin already matches one of the defaults.
  .filter((v, i, a) => a.indexOf(v) === i)
  .join(' ');

// Evidence screenshots and generated media are served from object stores, so
// img-src/media-src stay broad over https rather than enumerating every CDN.
const csp = [
  "default-src 'self'",
  "img-src 'self' https: data: blob:",
  "media-src 'self' https: data: blob:",
  `connect-src ${connectSrc}`,
  "style-src 'self' 'unsafe-inline'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  "font-src 'self' https: data:",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
].join('; ');

const securityHeaders = [
  { key: 'Content-Security-Policy', value: csp },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
  { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  async headers() {
    return [
      { source: '/:path*', headers: securityHeaders },
      // The admin hub must never be indexed or archived.
      {
        source: '/admin/:path*',
        headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow, noarchive' }],
      },
    ];
  },
};

export default nextConfig;

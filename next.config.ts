import type { NextConfig } from 'next';
const securityHeaders=[
  {key:'Content-Security-Policy',value:"default-src 'self'; img-src 'self' https: data:; media-src 'self' https: data:; connect-src 'self' https://efootball-tournament-kwq4.onrender.com https://image.pollinations.ai; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'"},
  {key:'Referrer-Policy',value:'strict-origin-when-cross-origin'},
  {key:'X-Content-Type-Options',value:'nosniff'},
  {key:'X-Frame-Options',value:'DENY'},
  {key:'Permissions-Policy',value:'camera=(), microphone=(), geolocation=()'},
  {key:'Strict-Transport-Security',value:'max-age=31536000; includeSubDomains'}
];
const nextConfig: NextConfig = { reactStrictMode: true, async headers(){return [{source:'/:path*',headers:securityHeaders}]} };
export default nextConfig;

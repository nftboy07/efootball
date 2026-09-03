import { NextResponse } from 'next/server';

/** Server-only ADMIN_KEY. Never expose via NEXT_PUBLIC_*. The browser never sends it. */
export function getServiceAdminKey(): string {
  return (process.env.ADMIN_KEY || '').trim();
}

export function serviceAdmin(): { ok: true; adminKey: string } | { ok: false; response: NextResponse } {
  const adminKey = getServiceAdminKey();
  if (!adminKey) {
    return {
      ok: false,
      response: NextResponse.json(
        {
          error:
            'ADMIN_KEY is not configured on the Next.js server. Set it in Vercel env (server-only) so /admin can call FastAPI without a browser password.',
        },
        { status: 503 }
      ),
    };
  }
  return { ok: true, adminKey };
}

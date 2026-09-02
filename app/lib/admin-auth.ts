import { createHmac, timingSafeEqual } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { COOKIE_ADMIN, SESSION_MAX_AGE_SECONDS, TOURNAMENT_API } from './config';

function sessionSecret(fallback?: string): string {
  return process.env.ADMIN_SESSION_SECRET || process.env.ADMIN_KEY || process.env.CRON_SECRET || fallback || '';
}

function sign(payload: string, secret: string): string {
  return createHmac('sha256', secret).update(payload).digest('base64url');
}

function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

export type AdminSession = { adminKey: string; exp: number };

export function encodeSession(adminKey: string): string | null {
  const secret = sessionSecret(adminKey);
  if (!secret) return null;
  const payload = Buffer.from(JSON.stringify({ adminKey, exp: Date.now() + SESSION_MAX_AGE_SECONDS * 1000 })).toString(
    'base64url'
  );
  return `${payload}.${sign(payload, secret)}`;
}

export function decodeSession(token: string | undefined | null): AdminSession | null {
  if (!token || !token.includes('.')) return null;
  const [payload, signature] = token.split('.');
  if (!payload || !signature) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as AdminSession;
    if (!data?.adminKey || typeof data.exp !== 'number' || data.exp < Date.now()) return null;
    const secret = sessionSecret(data.adminKey);
    if (!secret || !safeEqual(sign(payload, secret), signature)) return null;
    return data;
  } catch {
    return null;
  }
}

export async function verifyAdminKey(adminKey: string): Promise<boolean> {
  const key = (adminKey || '').trim();
  if (!key) return false;

  const local = process.env.ADMIN_KEY || '';
  if (local) {
    try {
      if (safeEqual(key, local)) return true;
    } catch {
      return false;
    }
    // Fall through to FastAPI in case Vercel and Render keys ever differ.
  }

  try {
    const res = await fetch(`${TOURNAMENT_API}/api/admin/verify`, {
      headers: { 'X-Admin-Key': key },
      cache: 'no-store',
    });
    return res.ok;
  } catch {
    return false;
  }
}

export function readSessionFromRequest(request: NextRequest): AdminSession | null {
  const headerKey = request.headers.get('x-admin-key') || '';
  if (headerKey) {
    return { adminKey: headerKey, exp: Date.now() + SESSION_MAX_AGE_SECONDS * 1000 };
  }
  return decodeSession(request.cookies.get(COOKIE_ADMIN)?.value);
}

export async function requireAdmin(request: NextRequest): Promise<
  { ok: true; adminKey: string } | { ok: false; response: NextResponse }
> {
  const session = readSessionFromRequest(request);
  if (!session?.adminKey) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Admin authentication required' }, { status: 401 }),
    };
  }
  const local = process.env.ADMIN_KEY || '';
  if (local) {
    try {
      const left = Buffer.from(session.adminKey);
      const right = Buffer.from(local);
      if (left.length === right.length && timingSafeEqual(left, right)) {
        return { ok: true, adminKey: session.adminKey };
      }
    } catch {
      // continue to FastAPI
    }
  }
  const valid = await verifyAdminKey(session.adminKey);
  if (!valid) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Admin authentication required' }, { status: 401 }),
    };
  }
  return { ok: true, adminKey: session.adminKey };
}

export function sessionCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge: SESSION_MAX_AGE_SECONDS,
  };
}

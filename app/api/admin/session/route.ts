import { NextRequest, NextResponse } from 'next/server';
import { COOKIE_ADMIN } from '../../../lib/config';
import { encodeSession, requireAdmin, sessionCookieOptions, verifyAdminKey } from '../../../lib/admin-auth';

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.ok) {
    return NextResponse.json({ unlocked: false });
  }
  return NextResponse.json({ unlocked: true });
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const adminKey = String(body.adminKey || body.key || '').trim();
  if (!adminKey) {
    return NextResponse.json({ error: 'Admin key required' }, { status: 400 });
  }

  const valid = await verifyAdminKey(adminKey);
  if (!valid) {
    return NextResponse.json({ error: 'Invalid admin key' }, { status: 401 });
  }

  const token = encodeSession(adminKey);
  const res = NextResponse.json({ unlocked: true, persistent: Boolean(token) });
  if (token) {
    res.cookies.set(COOKIE_ADMIN, token, sessionCookieOptions());
  }
  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ unlocked: false });
  res.cookies.set(COOKIE_ADMIN, '', { ...sessionCookieOptions(), maxAge: 0 });
  return res;
}

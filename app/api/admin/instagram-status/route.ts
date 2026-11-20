import { NextRequest, NextResponse } from 'next/server';
import { inspectTokenHealth } from '../../../lib/instagram';
import { serviceAdmin } from '../../../lib/admin-auth';

function unauthorized() {
  return NextResponse.json({ error: 'Admin authentication required' }, { status: 401 });
}

export async function GET(request: NextRequest) {
  if (!serviceAdmin(request.headers.get('x-admin-key') || '').ok) return unauthorized();
  const health = await inspectTokenHealth();
  return NextResponse.json(health);
}

export async function POST(request: NextRequest) {
  if (!serviceAdmin(request.headers.get('x-admin-key') || '').ok) return unauthorized();
  const body = await request.json().catch(() => ({}));
  const health = await inspectTokenHealth({
    accessToken: body.accessToken,
    igUserId: body.igUserId,
  });
  return NextResponse.json(health);
}

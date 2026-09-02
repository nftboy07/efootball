import { NextRequest, NextResponse } from 'next/server';
import { inspectTokenHealth } from '../../../lib/instagram';
import { requireAdmin } from '../../../lib/admin-auth';

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.ok) return auth.response;
  const health = await inspectTokenHealth();
  return NextResponse.json(health);
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.ok) return auth.response;
  const body = await request.json().catch(() => ({}));
  const health = await inspectTokenHealth({
    accessToken: body.accessToken,
    igUserId: body.igUserId,
  });
  return NextResponse.json(health);
}

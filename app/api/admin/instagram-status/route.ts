import { NextRequest, NextResponse } from 'next/server';
import { inspectTokenHealth } from '../../../lib/instagram';

export async function GET() {
  const health = await inspectTokenHealth();
  return NextResponse.json(health);
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const health = await inspectTokenHealth({
    accessToken: body.accessToken,
    igUserId: body.igUserId,
  });
  return NextResponse.json(health);
}

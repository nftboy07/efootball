import { NextRequest, NextResponse } from 'next/server';

let siteAnnouncement = {
  active: false,
  message: '🔴 Registration for official eFootball 2026 Community Cup is LIVE!',
  type: 'INFO',
  updatedAt: new Date().toISOString(),
};

export async function GET() {
  return NextResponse.json(siteAnnouncement);
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  if (typeof body.active === 'boolean') siteAnnouncement.active = body.active;
  if (body.message) siteAnnouncement.message = body.message;
  if (body.type) siteAnnouncement.type = body.type;
  siteAnnouncement.updatedAt = new Date().toISOString();

  return NextResponse.json({ success: true, announcement: siteAnnouncement });
}
import { NextRequest, NextResponse } from 'next/server';
import { TOURNAMENT_API } from '../../../lib/config';
import { serviceAdmin } from '../../../lib/admin-auth';

type Announcement = {
  active: boolean;
  message: string;
  type: string;
  updatedAt: string;
};

const fallback: Announcement = {
  active: false,
  message: 'Registration for the eFootball Community Cup is open — free entry, 8-player knockout.',
  type: 'INFO',
  updatedAt: new Date().toISOString(),
};

let memory = { ...fallback };

async function loadRemote(): Promise<Announcement | null> {
  try {
    const res = await fetch(`${TOURNAMENT_API}/api/announcement`, { cache: 'no-store' });
    if (!res.ok) return null;
    const data = await res.json();
    if (data && typeof data.active === 'boolean') return data;
    return null;
  } catch {
    return null;
  }
}

export async function GET() {
  const remote = await loadRemote();
  if (remote) memory = remote;
  return NextResponse.json(memory);
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  if (typeof body.active === 'boolean') memory.active = body.active;
  if (body.message) memory.message = String(body.message).slice(0, 280);
  if (body.type) memory.type = String(body.type);
  memory.updatedAt = new Date().toISOString();

  const auth = serviceAdmin();
  let persisted = false;
  if (auth.ok) {
    try {
      const res = await fetch(`${TOURNAMENT_API}/api/announcement`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'X-Admin-Key': auth.adminKey },
        body: JSON.stringify(memory),
      });
      persisted = res.ok;
    } catch {
      persisted = false;
    }
  }

  return NextResponse.json({ success: true, persisted, announcement: memory });
}

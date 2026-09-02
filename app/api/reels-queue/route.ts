import { NextRequest, NextResponse } from 'next/server';
import { TOURNAMENT_API } from '../../lib/config';
import { requireAdmin } from '../../lib/admin-auth';

export type QueuedReel = {
  id: string;
  videoUrl: string;
  caption: string;
  playerTag: string;
  scheduledTime: string;
  status: 'QUEUED' | 'PUBLISHING' | 'PUBLISHED' | 'FAILED';
  publishedAt?: string;
  error?: string;
  createdAt?: string;
};

let memoryQueue: QueuedReel[] = [];

function isPublicHighlight(item: QueuedReel) {
  if (!item?.videoUrl) return false;
  if (/mixkit\.co/i.test(item.videoUrl)) return false;
  return true;
}

async function loadRemote(): Promise<QueuedReel[] | null> {
  try {
    const res = await fetch(`${TOURNAMENT_API}/api/reels-queue`, { cache: 'no-store' });
    if (!res.ok) return null;
    const data = await res.json();
    if (Array.isArray(data?.queue)) return data.queue;
    return null;
  } catch {
    return null;
  }
}

async function saveRemote(queue: QueuedReel[], adminKey: string): Promise<boolean> {
  try {
    const res = await fetch(`${TOURNAMENT_API}/api/reels-queue`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'X-Admin-Key': adminKey },
      body: JSON.stringify({ queue }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function GET(request: NextRequest) {
  const remote = await loadRemote();
  const queue = remote || memoryQueue;
  if (remote) memoryQueue = remote;

  const publicOnly = request.nextUrl.searchParams.get('public') === '1';
  const visible = publicOnly ? queue.filter(isPublicHighlight) : queue;

  return NextResponse.json({
    queue: visible,
    persisted: Boolean(remote),
    totalQueued: queue.filter((r) => r.status === 'QUEUED').length,
    totalPublished: queue.filter((r) => r.status === 'PUBLISHED').length,
    dailyLimit: 25,
  });
}

export async function PUT(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.ok) return auth.response;
  const body = await request.json().catch(() => null);
  if (!body || !Array.isArray(body.queue)) {
    return NextResponse.json({ error: 'queue array required' }, { status: 400 });
  }
  memoryQueue = body.queue;
  const persisted = await saveRemote(memoryQueue, auth.adminKey);
  return NextResponse.json({ success: true, persisted, queue: memoryQueue });
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.ok) return auth.response;

  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });

  const remote = await loadRemote();
  if (remote) memoryQueue = remote;

  const { action, reelId, items, intervalMinutes = 45 } = body;

  if (action === 'ADD_BATCH' && Array.isArray(items)) {
    const now = new Date();
    const newItems: QueuedReel[] = items.map((item: any, idx: number) => ({
      id: item.id || 'REEL-' + Math.random().toString(36).substring(2, 9).toUpperCase(),
      videoUrl: item.videoUrl,
      caption: item.caption,
      playerTag: item.playerTag || 'eFootball',
      scheduledTime: item.scheduledTime || new Date(now.getTime() + idx * intervalMinutes * 60 * 1000).toISOString(),
      status: item.status || 'QUEUED',
      createdAt: item.createdAt || new Date().toISOString(),
    }));
    memoryQueue = [...newItems, ...memoryQueue];
    const persisted = await saveRemote(memoryQueue, auth.adminKey);
    return NextResponse.json({
      success: true,
      persisted,
      message: `${newItems.length} reels added to publishing queue.`,
      queue: memoryQueue,
    });
  }

  if (action === 'REPLACE' && Array.isArray(items)) {
    memoryQueue = items;
    const persisted = await saveRemote(memoryQueue, auth.adminKey);
    return NextResponse.json({ success: true, persisted, queue: memoryQueue });
  }

  if (action === 'DELETE_ITEM' && reelId) {
    memoryQueue = memoryQueue.filter((r) => r.id !== reelId);
    const persisted = await saveRemote(memoryQueue, auth.adminKey);
    return NextResponse.json({ success: true, persisted, queue: memoryQueue });
  }

  return NextResponse.json({ error: 'Unsupported action' }, { status: 400 });
}

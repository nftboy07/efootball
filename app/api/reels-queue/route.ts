import { NextRequest, NextResponse } from 'next/server';

export interface QueuedReel {
  id: string;
  videoUrl: string;
  caption: string;
  playerTag: string;
  scheduledTime: string;
  status: 'QUEUED' | 'PUBLISHING' | 'PUBLISHED' | 'FAILED';
  publishedAt?: string;
  error?: string;
}

// In-memory queue store (or can be connected to Postgres/Upstash)
let reelQueue: QueuedReel[] = [];

export async function GET() {
  return NextResponse.json({
    queue: reelQueue,
    totalQueued: reelQueue.filter((r) => r.status === 'QUEUED').length,
    totalPublished: reelQueue.filter((r) => r.status === 'PUBLISHED').length,
    dailyLimit: 25, // Meta Graph API safe daily limit
  });
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const { action, reelId, items, intervalMinutes = 45, startHour = 10 } = body;

  // 1. ADD BATCH OF GENERATED REELS TO QUEUE WITH TIMED INTERVALS
  if (action === 'ADD_BATCH' && Array.isArray(items)) {
    const now = new Date();
    const newItems: QueuedReel[] = items.map((item: any, idx: number) => {
      const scheduledDate = new Date(now.getTime() + idx * intervalMinutes * 60 * 1000);
      return {
        id: 'REEL-' + Math.random().toString(36).substring(2, 9).toUpperCase(),
        videoUrl: item.videoUrl,
        caption: item.caption,
        playerTag: item.playerTag || 'eFootball',
        scheduledTime: scheduledDate.toISOString(),
        status: 'QUEUED',
      };
    });

    reelQueue = [...reelQueue, ...newItems];
    return NextResponse.json({
      success: true,
      message: `${newItems.length} reels added to safe publishing queue.`,
      queue: reelQueue,
    });
  }

  // 2. DISPATCH A SPECIFIC REEL (PUBLISH NOW)
  if (action === 'PUBLISH_ITEM' && reelId) {
    const item = reelQueue.find((r) => r.id === reelId);
    if (!item) {
      return NextResponse.json({ error: 'Reel item not found' }, { status: 404 });
    }

    const token = body.accessToken || process.env.INSTAGRAM_ACCESS_TOKEN;
    const userId = body.igUserId || process.env.INSTAGRAM_ACCOUNT_ID;

    if (!token || !userId) {
      return NextResponse.json({
        error: 'Instagram API credentials not configured. Provide Instagram Account ID and Access Token.',
      }, { status: 400 });
    }

    try {
      item.status = 'PUBLISHING';

      // Step A: Create Container
      const createUrl =
        'https://graph.facebook.com/v20.0/' +
        userId +
        '/media?media_type=REELS&video_url=' +
        encodeURIComponent(item.videoUrl) +
        '&caption=' +
        encodeURIComponent(item.caption || '') +
        '&access_token=' +
        token;

      const createRes = await fetch(createUrl, { method: 'POST' });
      const createData = await createRes.json();

      if (!createRes.ok || !createData.id) {
        item.status = 'FAILED';
        item.error = createData.error?.message || 'Failed to create Instagram container';
        return NextResponse.json({ error: item.error }, { status: 502 });
      }

      const creationId = createData.id;

      // Step B: Poll container status
      let isReady = false;
      for (let i = 0; i < 15; i++) {
        await new Promise((res) => setTimeout(res, 3000));
        const statusUrl =
          'https://graph.facebook.com/v20.0/' + creationId + '?fields=status_code&access_token=' + token;
        const statusRes = await fetch(statusUrl);
        const statusData = await statusRes.json();
        if (statusData.status_code === 'FINISHED') {
          isReady = true;
          break;
        }
        if (statusData.status_code === 'ERROR') {
          item.status = 'FAILED';
          item.error = 'Instagram video container error';
          return NextResponse.json({ error: item.error }, { status: 502 });
        }
      }

      if (!isReady) {
        item.status = 'FAILED';
        item.error = 'Instagram processing timed out';
        return NextResponse.json({ error: item.error }, { status: 504 });
      }

      // Step C: Publish Reel
      const publishUrl =
        'https://graph.facebook.com/v20.0/' +
        userId +
        '/media_publish?creation_id=' +
        creationId +
        '&access_token=' +
        token;

      const publishRes = await fetch(publishUrl, { method: 'POST' });
      const publishData = await publishRes.json();

      if (!publishRes.ok || !publishData.id) {
        item.status = 'FAILED';
        item.error = publishData.error?.message || 'Publishing failed';
        return NextResponse.json({ error: item.error }, { status: 502 });
      }

      item.status = 'PUBLISHED';
      item.publishedAt = new Date().toISOString();

      return NextResponse.json({
        success: true,
        message: 'Reel published to Instagram successfully!',
        postId: publishData.id,
        item,
      });
    } catch (e: any) {
      item.status = 'FAILED';
      item.error = e.message || 'Publish error';
      return NextResponse.json({ error: item.error }, { status: 500 });
    }
  }

  // 3. CLEAR / DELETE ITEM
  if (action === 'DELETE_ITEM' && reelId) {
    reelQueue = reelQueue.filter((r) => r.id !== reelId);
    return NextResponse.json({ success: true, queue: reelQueue });
  }

  return NextResponse.json({ error: 'Unsupported action' }, { status: 400 });
}

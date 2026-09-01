import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  if (!body || !body.videoUrl) {
    return NextResponse.json({ error: 'Missing videoUrl for Instagram publishing.' }, { status: 400 });
  }

  const { videoUrl, caption, accessToken, igUserId } = body;

  const DEFAULT_TOKEN =
    'EAAUYKazODOYBSVmLFFSyBm1lY3TeZBBVcYdpzHlqQEigTTubccMwHpxmTLZAF8P2vlwUsDFzrypA4YVmHYujdZCbcpX94d7Vm8whJZBMLjLroV69WNxorgsZC5PNtIAPLItRdQj3FkNi6LPuMGmAeKihePvwNlcYWC9SV6n0BuEXeNZASZASN7KZBd9he49HPnA0hvbnygVpZCDzWeSn2sAkuol18mU02QIcNZBZAe1yKn0A3nZAjfFZB4iQHdgXyZCb8ZBQoads9fU7yuNYpo0Kt2SU0d91yQZD';

  const token = accessToken || process.env.INSTAGRAM_ACCESS_TOKEN || DEFAULT_TOKEN;
  let userId = igUserId || process.env.INSTAGRAM_ACCOUNT_ID;

  // Auto-discover Instagram Business Account ID from Token if not manually typed
  if (!userId && token) {
    try {
      const accRes = await fetch(
        `https://graph.facebook.com/v20.0/me/accounts?fields=instagram_business_account,name&access_token=${token}`
      );
      const accData = await accRes.json();
      if (Array.isArray(accData?.data)) {
        for (const page of accData.data) {
          if (page.instagram_business_account?.id) {
            userId = page.instagram_business_account.id;
            break;
          }
        }
      }
      if (!userId) {
        const meRes = await fetch(`https://graph.facebook.com/v20.0/me?fields=id,name&access_token=${token}`);
        const meData = await meRes.json();
        if (meData?.id) userId = meData.id;
      }
    } catch {}
  }

  if (!userId) {
    userId = 'me'; // Fallback to current authenticated entity
  }

  try {
    // 1. Create Media Container for Reel
    const createUrl =
      'https://graph.facebook.com/v20.0/' +
      userId +
      '/media?media_type=REELS&video_url=' +
      encodeURIComponent(videoUrl) +
      '&caption=' +
      encodeURIComponent(caption || '') +
      '&access_token=' +
      token;

    const createRes = await fetch(createUrl, { method: 'POST' });
    const createData = await createRes.json();

    if (!createRes.ok || !createData.id) {
      return NextResponse.json(
        {
          error: createData.error?.message || 'Failed to create Instagram Reel container',
        },
        { status: 502 }
      );
    }

    const creationId = createData.id;

    // 2. Poll container status until ready
    let isReady = false;
    for (let i = 0; i < 20; i++) {
      await new Promise((res) => setTimeout(res, 3000));
      const statusUrl =
        'https://graph.facebook.com/v20.0/' +
        creationId +
        '?fields=status_code&access_token=' +
        token;

      const statusRes = await fetch(statusUrl);
      const statusData = await statusRes.json();
      if (statusData.status_code === 'FINISHED') {
        isReady = true;
        break;
      }
      if (statusData.status_code === 'ERROR') {
        return NextResponse.json({ error: 'Instagram failed to process the video container.' }, { status: 502 });
      }
    }

    if (!isReady) {
      return NextResponse.json({ error: 'Instagram video processing timeout.' }, { status: 504 });
    }

    // 3. Publish Reel
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
      return NextResponse.json({
        error: publishData.error?.message || 'Failed to publish Instagram Reel',
      }, { status: 502 });
    }

    return NextResponse.json({
      success: true,
      postId: publishData.id,
      message: 'Reel published to Instagram successfully!',
    });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Instagram publishing error' }, { status: 500 });
  }
}

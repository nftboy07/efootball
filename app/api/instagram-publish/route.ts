import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  if (!body || !body.videoUrl) {
    return NextResponse.json({ error: 'Missing videoUrl for Instagram publishing.' }, { status: 400 });
  }

  const { videoUrl, caption, accessToken, igUserId } = body;

  const token = accessToken || process.env.INSTAGRAM_ACCESS_TOKEN;
  const userId = igUserId || process.env.INSTAGRAM_ACCOUNT_ID;

  if (!token || !userId) {
    return NextResponse.json({
      error: 'Instagram API credentials not configured. Please provide your Instagram Business Account ID and Access Token in settings.',
      requiresSetup: true,
    }, { status: 400 });
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

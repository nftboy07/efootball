import { NextRequest, NextResponse } from 'next/server';
import { publishReel } from '../../lib/instagram';

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  if (!body || !body.videoUrl) {
    return NextResponse.json({ error: 'Missing videoUrl for Instagram publishing.' }, { status: 400 });
  }

  try {
    const result = await publishReel({
      videoUrl: body.videoUrl,
      caption: body.caption,
      accessToken: body.accessToken,
      igUserId: body.igUserId,
    });
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }
    return NextResponse.json({
      success: true,
      postId: result.postId,
      igUserId: result.igUserId,
      message: 'Reel published to Instagram successfully!',
    });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Instagram publishing error' }, { status: 500 });
  }
}

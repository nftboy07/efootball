import { NextRequest, NextResponse } from 'next/server';

const API_HOST = process.env.NEXT_PUBLIC_BASE_URL || 'https://www.efootball2026.online';

export async function GET(request: NextRequest) {
  // Verify Cron Secret if configured in Vercel
  const authHeader = request.headers.get('authorization');
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized cron request' }, { status: 401 });
  }

  try {
    // 1. Auto-craft superstar prompt
    const promptRes = await fetch(`${API_HOST}/api/auto-prompt`, { method: 'POST' });
    const promptData = await promptRes.json().catch(() => ({}));
    const chosenPrompt =
      promptData.prompt ||
      'Cinematic 9:16 vertical eFootball 2026 mobile goal highlight under bright stadium floodlights with neon yellow visual effects, 4K broadcast quality.';
    const playerTag = promptData.player || 'eFootball Superstar';

    // 2. Generate matching viral Instagram caption
    const copyRes = await fetch(`${API_HOST}/api/generate-copy`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ provider: 'qwen', prompt: chosenPrompt }),
    });
    const copyData = await copyRes.json().catch(() => ({}));
    const caption =
      copyData.text ||
      `${playerTag} makes history in the eFootball 2026 Community Cup! Join free at efootball2026.online 🏆 #eFootball #eFootball2026 #Gaming`;

    // 3. Trigger Alibaba Wan 2.1 video synthesis task
    const reelRes = await fetch(`${API_HOST}/api/generate-reel`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: chosenPrompt, aspectRatio: '9:16', model: 'wan2.1-t2v-turbo' }),
    });
    const reelData = await reelRes.json().catch(() => ({}));

    if (!reelRes.ok || !reelData.taskId) {
      return NextResponse.json({ error: reelData.error || 'Failed to trigger video synthesis' }, { status: 502 });
    }

    return NextResponse.json({
      success: true,
      message: `Cron task triggered: Video synthesis for ${playerTag} started with task ID ${reelData.taskId}`,
      taskId: reelData.taskId,
      player: playerTag,
      caption,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Cron execution failed' }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';

export const maxDuration = 60;

const DASHSCOPE_API_KEY = (process.env.DASHSCOPE_API_KEY || '').trim();
const DASHSCOPE_WORKSPACE = (process.env.DASHSCOPE_WORKSPACE_ID || '').trim();
const DASHSCOPE_HOST =
  process.env.DASHSCOPE_HOST ||
  'https://ws-ol68l9sr3gs9rhj4.ap-southeast-1.maas.aliyuncs.com';
const OPENROUTER_API_KEY = (process.env.OPENROUTER_API_KEY || '').trim();
const OPENROUTER_VIDEO_MODEL = process.env.OPENROUTER_VIDEO_MODEL || 'alibaba/wan-2.6';

function getDashScopeSize(aspectRatio?: string): string {
  switch (aspectRatio) {
    case '16:9':
      return '1280*720';
    case '1:1':
      return '960*960';
    case '9:16':
    default:
      return '720*1280';
  }
}

function normalizeAspect(aspectRatio?: string): '16:9' | '9:16' | '1:1' {
  if (aspectRatio === '16:9' || aspectRatio === '1:1') return aspectRatio;
  return '9:16';
}

function openRouterHeaders() {
  return {
    Authorization: `Bearer ${OPENROUTER_API_KEY}`,
    'Content-Type': 'application/json',
    'HTTP-Referer': 'https://www.efootball2026.online',
    'X-Title': 'eFootball Community Cup',
  };
}

async function pollOpenRouter(jobId: string) {
  const res = await fetch(`https://openrouter.ai/api/v1/videos/${encodeURIComponent(jobId)}`, {
    headers: openRouterHeaders(),
    cache: 'no-store',
  });
  const data = await res.json().catch(() => ({}));
  const status = String(data?.status || 'UNKNOWN').toLowerCase();

  if (status === 'completed') {
    const videoUrl = Array.isArray(data?.unsigned_urls) ? data.unsigned_urls[0] : undefined;
    return NextResponse.json({
      status: 'SUCCEEDED',
      provider: 'openrouter',
      videoUrl,
      video: { url: videoUrl, contentType: 'video/mp4' },
    });
  }

  if (status === 'failed' || status === 'canceled' || status === 'cancelled' || status === 'expired') {
    return NextResponse.json({
      status: 'FAILED',
      provider: 'openrouter',
      error: data?.error || data?.message || 'OpenRouter video generation failed',
    });
  }

  return NextResponse.json({
    status: status === 'in_progress' ? 'RUNNING' : 'PENDING',
    provider: 'openrouter',
    taskId: `or:${jobId}`,
  });
}

async function pollDashScope(taskId: string) {
  const queryRes = await fetch(`${DASHSCOPE_HOST}/api/v1/tasks/${taskId}`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${DASHSCOPE_API_KEY}`,
      'X-DashScope-WorkSpace': DASHSCOPE_WORKSPACE,
    },
  });
  const queryData = await queryRes.json();
  const status = queryData?.output?.task_status || 'UNKNOWN';

  if (status === 'SUCCEEDED') {
    const videoUrl = queryData?.output?.video_url;
    return NextResponse.json({
      status: 'SUCCEEDED',
      provider: 'dashscope',
      videoUrl,
      video: { url: videoUrl, contentType: 'video/mp4' },
    });
  }

  if (status === 'FAILED' || status === 'CANCELED') {
    return NextResponse.json({
      status: 'FAILED',
      provider: 'dashscope',
      error: queryData?.output?.message || queryData?.message || 'Video generation failed on Alibaba Model Studio',
    });
  }

  return NextResponse.json({
    status: status || 'RUNNING',
    provider: 'dashscope',
    taskId,
    submitTime: queryData?.output?.submit_time,
    scheduledTime: queryData?.output?.scheduled_time,
  });
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const rawId = searchParams.get('taskId');
  if (!rawId) {
    return NextResponse.json({ error: 'Missing taskId parameter' }, { status: 400 });
  }

  try {
    if (rawId.startsWith('or:')) {
      if (!OPENROUTER_API_KEY) {
        return NextResponse.json({ error: 'OPENROUTER_API_KEY is not configured.' }, { status: 503 });
      }
      return await pollOpenRouter(rawId.slice(3));
    }
    if (DASHSCOPE_API_KEY) {
      return await pollDashScope(rawId);
    }
    if (OPENROUTER_API_KEY) {
      return await pollOpenRouter(rawId);
    }
    return NextResponse.json(
      { error: 'No video API key configured. Set OPENROUTER_API_KEY (or DASHSCOPE_API_KEY) on Vercel.' },
      { status: 503 }
    );
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to query task status' }, { status: 502 });
  }
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  if (!body || typeof body.prompt !== 'string' || body.prompt.trim().length < 5) {
    return NextResponse.json({ error: 'Please enter a descriptive prompt for video generation.' }, { status: 400 });
  }

  const prompt = body.prompt.trim();
  const aspectRatio = normalizeAspect(body.aspectRatio || body.aspect_ratio);

  if (DASHSCOPE_API_KEY) {
    const model = body.model || 'wan2.1-t2v-turbo';
    const size = getDashScopeSize(aspectRatio);
    try {
      const createRes = await fetch(`${DASHSCOPE_HOST}/api/v1/services/aigc/video-generation/video-synthesis`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${DASHSCOPE_API_KEY}`,
          'X-DashScope-WorkSpace': DASHSCOPE_WORKSPACE,
          'X-DashScope-Async': 'enable',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          input: { prompt },
          parameters: { size },
        }),
      });
      const createData = await createRes.json();
      if (!createRes.ok || !createData?.output?.task_id) {
        const errMsg = createData?.message || createData?.code || 'Failed to submit video generation task';
        return NextResponse.json({ error: errMsg }, { status: 502 });
      }
      return NextResponse.json({
        taskId: createData.output.task_id,
        status: 'PENDING',
        provider: 'dashscope',
        model,
        estimatedSeconds: model === 'wan2.1-t2v-plus' ? 90 : 60,
      });
    } catch (error: any) {
      return NextResponse.json(
        { error: error?.message || 'Wan video generation request failed' },
        { status: 502 }
      );
    }
  }

  if (!OPENROUTER_API_KEY) {
    return NextResponse.json(
      {
        error:
          'No video API key configured. Add OPENROUTER_API_KEY on Vercel (recommended) or DASHSCOPE_API_KEY for Alibaba Model Studio.',
      },
      { status: 503 }
    );
  }

  const model =
    typeof body.openrouterModel === 'string' && body.openrouterModel
      ? body.openrouterModel
      : OPENROUTER_VIDEO_MODEL;

  try {
    const createRes = await fetch('https://openrouter.ai/api/v1/videos', {
      method: 'POST',
      headers: openRouterHeaders(),
      body: JSON.stringify({
        model,
        prompt,
        duration: 5,
        resolution: '720p',
        aspect_ratio: aspectRatio,
      }),
    });
    const createData = await createRes.json().catch(() => ({}));
    const jobId = createData?.id;
    if (!createRes.ok || !jobId) {
      const errMsg =
        createData?.error?.message || createData?.error || createData?.message || 'Failed to submit OpenRouter video job';
      return NextResponse.json({ error: errMsg }, { status: createRes.status >= 400 ? createRes.status : 502 });
    }
    return NextResponse.json({
      taskId: `or:${jobId}`,
      status: 'PENDING',
      provider: 'openrouter',
      model,
      estimatedSeconds: 90,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'OpenRouter video generation request failed' },
      { status: 502 }
    );
  }
}

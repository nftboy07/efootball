import { NextRequest, NextResponse } from 'next/server';

export const maxDuration = 60;

const DEFAULT_API_KEY = process.env.DASHSCOPE_API_KEY || '';

const DEFAULT_WORKSPACE = process.env.DASHSCOPE_WORKSPACE_ID || '';

const DEFAULT_HOST =
  process.env.DASHSCOPE_HOST ||
  'https://ws-ol68l9sr3gs9rhj4.ap-southeast-1.maas.aliyuncs.com';

function getResolution(aspectRatio?: string): string {
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

// 1. QUERY TASK STATUS (CLIENT POLLING)
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const taskId = searchParams.get('taskId');

  if (!taskId) {
    return NextResponse.json({ error: 'Missing taskId parameter' }, { status: 400 });
  }
  if (!DEFAULT_API_KEY) {
    return NextResponse.json({ error: 'DASHSCOPE_API_KEY is not configured.' }, { status: 503 });
  }

  try {
    const queryRes = await fetch(`${DEFAULT_HOST}/api/v1/tasks/${taskId}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${DEFAULT_API_KEY}`,
        'X-DashScope-WorkSpace': DEFAULT_WORKSPACE,
      },
    });

    const queryData = await queryRes.json();
    const status = queryData?.output?.task_status || 'UNKNOWN';

    if (status === 'SUCCEEDED') {
      const videoUrl = queryData?.output?.video_url;
      return NextResponse.json({
        status: 'SUCCEEDED',
        videoUrl,
        video: {
          url: videoUrl,
          contentType: 'video/mp4',
        },
      });
    }

    if (status === 'FAILED' || status === 'CANCELED') {
      const errorMsg = queryData?.output?.message || queryData?.message || 'Video generation failed on Alibaba Model Studio';
      return NextResponse.json({
        status: 'FAILED',
        error: errorMsg,
      });
    }

    // PENDING or RUNNING
    return NextResponse.json({
      status: status || 'RUNNING',
      taskId,
      submitTime: queryData?.output?.submit_time,
      scheduledTime: queryData?.output?.scheduled_time,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to query task status' }, { status: 502 });
  }
}

// 2. SUBMIT VIDEO GENERATION TASK
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  if (!body || typeof body.prompt !== 'string' || body.prompt.trim().length < 5) {
    return NextResponse.json({ error: 'Please enter a descriptive prompt for video generation.' }, { status: 400 });
  }

  if (!DEFAULT_API_KEY) {
    return NextResponse.json({ error: 'DASHSCOPE_API_KEY is not configured.' }, { status: 503 });
  }

  const prompt = body.prompt.trim();
  const model = body.model || 'wan2.1-t2v-turbo'; // wan2.1-t2v-turbo or wan2.1-t2v-plus
  const size = getResolution(body.aspectRatio || body.aspect_ratio);

  try {
    const createRes = await fetch(`${DEFAULT_HOST}/api/v1/services/aigc/video-generation/video-synthesis`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${DEFAULT_API_KEY}`,
        'X-DashScope-WorkSpace': DEFAULT_WORKSPACE,
        'X-DashScope-Async': 'enable',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        input: {
          prompt,
        },
        parameters: {
          size,
        },
      }),
    });

    const createData = await createRes.json();
    if (!createRes.ok || !createData?.output?.task_id) {
      const errMsg = createData?.message || createData?.code || 'Failed to submit video generation task';
      return NextResponse.json({ error: errMsg }, { status: 502 });
    }

    const taskId = createData.output.task_id;
    const estimatedSeconds = model === 'wan2.1-t2v-plus' ? 90 : 60;

    return NextResponse.json({
      taskId,
      status: 'PENDING',
      model,
      estimatedSeconds,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Wan 2.1 video generation request failed' },
      { status: 502 }
    );
  }
}


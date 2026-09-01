import { NextRequest, NextResponse } from 'next/server';

export const maxDuration = 600; // Allow sufficient time for AI video synthesis

const DEFAULT_API_KEY =
  process.env.DASHSCOPE_API_KEY ||
  'sk-ws-H.DDHDXEX.qvKW.MEQCIFeS2JXp1n4lslRc0z6iOqIZgUF24gNojvWMTS1_KIUAAiAmru1uflsT1iRv9vbfChiGUN8oV4eKqZsEHWcquw_w-w';

const DEFAULT_WORKSPACE = process.env.DASHSCOPE_WORKSPACE_ID || 'ws-ol68l9sr3gs9rhj4';

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

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  if (!body || typeof body.prompt !== 'string' || body.prompt.trim().length < 5) {
    return NextResponse.json({ error: 'Please enter a descriptive prompt for video generation.' }, { status: 400 });
  }

  const prompt = body.prompt.trim();
  const model = body.model || 'wan2.1-t2v-turbo'; // wan2.1-t2v-turbo or wan2.1-t2v-plus
  const size = getResolution(body.aspectRatio || body.aspect_ratio);

  try {
    // 1. Submit video generation task to Alibaba Model Studio / DashScope
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

    // 2. Poll the task until finished or timeout
    const startTime = Date.now();
    const maxWaitMs = 180000; // 3 minutes poll limit
    let videoUrl = '';

    while (Date.now() - startTime < maxWaitMs) {
      await new Promise((resolve) => setTimeout(resolve, 4000));

      const queryRes = await fetch(`${DEFAULT_HOST}/api/v1/tasks/${taskId}`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${DEFAULT_API_KEY}`,
          'X-DashScope-WorkSpace': DEFAULT_WORKSPACE,
        },
      });

      const queryData = await queryRes.json();
      const status = queryData?.output?.task_status;

      if (status === 'SUCCEEDED') {
        videoUrl = queryData.output.video_url;
        break;
      } else if (status === 'FAILED' || status === 'CANCELED') {
        const failureReason = queryData?.output?.message || queryData?.message || 'Video generation task failed';
        return NextResponse.json({ error: failureReason }, { status: 502 });
      }
      // Status is PENDING or RUNNING -> continue polling
    }

    if (!videoUrl) {
      return NextResponse.json(
        {
          error: 'Video generation is still processing. You can check back with task ID: ' + taskId,
          taskId,
        },
        { status: 202 }
      );
    }

    return NextResponse.json({
      video: {
        url: videoUrl,
        contentType: 'video/mp4',
        model,
        taskId,
      },
      url: videoUrl,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Wan 2.1 video generation request failed' },
      { status: 502 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';

const hfModel = 'black-forest-labs/FLUX.1-schnell';

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  if (!body || typeof body.prompt !== 'string' || body.prompt.trim().length < 5) {
    return NextResponse.json({ error: 'Enter a descriptive prompt.' }, { status: 400 });
  }

  const prompt = encodeURIComponent(body.prompt.trim());
  const provider = body.provider || 'pollinations-image';

  try {
    if (provider === 'hf-image') {
      const token = process.env.HF_TOKEN;
      if (token) {
        const r = await fetch(`https://router.huggingface.co/hf-inference/models/${hfModel}`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ inputs: body.prompt.trim(), parameters: { width: 768, height: 1365 } }),
        });
        if (r.ok) {
          const data = await r.arrayBuffer();
          return NextResponse.json({
            media: { url: `data:image/png;base64,${Buffer.from(data).toString('base64')}`, contentType: 'image/png' },
          });
        }
      }
    }

    // Default to ultra-fast Pollinations AI image synthesis (free, no keys required)
    return NextResponse.json({
      media: {
        url: `https://image.pollinations.ai/prompt/${prompt}?width=1080&height=1920&nologo=true`,
        contentType: 'image/jpeg',
      },
    });
  } catch {
    return NextResponse.json({
      media: {
        url: `https://image.pollinations.ai/prompt/${prompt}?width=1080&height=1920&nologo=true`,
        contentType: 'image/jpeg',
      },
    });
  }
}

import { NextRequest, NextResponse } from 'next/server';

const DASHSCOPE_KEY = (process.env.DASHSCOPE_API_KEY || '').trim();
const DASHSCOPE_WORKSPACE = (process.env.DASHSCOPE_WORKSPACE_ID || '').trim();
const OPENROUTER_KEY = (process.env.OPENROUTER_API_KEY || '').trim();

const providers = {
  qwen: {
    url: 'https://ws-ol68l9sr3gs9rhj4.ap-southeast-1.maas.aliyuncs.com/compatible-mode/v1/chat/completions',
    key: DASHSCOPE_KEY,
    workspace: DASHSCOPE_WORKSPACE,
    model: 'qwen-plus',
  },
  openrouter: {
    url: 'https://openrouter.ai/api/v1/chat/completions',
    key: OPENROUTER_KEY,
    model: 'meta-llama/llama-3.3-70b-instruct',
  },
  groq: {
    url: 'https://api.groq.com/openai/v1/chat/completions',
    key: process.env.GROQ_API_KEY,
    model: 'llama-3.3-70b-versatile',
  },
  nvidia: {
    url: 'https://integrate.api.nvidia.com/v1/chat/completions',
    key: process.env.NVIDIA_API_KEY,
    model: 'meta/llama-3.1-70b-instruct',
  },
} as const;

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  if (!body || typeof body.prompt !== 'string' || body.prompt.trim().length < 5) {
    return NextResponse.json({ error: 'Enter a descriptive copy prompt.' }, { status: 400 });
  }

  let provider = (body.provider as keyof typeof providers) || 'qwen';
  let config = providers[provider] || providers.qwen;

  if (!(config.key || '').trim() && OPENROUTER_KEY) {
    provider = 'openrouter';
    config = providers.openrouter;
  }

  const key = (config.key || OPENROUTER_KEY || DASHSCOPE_KEY || '').trim();
  if (!key) {
    return NextResponse.json(
      { error: 'No copy API key configured. Set OPENROUTER_API_KEY on Vercel.' },
      { status: 503 }
    );
  }

  const headers: Record<string, string> = {
    Authorization: `Bearer ${key}`,
    'Content-Type': 'application/json',
  };

  if (provider === 'openrouter') {
    headers['HTTP-Referer'] = 'https://www.efootball2026.online';
    headers['X-Title'] = 'eFootball Community Cup';
  }

  if ('workspace' in config && config.workspace) {
    headers['X-DashScope-WorkSpace'] = config.workspace;
  }

  const response = await fetch(config.url, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      model: config.model,
      messages: [
        {
          role: 'system',
          content:
            'Write concise, high-energy social media copy and hashtags for an eFootball 2026 esports community tournament.',
        },
        { role: 'user', content: body.prompt.trim() },
      ],
      temperature: 0.8,
      max_tokens: 400,
    }),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    return NextResponse.json(
      { error: data.error?.message || data.error || `${provider} copy request failed (${response.status})` },
      { status: response.status }
    );
  }

  const text = data.choices?.[0]?.message?.content;
  if (typeof text !== 'string' || !text.trim()) {
    return NextResponse.json({ error: 'The provider returned no copy.' }, { status: 502 });
  }

  return NextResponse.json({ text: text.trim(), provider });
}

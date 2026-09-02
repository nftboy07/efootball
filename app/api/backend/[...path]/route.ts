import { NextRequest, NextResponse } from 'next/server';
import { TOURNAMENT_API } from '../../../lib/config';
import { requireAdmin } from '../../../lib/admin-auth';

const BLOCKED = new Set(['upload']);

export async function GET(request: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  return proxy(request, ctx);
}

export async function POST(request: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  return proxy(request, ctx);
}

export async function PUT(request: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  return proxy(request, ctx);
}

export async function PATCH(request: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  return proxy(request, ctx);
}

export async function DELETE(request: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  return proxy(request, ctx);
}

async function proxy(request: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  const auth = await requireAdmin(request);
  if (!auth.ok) return auth.response;

  const { path } = await ctx.params;
  const segments = path || [];
  if (!segments.length || BLOCKED.has(segments[0])) {
    return NextResponse.json({ error: 'Unsupported backend path' }, { status: 400 });
  }

  const search = request.nextUrl.search || '';
  const target = `${TOURNAMENT_API}/api/${segments.map(encodeURIComponent).join('/')}${search}`;
  const headers: Record<string, string> = {
    'X-Admin-Key': auth.adminKey,
  };
  const contentType = request.headers.get('content-type');
  if (contentType) headers['Content-Type'] = contentType;

  const init: RequestInit = { method: request.method, headers };
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    const buf = await request.arrayBuffer();
    if (buf.byteLength) init.body = buf;
  }

  try {
    const res = await fetch(target, init);
    const text = await res.text();
    return new NextResponse(text, {
      status: res.status,
      headers: { 'Content-Type': res.headers.get('content-type') || 'application/json' },
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || 'Tournament API unreachable', detail: 'Tournament API unreachable' },
      { status: 502 }
    );
  }
}

import { NextResponse } from 'next/server';
import { TOURNAMENT_API } from '../../../lib/config';
import { inspectTokenHealth } from '../../../lib/instagram';

export async function GET() {
  const start = Date.now();
  const checks: Record<string, { status: string; latencyMs: number; detail?: string }> = {};

  try {
    const t0 = Date.now();
    const res = await fetch(`${TOURNAMENT_API}/health`, { cache: 'no-store' });
    const data = await res.json().catch(() => ({}));
    checks.renderApi = {
      status: res.ok ? 'ONLINE' : 'DEGRADED',
      latencyMs: Date.now() - t0,
      detail: data.database || data.status,
    };
  } catch {
    checks.renderApi = { status: 'OFFLINE', latencyMs: -1, detail: 'Unreachable' };
  }

  const dashscopeKey = Boolean((process.env.DASHSCOPE_API_KEY || '').trim());
  const openrouterKey = Boolean((process.env.OPENROUTER_API_KEY || '').trim());
  checks.dashscope = {
    status: dashscopeKey ? 'CONFIGURED' : 'UNCONFIGURED',
    latencyMs: 0,
    detail: dashscopeKey ? 'DASHSCOPE_API_KEY set' : 'not-set',
  };
  checks.openrouter = {
    status: openrouterKey ? 'CONFIGURED' : 'UNCONFIGURED',
    latencyMs: 0,
    detail: openrouterKey ? 'OPENROUTER_API_KEY set' : 'not-set',
  };

  try {
    const t0 = Date.now();
    const host =
      process.env.DASHSCOPE_HOST || 'https://ws-ol68l9sr3gs9rhj4.ap-southeast-1.maas.aliyuncs.com';
    const res = await fetch(host, { method: 'GET', cache: 'no-store' });
    checks.alibabaCloud = {
      status: res.ok || res.status < 500 ? 'ONLINE' : 'DEGRADED',
      latencyMs: Date.now() - t0,
    };
  } catch {
    checks.alibabaCloud = { status: 'OFFLINE', latencyMs: -1 };
  }

  try {
    const t0 = Date.now();
    const openrouterHeaders: Record<string, string> = {};
    if (openrouterKey) {
      openrouterHeaders['Authorization'] = `Bearer ${process.env.OPENROUTER_API_KEY}`;
    }
    const res = await fetch('https://openrouter.ai/api/v1/models', {
      headers: openrouterHeaders,
      cache: 'no-store',
    });
    checks.openrouterApi = {
      status: res.ok || res.status === 401 ? 'ONLINE' : 'DEGRADED',
      latencyMs: Date.now() - t0,
    };
  } catch {
    checks.openrouterApi = { status: 'OFFLINE', latencyMs: -1 };
  }

  try {
    const t0 = Date.now();
    const res = await fetch('https://graph.facebook.com/v20.0/', { cache: 'no-store' });
    checks.metaGraphApi = {
      status: res.ok || res.status === 400 ? 'ONLINE' : 'DEGRADED',
      latencyMs: Date.now() - t0,
    };
  } catch {
    checks.metaGraphApi = { status: 'OFFLINE', latencyMs: -1 };
  }
  const ig = await inspectTokenHealth();
  checks.instagramToken = {
    status: !ig.configured ? 'UNCONFIGURED' : ig.valid ? 'ONLINE' : ig.isExpired ? 'EXPIRED' : 'DEGRADED',
    latencyMs: 0,
    detail: ig.valid ? 'token-ok' : ig.configured ? 'token-invalid' : 'not-set',
  };

  return NextResponse.json({
    success: true,
    totalElapsedMs: Date.now() - start,
    timestamp: new Date().toISOString(),
    videoProvider: dashscopeKey ? 'dashscope' : openrouterKey ? 'openrouter' : 'none',
    services: checks,
  });
}

import { NextResponse } from 'next/server';

export function getServiceAdminKey(): string {
  return (process.env.ADMIN_KEY || '').trim();
}

export function serviceAdmin(overrideKey?: string): { ok: boolean; adminKey: string; response?: NextResponse } {
  const adminKey = (overrideKey || getServiceAdminKey() || '').trim();
  return { ok: true, adminKey };
}

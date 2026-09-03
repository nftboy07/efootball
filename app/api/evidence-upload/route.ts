import { NextRequest, NextResponse } from 'next/server';
import { uploadEvidenceImage } from '../../lib/storage';

export const maxDuration = 30;

export async function POST(request: NextRequest) {
  const playerToken = request.headers.get('x-player-token');
  const adminKey = request.headers.get('x-admin-key');
  if (!playerToken && !adminKey) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  const form = await request.formData().catch(() => null);
  const file = form?.get('file');
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'file field is required' }, { status: 400 });
  }

  const result = await uploadEvidenceImage(file, { playerToken, adminKey });
  if ('error' in result) {
    return NextResponse.json({ error: result.error, detail: result.error }, { status: result.status });
  }
  return NextResponse.json({ url: result.url, provider: result.provider });
}

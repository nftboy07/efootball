import { createHash } from 'crypto';
import { TOURNAMENT_API } from './config';

const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES = new Set(['image/png', 'image/jpeg', 'image/jpg', 'image/webp']);

export type UploadAuth = {
  playerToken?: string | null;
  adminKey?: string | null;
};

export function validateImage(file: File | null): { ok: true } | { ok: false; error: string; status: number } {
  if (!file) return { ok: false, error: 'No image file provided', status: 400 };
  const type = (file.type || '').toLowerCase();
  if (!ALLOWED_TYPES.has(type) && !type.startsWith('image/')) {
    return { ok: false, error: 'Only image files are supported (png, jpg, webp)', status: 400 };
  }
  if (file.size > MAX_BYTES) {
    return { ok: false, error: 'Image must be smaller than 5MB', status: 413 };
  }
  return { ok: true };
}

function parseCloudinaryUrl(raw: string) {
  try {
    const u = new URL(raw);
    if (u.protocol !== 'cloudinary:') return null;
    return {
      key: decodeURIComponent(u.username),
      secret: decodeURIComponent(u.password),
      cloud: u.hostname,
    };
  } catch {
    return null;
  }
}

async function uploadCloudinary(buffer: Buffer, filename: string, contentType: string): Promise<string | null> {
  const parsed = parseCloudinaryUrl(process.env.CLOUDINARY_URL || '');
  if (!parsed) return null;
  const timestamp = Math.floor(Date.now() / 1000);
  const folder = 'efootball/evidence';
  const toSign = `folder=${folder}&timestamp=${timestamp}${parsed.secret}`;
  const signature = createHash('sha1').update(toSign).digest('hex');

  const form = new FormData();
  form.set('file', new Blob([new Uint8Array(buffer)], { type: contentType }), filename);
  form.set('api_key', parsed.key);
  form.set('timestamp', String(timestamp));
  form.set('signature', signature);
  form.set('folder', folder);

  const res = await fetch(`https://api.cloudinary.com/v1_1/${parsed.cloud}/image/upload`, {
    method: 'POST',
    body: form,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.secure_url) return null;
  return data.secure_url as string;
}

async function uploadSupabase(buffer: Buffer, filename: string, contentType: string): Promise<string | null> {
  const base = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '').replace(/\/$/, '');
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  if (!base || !key) return null;
  const bucket = process.env.SUPABASE_EVIDENCE_BUCKET || 'match-evidence';
  const objectPath = `${Date.now()}-${filename.replace(/[^a-zA-Z0-9._-]/g, '_')}`;

  const res = await fetch(`${base}/storage/v1/object/${bucket}/${objectPath}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      apikey: key,
      'Content-Type': contentType,
      'x-upsert': 'false',
    },
    body: new Uint8Array(buffer),
  });
  if (!res.ok) return null;

  const publicUrl = `${base}/storage/v1/object/public/${bucket}/${objectPath}`;
  return publicUrl;
}

async function uploadFastApi(file: File, auth: UploadAuth): Promise<{ url?: string; error?: string; status: number } | null> {
  const form = new FormData();
  form.set('file', file);
  const headers: Record<string, string> = {};
  if (auth.playerToken) headers['X-Player-Token'] = auth.playerToken;
  if (auth.adminKey) headers['X-Admin-Key'] = auth.adminKey;

  try {
    const res = await fetch(`${TOURNAMENT_API}/api/upload`, {
      method: 'POST',
      headers,
      body: form,
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok && data.url) return { url: data.url, status: 200 };
    if (res.status === 503) return null;
    return { error: data.detail || data.error || 'Upload failed', status: res.status };
  } catch {
    return null;
  }
}

export async function uploadEvidenceImage(
  file: File,
  auth: UploadAuth
): Promise<{ url: string; provider: string } | { error: string; status: number }> {
  const check = validateImage(file);
  if (!check.ok) return { error: check.error, status: check.status };
  if (!auth.playerToken && !auth.adminKey) {
    return { error: 'Authentication required', status: 401 };
  }

  const viaApi = await uploadFastApi(file, auth);
  if (viaApi?.url) return { url: viaApi.url, provider: 'cloudinary-api' };
  if (viaApi?.error && viaApi.status !== 503) return { error: viaApi.error, status: viaApi.status };

  const buffer = Buffer.from(await file.arrayBuffer());
  const filename = file.name || 'evidence.jpg';

  const cloudinary = await uploadCloudinary(buffer, filename, file.type || 'image/jpeg');
  if (cloudinary) return { url: cloudinary, provider: 'cloudinary' };

  const supabase = await uploadSupabase(buffer, filename, file.type || 'image/jpeg');
  if (supabase) return { url: supabase, provider: 'supabase' };

  return {
    error:
      'Image storage is not configured. Set CLOUDINARY_URL on the FastAPI service (or Vercel), or SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY, or paste an HTTPS evidence URL instead.',
    status: 503,
  };
}

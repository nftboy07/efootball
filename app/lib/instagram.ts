import { GRAPH_API } from './config';

export type InstagramCredentials = {
  token: string;
  userId?: string;
  source: 'env' | 'request';
};

export type InstagramHealth = {
  configured: boolean;
  valid: boolean;
  source: 'env' | 'request' | 'none';
  error?: string;
  isExpired?: boolean;
  user?: { id?: string; name?: string };
  instagramAccount?: { id: string; username?: string } | null;
  expiresAt?: string | null;
  scopes?: string[];
};

export function resolveCredentials(override?: { accessToken?: string; igUserId?: string }): InstagramCredentials | null {
  const token = (override?.accessToken || process.env.INSTAGRAM_ACCESS_TOKEN || '').trim();
  if (!token) return null;
  const userId = (override?.igUserId || process.env.INSTAGRAM_ACCOUNT_ID || '').trim() || undefined;
  return {
    token,
    userId,
    source: override?.accessToken ? 'request' : 'env',
  };
}

async function graphGet(path: string, token: string, extra?: Record<string, string>) {
  const url = new URL(`${GRAPH_API}${path.startsWith('/') ? path : `/${path}`}`);
  url.searchParams.set('access_token', token);
  if (extra) {
    for (const [k, v] of Object.entries(extra)) url.searchParams.set(k, v);
  }
  const res = await fetch(url.toString(), { cache: 'no-store' });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data };
}

export async function discoverInstagramAccount(token: string): Promise<{ id: string; username?: string } | null> {
  const accounts = await graphGet('/me/accounts', token, {
    fields: 'id,name,instagram_business_account{id,username}',
  });
  if (Array.isArray(accounts.data?.data)) {
    for (const page of accounts.data.data) {
      if (page?.instagram_business_account?.id) {
        return {
          id: page.instagram_business_account.id,
          username: page.instagram_business_account.username,
        };
      }
    }
  }

  const igUser = await graphGet('/me', token, { fields: 'id,username,account_type' });
  if (igUser.data?.id && !igUser.data?.error) {
    const accountType = String(igUser.data.account_type || '').toUpperCase();
    if (!accountType || accountType.includes('BUSINESS') || accountType.includes('CREATOR') || accountType.includes('MEDIA')) {
      return { id: igUser.data.id, username: igUser.data.username };
    }
    return { id: igUser.data.id, username: igUser.data.username };
  }

  return null;
}

export async function inspectTokenHealth(override?: {
  accessToken?: string;
  igUserId?: string;
}): Promise<InstagramHealth> {
  const creds = resolveCredentials(override);
  if (!creds) {
    return {
      configured: false,
      valid: false,
      source: 'none',
      error: 'INSTAGRAM_ACCESS_TOKEN is not configured. Set it in Vercel env (INSTAGRAM_ACCESS_TOKEN / INSTAGRAM_ACCOUNT_ID).',
    };
  }

  try {
    const me = await graphGet('/me', creds.token, { fields: 'id,name,username' });
    if (me.data?.error) {
      const code = me.data.error.code;
      const subcode = me.data.error.error_subcode;
      return {
        configured: true,
        valid: false,
        source: creds.source,
        error: me.data.error.message || 'Instagram token was rejected',
        isExpired: subcode === 463 || code === 190,
      };
    }

    const debug = await graphGet('/debug_token', creds.token, { input_token: creds.token });
    const debugData = debug.data?.data || {};
    const expiresAt =
      typeof debugData.expires_at === 'number' && debugData.expires_at > 0
        ? new Date(debugData.expires_at * 1000).toISOString()
        : debugData.expires_at === 0
          ? null
          : null;

    const igAccount =
      (creds.userId ? { id: creds.userId } : null) || (await discoverInstagramAccount(creds.token));

    return {
      configured: true,
      valid: true,
      source: creds.source,
      user: { id: me.data?.id, name: me.data?.name || me.data?.username },
      instagramAccount: igAccount,
      expiresAt,
      scopes: Array.isArray(debugData.scopes) ? debugData.scopes : undefined,
    };
  } catch (err: any) {
    return {
      configured: true,
      valid: false,
      source: creds.source,
      error: err?.message || 'Failed to reach Meta Graph API',
    };
  }
}

export async function publishReel(opts: {
  videoUrl: string;
  caption?: string;
  accessToken?: string;
  igUserId?: string;
}): Promise<{ success: true; postId: string; igUserId: string } | { success: false; error: string; status: number }> {
  const creds = resolveCredentials({ accessToken: opts.accessToken, igUserId: opts.igUserId });
  if (!creds) {
    return { success: false, error: 'Instagram credentials are not configured.', status: 503 };
  }

  let userId = creds.userId;
  if (!userId) {
    const discovered = await discoverInstagramAccount(creds.token);
    userId = discovered?.id;
  }
  if (!userId) {
    return {
      success: false,
      error: 'Could not resolve Instagram professional account ID from the access token.',
      status: 400,
    };
  }

  const createUrl = new URL(`${GRAPH_API}/${userId}/media`);
  createUrl.searchParams.set('media_type', 'REELS');
  createUrl.searchParams.set('video_url', opts.videoUrl);
  createUrl.searchParams.set('caption', opts.caption || '');
  createUrl.searchParams.set('access_token', creds.token);

  const createRes = await fetch(createUrl.toString(), { method: 'POST' });
  const createData = await createRes.json().catch(() => ({}));
  if (!createRes.ok || !createData.id) {
    return {
      success: false,
      error: createData.error?.message || 'Failed to create Instagram Reel container',
      status: 502,
    };
  }

  const creationId = createData.id as string;
  let isReady = false;
  for (let i = 0; i < 20; i++) {
    await new Promise((r) => setTimeout(r, 3000));
    const status = await graphGet(`/${creationId}`, creds.token, { fields: 'status_code,status' });
    const code = status.data?.status_code;
    if (code === 'FINISHED') {
      isReady = true;
      break;
    }
    if (code === 'ERROR') {
      return {
        success: false,
        error: status.data?.status || 'Instagram failed to process the video container.',
        status: 502,
      };
    }
  }

  if (!isReady) {
    return { success: false, error: 'Instagram video processing timed out. Retry publish in a minute.', status: 504 };
  }

  const publishUrl = new URL(`${GRAPH_API}/${userId}/media_publish`);
  publishUrl.searchParams.set('creation_id', creationId);
  publishUrl.searchParams.set('access_token', creds.token);

  const publishRes = await fetch(publishUrl.toString(), { method: 'POST' });
  const publishData = await publishRes.json().catch(() => ({}));
  if (!publishRes.ok || !publishData.id) {
    return {
      success: false,
      error: publishData.error?.message || 'Failed to publish Instagram Reel',
      status: 502,
    };
  }

  return { success: true, postId: publishData.id, igUserId: userId };
}

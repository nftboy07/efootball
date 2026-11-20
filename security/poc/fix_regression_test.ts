/**
 * Regression tests for the auth fix on the Instagram publish, admin and cron routes.
 * Drives the real route handlers; only external HTTP (Meta Graph API, internal
 * fetches) is mocked via global.fetch. Run: npm run test:security
 */
const ADMIN_KEY = 'correct-admin-key-123456';
const SERVER_TOKEN = 'SERVER_ONLY_SECRET_ig_token';
process.env.ADMIN_KEY = ADMIN_KEY;
process.env.INSTAGRAM_ACCESS_TOKEN = SERVER_TOKEN;
process.env.INSTAGRAM_ACCOUNT_ID = '17841400000000000';

let externalCalls: string[] = [];
globalThis.fetch = (async (input: any, init?: any) => {
  const url = typeof input === 'string' ? input : input.url;
  externalCalls.push(`${(init?.method || 'GET').toUpperCase()} ${url.split('?')[0]}`);
  const u = new URL(url);
  const json = (o: any) => new Response(JSON.stringify(o), { status: 200, headers: { 'content-type': 'application/json' } });
  if (u.pathname.endsWith('/media')) return json({ id: 'C1' });
  if (u.pathname.endsWith('/C1')) return json({ status_code: 'FINISHED' });
  if (u.pathname.endsWith('/media_publish')) return json({ id: 'P1' });
  return json({ id: 'x', status: 'ok' });
}) as typeof fetch;

async function main() {
  const { NextRequest } = await import('next/server');
  const publish = await import('../../app/api/instagram-publish/route');
  const status = await import('../../app/api/admin/instagram-status/route');
  const ping = await import('../../app/api/admin/ping/route');
  const cron = await import('../../app/api/cron/auto-reel/route');

  const req = (path: string, method = 'GET', headers: Record<string, string> = {}, body?: any) =>
    new NextRequest(`http://site.example${path}`, {
      method,
      headers: { 'content-type': 'application/json', ...headers },
      body: body ? JSON.stringify(body) : undefined,
    });
  const evil = { videoUrl: 'https://attacker.example/evil.mp4', caption: 'x' };

  const results: [string, boolean][] = [];
  const check = (name: string, ok: boolean) => results.push([name, ok]);

  externalCalls = [];
  let r = await publish.POST(req('/api/instagram-publish', 'POST', {}, evil));
  check('publish: no key -> 401, nothing sent to Meta', r.status === 401 && externalCalls.length === 0);

  externalCalls = [];
  r = await publish.POST(req('/api/instagram-publish', 'POST', { 'x-admin-key': 'wrong-key-000000' }, evil));
  check('publish: wrong key -> 401, nothing sent to Meta', r.status === 401 && externalCalls.length === 0);

  externalCalls = [];
  r = await publish.POST(req('/api/instagram-publish', 'POST', { 'x-admin-key': ADMIN_KEY }, evil));
  check('publish: valid admin key -> 200 (admin flow still works)', r.status === 200 && (await r.json()).success === true);

  externalCalls = [];
  r = await status.GET(req('/api/admin/instagram-status'));
  check('instagram-status GET: no key -> 401, no token check', r.status === 401 && externalCalls.length === 0);
  r = await status.POST(req('/api/admin/instagram-status', 'POST', {}, {}));
  check('instagram-status POST: no key -> 401', r.status === 401 && externalCalls.length === 0);
  r = await status.GET(req('/api/admin/instagram-status', 'GET', { 'x-admin-key': ADMIN_KEY }));
  check('instagram-status GET: valid key -> 200', r.status === 200);

  externalCalls = [];
  r = await ping.GET(req('/api/admin/ping'));
  check('ping: no key -> 401, no outbound checks', r.status === 401 && externalCalls.length === 0);
  r = await ping.GET(req('/api/admin/ping', 'GET', { 'x-admin-key': ADMIN_KEY }));
  check('ping: valid key -> 200', r.status === 200);

  delete process.env.CRON_SECRET;
  externalCalls = [];
  r = await cron.GET(req('/api/cron/auto-reel'));
  check('cron: CRON_SECRET unset -> 401 (fails closed)', r.status === 401 && externalCalls.length === 0);
  r = await cron.GET(req('/api/cron/auto-reel', 'GET', { authorization: 'Bearer ' }));
  check('cron: CRON_SECRET unset + empty bearer -> 401', r.status === 401 && externalCalls.length === 0);
  process.env.CRON_SECRET = 'cron-secret-abc';
  r = await cron.GET(req('/api/cron/auto-reel', 'GET', { authorization: 'Bearer wrong' }));
  check('cron: wrong secret -> 401', r.status === 401 && externalCalls.length === 0);
  r = await cron.GET(req('/api/cron/auto-reel', 'GET', { authorization: 'Bearer cron-secret-abc' }));
  check('cron: correct secret -> passes auth', r.status !== 401);

  let fail = 0;
  for (const [n, ok] of results) { console.log(`${ok ? 'PASS' : 'FAIL'}  ${n}`); if (!ok) fail++; }
  console.log(`\n${results.length - fail}/${results.length} passed`);
  process.exit(fail ? 1 : 0);
}
main().catch((e) => { console.error(e); process.exit(1); });

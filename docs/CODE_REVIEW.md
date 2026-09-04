# eFootball Platform — Code Review

Review of the full repo (Next.js 16 site + FastAPI tournament engine).
Findings are ordered by severity. Everything marked **[verified]** was reproduced
by running the code locally, not inferred by reading it.

Baseline health: `pytest -q` → **4 passed**. `npm run build` → **succeeds**.
So the problems below are not build breakage; they are security, correctness,
and durability issues that a green build hides.

---

## P0 — Critical: the admin API is fully open to the public internet

**[verified by exploit]** This is the single most important finding. Fix it before anything else.

`app/api/backend/[...path]/route.ts` is a public, unauthenticated Next.js route
that proxies **any** path to FastAPI and injects the secret `X-Admin-Key` on the
way through. FastAPI is correctly locked down (a direct call without the key
returns `401`), but the proxy hands out the key to whoever asks.

`serviceAdmin()` — despite the name — only checks that `ADMIN_KEY` *exists in
the server env*. It never authenticates the **caller**. So it always succeeds in
production, and the proxy forwards the request with full admin rights.

Reproduced end-to-end against a real FastAPI instance, with **no credentials of any kind**:

```
POST /api/backend/admin/tournaments   {"name":"PWNED BY ANON"}
  → 200 {"id":"EC-99A40A","name":"PWNED BY ANON", ...}   ← persisted in the DB
GET  /api/backend/admin/submissions   → 200   (admin-only data disclosed)
GET  /api/backend/admin/verify        → 200 {"ok":true}
```

The same hole exists in two more routes that bypass the proxy and inject the key directly:

```
PUT  /api/reels-queue          → 200, persisted:true   → content appears on the public homepage
POST /api/admin/announcement   → 200, persisted:true   → site-wide banner takeover
```

Reproduced: I injected `"anon injected content"` into the homepage reel feed and
set the sitewide banner to `ANON CONTROLLED BANNER` as an anonymous user.

The blast radius is every admin capability: create/delete cups, kick players,
generate brackets, report arbitrary match scores, confirm submissions, resolve
disputes, force forfeits, and rewrite the leaderboard.

Note the README states *"Direct entry — no password or unlock screen"* and
*"Organizer command hub at /admin ... no password"*. That is the design intent,
so this is deliberate — but it means "no password for the organizer" is actually
"no password for anyone on the internet". `robots.txt` disallowing `/admin` hides
the UI from crawlers; it does nothing for the API routes, which are the real target.

**Fix.** Put a real session in front of admin surfaces. Minimum viable version:

- Add a login route that compares a submitted password against a server-side
  secret with `crypto.timingSafeEqual`, then sets a signed, `httpOnly`,
  `secure`, `sameSite=lax` session cookie.
- Change `serviceAdmin()` to validate that cookie on the incoming request and
  return `401` when it is absent — the env-var check stays, but as a *config*
  check, not an *auth* check.
- Apply it to `/api/backend/[...path]`, `/api/reels-queue` (PUT/POST),
  `/api/admin/announcement` (POST), and `/api/admin/instagram-status`.
- In `/api/backend`, allowlist the paths the hub actually needs instead of
  proxying everything, and keep rejecting `upload`.

Until that ships, treat the deployed Render database and the Instagram token as
compromised: rotate `ADMIN_KEY` and `INSTAGRAM_ACCESS_TOKEN` after the fix.

---

## P1 — High

### 1. Admin brute-force limiter is trivially bypassed **[verified]**

`main.py: admin()` keys its rate limiter on `sha256(the_submitted_key)`. The
counter is per *guess*, not per *client* — so a different wrong key each time
never trips it.

```
60 attempts, distinct wrong key each time  → NO 429   (limiter bypassed)
10 attempts, same wrong key                → 429 seen (only case it works)
```

Key on client IP (as `allow_registration` already does), not on the guess.

### 2. Forfeit corrupts an already-decided bracket **[verified]**

`main.py: forfeit()` never checks match status, so it can overwrite a
`CONFIRMED` result and rewrite the semifinal that was already populated:

```
QF1 confirmed 3-0 → SF1.player_a = <winner>
POST .../forfeit/<the winner>  → 200
SF1.player_a is now <the loser>   ← bracket silently corrupted
```

Worse, the advanced player is replaced but their stats from the confirmed match
are left intact, so the leaderboard and the bracket now disagree.

Guard it the way `admin_report` already does:
`if m['status'] in ('CONFIRMED','FORFEIT','CANCELLED'): reject`. Also reverse the
prior stats when overriding a decided match, and note `forfeit` skips
`update_stats` entirely — a forfeit currently records no played/loss for anyone.
(`admin_report` correctly returns `400 MATCH_ALREADY_CLOSED` on a re-report, and
stats are not double-counted — that path is fine.)

### 3. CORS is wide open, and `CORS_ORIGINS` is dead config **[verified]**

`main.py` hardcodes `allow_origins=['*']`. Confirmed: a request with
`Origin: https://evil.example.com` gets `access-control-allow-origin: *` back.

Meanwhile `CORS_ORIGINS` is documented in the README, set in `.env.example`, and
**hardcoded into `render.yaml`** — but `grep` shows it is never read anywhere in
`apps/api`. The deployment looks configured and is not.

Read the env var and pass the parsed list to `CORSMiddleware`. It is mitigated
today by `allow_credentials=False` plus header-based auth, but it is a real gap
and the config lies about it.

### 4. AI endpoints are unauthenticated and billable **[verified]**

`/api/auto-prompt` and `/api/generate-media` return `200` to anonymous callers;
`/api/generate-copy` and `/api/generate-reel` return `503` only because no key is
set locally — with keys configured on Vercel they will happily run. There is no
rate limiting on any of them. Anyone can run your OpenRouter/DashScope spend to
zero in a loop. `/api/instagram-publish` is also unauthenticated: given a
`videoUrl` it posts to your real Instagram account.

Put these behind the same admin session, and add per-IP throttling.

### 5. `/api/player/me` leaks the player token

`db.auth_player` selects `token` and `main.py: me()` returns the row verbatim.
Echoing the bearer credential back in a response body is needless exposure —
drop `token` from that `SELECT`.

### 6. SQLite is the silent production default

`db.py` falls back to SQLite whenever `DATABASE_URL` is unset. On Render's
ephemeral free disk that means **every tournament is wiped on each deploy and
restart**. The `startup()` guard only fires when `ENVIRONMENT == 'production'`,
and `render.yaml` does set it — but `DATABASE_URL` is `sync: false`, so a
first-time deploy that forgets it crash-loops instead of explaining itself.
Make the startup error message name the missing variable explicitly.

---

## P2 — Medium

- **Duplicate registration is racy on SQLite.** `db.register` uses
  `SELECT ... FOR UPDATE` for row locking, but `_conn()` only emits that when
  `DATABASE_URL` is set. On SQLite the lock string is empty, so two concurrent
  registrations can both read `count == 7` and produce a 9-player cup. Postgres
  is safe. Add a `UNIQUE` index on `(tournament_id, lower(efootball_username))`
  so the DB enforces it regardless of engine.
- **`app/api/players/[id]/route.ts` invents fake players.** When a player is not
  found it returns a fabricated placeholder profile with `id.toUpperCase()`
  instead of `404`. Combined with `players/[id]/page.tsx`, *any* URL renders a
  real-looking "LIVE VERIFIED" passport — an SEO and trust problem. Return `404`
  and let `notFound()` do its job.
- **Self-fetch via hardcoded production host.** Both `players/[id]/page.tsx` and
  `api/cron/auto-reel/route.ts` default to `https://www.efootball2026.online`.
  On preview deploys and locally, the server fetches *production* instead of
  itself. `NEXT_PUBLIC_BASE_URL` is not in `.env.example`. Prefer a relative
  fetch or derive the origin from request headers.
- **Two competing sources of truth for state.** `announcement` and `reels-queue`
  keep module-level `memory`/`memoryQueue` in the Next.js route. On Vercel each
  lambda instance has its own copy, so reads are non-deterministic across
  instances, and `POST /api/admin/announcement` mutates memory *before*
  checking auth. Treat FastAPI `kv_store` as authoritative; drop the module cache.
- **`app/api/generate-media/route.ts` interpolates the raw user prompt into a
  third-party URL** (`image.pollinations.ai/prompt/${prompt}`) and returns it for
  the browser to load. It is `encodeURIComponent`'d, but the endpoint is
  unauthenticated and effectively a free open proxy for arbitrary image prompts.
- **`apps/api/app/store.py` is dead code** — an in-memory tournament store,
  superseded by `db.py`, imported by nothing. Delete it; it is a trap for the
  next reader.
- **`ai` (^7.0.84) is an unused dependency** — `grep` finds no import anywhere.
  Drop it; it is a large transitive tree for nothing.
- **`next: "latest"`** in `package.json` resolves to whatever ships that day
  (currently 16.3.3). Pin it — `"latest"` means an upstream release can break
  your deploy with no commit on your side.
- **Deprecated `@app.on_event('startup')`** raises a `DeprecationWarning` on
  every boot (visible in the pytest output). Migrate to a `lifespan` handler.

---

## P3 — Low / polish

- **PWA icon is missing.** `manifest.ts` references `/icon.png` at 192px and
  512px; `public/` contains only `images/konami_hero_banner.png`. Install
  prompts get a broken icon. (Also: one file cannot be both sizes.)
- **No `error.tsx`, `not-found.tsx`, or `loading.tsx` anywhere.** Any render
  error shows the default Next.js error page.
- **CSP `connect-src` hardcodes the Render URL** while the app reads
  `NEXT_PUBLIC_API_URL` — point them at a different backend and the browser
  blocks every request. It also allows `'unsafe-inline'` and `'unsafe-eval'` in
  `script-src`, which substantially weakens the policy.
- **`maximumScale: 1, userScalable: false`** in the viewport blocks pinch-zoom.
  That is an accessibility failure (WCAG 1.4.4) on a self-described mobile-first site.
- **UTF-8 BOM** in `app/api/admin/announcement/route.ts`, `app/components/SoundEffects.tsx`,
  and `app/manifest.ts`. Harmless today, but it breaks some tooling — strip it.
- **Homepage nav labels are decorative.** "Version Info" links to `#tournaments`,
  "Licenses" to `#how`, "Online Support" to `#leaderboard`. The labels do not
  describe the destinations.
- **`featuredTournament` placeholder** (`EC-C97418`) renders a hardcoded fake cup
  before the fetch resolves and whenever the API returns an empty list.
- **No ESLint config** in the repo, and no lint step in CI.
- **CI does not run the frontend type-check separately** and there is no test
  covering the admin proxy — which is exactly where the P0 lives.
- **Unused state in `app/page.tsx`**: `loading` is set but never read.
- **`app/admin/page.tsx` is 2031 lines** in a single client component holding
  ~40 `useState` hooks. Splitting the four tabs into separate components would
  make it reviewable; the P0 was easy to miss partly because of this.

---

## Suggested order of work

1. **Admin session auth** on all four Next.js admin surfaces (P0), then rotate
   `ADMIN_KEY` and the Instagram token.
2. IP-based admin rate limiting; guard `forfeit` against closed matches (P1).
3. Wire up `CORS_ORIGINS`; auth + throttle the AI routes; stop returning the
   player token (P1).
4. Confirm `DATABASE_URL` is set on Render and make the startup failure loud (P1).
5. Unique index on tournament+username; real `404`s for unknown players;
   remove `store.py` and the `ai` dep; pin `next` (P2).
6. Icons, error boundaries, viewport zoom, CSP, BOMs, ESLint (P3).

A regression test worth adding first: assert that
`POST /api/backend/admin/tournaments` **without** a session cookie returns `401`.
That test fails against the current code.

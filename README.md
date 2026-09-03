# eFootball Community Tournament Platform

A free-entry, mobile-first eFootball community tournament site. Players register for 8-player single-elimination cups, receive a Konami custom-room code from an organizer, submit match evidence, and appear on the leaderboard. The platform does not automate or control the eFootball game.

**Live Next.js site:** [https://efootball-inky.vercel.app](https://efootball-inky.vercel.app)

This repository is two apps that ship together:

| Surface | Stack | Where it runs |
| --- | --- | --- |
| Public website, admin hub, AI reels, Instagram publisher | Next.js (App Router) at the repo root | Vercel (`vercel.json`) |
| Tournament engine, brackets, evidence URLs, admin API | FastAPI in `apps/api` | Render (`render.yaml`) |

The Next.js frontend talks to the FastAPI service via `NEXT_PUBLIC_API_URL` (default production value is the Render API).

## Current implementation

- Public mobile website (Next.js) with cup lobbies, brackets, player passports, and homepage reel highlights
- Organizer command hub at `/admin` (4 tabs: reels, tournaments, leaderboard, broadcast). Direct entry — no password or unlock screen.
- 8-player registration with server-side capacity enforcement
- Private player token returned after registration
- Admin API protected by `ADMIN_KEY` (timing-safe compare, rate-limited)
- QF → SF → Final bracket generation
- Manual eFootball Custom Tournament ID activation
- Player result submission with **HTTPS evidence URL and/or screenshot upload**
- Admin result verification, live score reporting, disputes, forfeits
- Player statistics and leaderboard
- Audit log
- PostgreSQL through `DATABASE_URL`, SQLite fallback for local API development
- Instagram Reels publisher using `INSTAGRAM_ACCESS_TOKEN` / `INSTAGRAM_ACCOUNT_ID` (no tokens in git)
- Scheduled reels queue persisted in the API (`kv_store`), with homepage highlights from `/api/reels-queue?public=1`

## Local development

### 1. Next.js site

```bash
cp .env.example .env.local
# Set ADMIN_KEY, NEXT_PUBLIC_API_URL (local API or the Render URL)
npm install
npm run dev
```

Open `http://127.0.0.1:3000`. Organizer UI: `http://127.0.0.1:3000/admin`.

### 2. FastAPI tournament API

```bash
cd apps/api
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
export ADMIN_KEY=generate-a-long-random-secret
uvicorn app.main:app --reload
```

Open `http://127.0.0.1:8000`. Use `/health` for storage status, `/ready` for readiness, `/version` for the API version.

Without `DATABASE_URL`, local SQLite (`SQLITE_PATH`, default `efootball.db`) is used automatically.

Point the Next.js app at the local API:

```bash
NEXT_PUBLIC_API_URL=http://127.0.0.1:8000
```

## Deploy

### Vercel (website)

The repo root is a Next.js app. Import the GitHub repository into Vercel (or push to the connected project). Set at least:

- `NEXT_PUBLIC_API_URL` — Render API origin
- `ADMIN_KEY` — same secret as Render. Server-only on Vercel; Next.js `/api/backend/*` injects `X-Admin-Key` so the browser never asks for it
- `INSTAGRAM_ACCESS_TOKEN` / `INSTAGRAM_ACCOUNT_ID` — for 1-click Reels connect/publish
- `DASHSCOPE_API_KEY` — optional, AI reel studio
- `CLOUDINARY_URL` or `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` — optional extra evidence upload path
- `CRON_SECRET` — optional, protects `/api/cron/auto-reel`

`vercel.json` schedules `/api/cron/auto-reel` every 4 hours.

### Render (tournament API)

Render can run the FastAPI service from `apps/api` (`render.yaml`). Free web services sleep after 15 minutes of inactivity, and Render's free Postgres expires after 30 days, so for persistent tournament data use a free external Postgres provider such as Supabase. Render documents both the free web service and datastore limits at https://render.com/docs/free.

#### 1. Database

Create a free Supabase Postgres project and copy its Postgres connection string. Supabase currently includes a 500 MB database quota on its Free plan; inactive projects can pause. See https://supabase.com/pricing.

#### 2. Render service

Connect this GitHub repository to Render and deploy `render.yaml`.
Set these environment variables on the web service:

- `DATABASE_URL` = your Supabase Postgres connection string
- `ADMIN_KEY` = a long random secret you choose (must match Vercel if you use the Next.js admin hub)
- `CLOUDINARY_URL` = optional, enables screenshot uploads (`cloudinary://API_KEY:API_SECRET@CLOUD_NAME`)
- `CORS_ORIGINS` = production site origins (Vercel + custom domain)
- `REDIS_URL` / `SENTRY_DSN` = optional

The application creates its tables automatically on startup. For production durability, set `DATABASE_URL` to a managed PostgreSQL database; local SQLite is only a development fallback and is not durable on Render free instances.

Configure an external uptime monitor against `/ready` and `/api/tournaments`.

## Admin workflow

1. Open `/admin` on the Next.js site. The 4-tab command hub loads immediately (no unlock screen, cookie session, or password field).
2. **Tournaments tab:** create a free-entry cup, optional prize/entry label, wait for 8 players, generate the bracket, enter the eFootball Custom Tournament ID, report live scores, confirm evidence, resolve disputes.
3. Share the public tournament URL (`/tournaments/{id}`).
4. Players play in eFootball, then submit scores plus screenshot upload and/or evidence URL.
5. Admin reviews pending submissions or records scores from the hub. Winners advance automatically.
6. **Reels tab:** generate clips, 1-click Instagram connect (env token), queue, publish.
7. **Athletes tab:** add players and edit points against the FastAPI roster (not a fake local list).
8. **Broadcast tab:** homepage banner + real service ping (including Instagram token health).

`ADMIN_KEY` stays on the **server**: FastAPI still requires `X-Admin-Key` for direct API calls. Vercel/Next.js injects that header from env. Do not put `ADMIN_KEY` in the client bundle (`NEXT_PUBLIC_*`). Public player pages are unchanged.

## Match evidence

Players can:

1. Paste an `https://` evidence URL, or
2. Upload a PNG/JPEG/WebP screenshot (max 5 MB)

Uploads never write to the Render web-service disk. The API stores **only** the object URL in `submissions.evidence_url`.

Resolution order:

1. FastAPI `/api/upload` → Cloudinary (`CLOUDINARY_URL` on Render)
2. Next.js `/api/evidence-upload` → Cloudinary if `CLOUDINARY_URL` is set on Vercel
3. Next.js `/api/evidence-upload` → Supabase Storage (`SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY`, bucket `match-evidence` by default)

If no object store is configured, the file path returns `503` and the HTTPS URL field still works.

## Instagram / Reels

Set Meta credentials in Vercel environment variables only:

- `INSTAGRAM_ACCESS_TOKEN` — long-lived Page or Instagram professional token
- `INSTAGRAM_ACCOUNT_ID` — optional; 1-click connect discovers it from the token

The hub uses env tokens (`INSTAGRAM_ACCESS_TOKEN` / `INSTAGRAM_ACCOUNT_ID`) for connect, validate, and publish. The public homepage reads `/api/reels-queue?public=1` (items with real video URLs). The queue is saved to the FastAPI `kv_store` so it survives Vercel serverless cold starts.

## Tests

```bash
cd apps/api && pytest -q
npm run build
```

GitHub Actions (`.github/workflows/test.yml`) runs both on pull requests.

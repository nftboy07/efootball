# eFootball Community Tournament Platform

A free-entry, mobile-first eFootball community tournament website. V1 supports 8-player single-elimination tournaments, registration, bracket generation, manual eFootball Custom Tournament IDs, result evidence, admin verification, disputes, leaderboard/statistics, and audit logs. It does not automate or control the eFootball game.

## Current implementation
- Public mobile website served by FastAPI
- 8-player registration with server-side capacity enforcement
- Private player token returned after registration
- Admin API protected by `ADMIN_KEY`
- QF -> SF -> Final bracket generation
- Manual eFootball Custom Tournament ID activation
- Player result submission with evidence URL and notes
- Admin result verification
- Disputes and admin resolution
- Forfeits
- Player statistics and leaderboard
- Audit log
- PostgreSQL support through `DATABASE_URL`
- SQLite fallback for local development
- Render deployment configuration

## Free deployment
Render can run the FastAPI web service on its Free plan. Free web services sleep after 15 minutes of inactivity, and Render's free Postgres expires after 30 days, so for persistent free tournament data use a free external Postgres provider such as Supabase. Render documents both the free web service and datastore limits at https://render.com/docs/free.

### 1. Database
Create a free Supabase Postgres project and copy its Postgres connection string. Supabase currently includes a 500 MB database quota on its Free plan; inactive projects can pause. See https://supabase.com/pricing.

### 2. Render
Connect this GitHub repository to Render and deploy `render.yaml`.
Set these environment variables on the web service:

- `DATABASE_URL` = your Supabase Postgres connection string
- `ADMIN_KEY` = a long random secret you choose

The application creates its tables automatically on startup.

### 3. Admin workflow
1. Open the website.
2. Enter `ADMIN_KEY` in the Admin panel.
3. Create a tournament.
4. Share the tournament ID.
5. Wait for 8 players.
6. Generate the bracket.
7. Create the Custom Tournament manually inside eFootball.
8. Enter the eFootball Custom Tournament ID and activate.
9. Players play their matches.
10. Players submit scores and evidence.
11. Admin reviews and confirms results.
12. Winners advance automatically.
13. Final winner appears in the leaderboard.

## Important production note
Evidence currently accepts an evidence URL. Do not put private screenshot files on the Render filesystem because free Render web-service storage is ephemeral. For a production screenshot-upload flow, connect an S3-compatible or Supabase Storage bucket and store only private object URLs in `submissions.evidence_url`.

## Local development
```bash
cd apps/api
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

Open `http://127.0.0.1:8000`.

Set `ADMIN_KEY` for admin actions. Without `DATABASE_URL`, local SQLite is used automatically.

# eFootball Community Tournament Platform

Free-entry community tournament platform for eFootball Mobile. The platform manages registration, 8-player brackets, matches, result verification, disputes, leaderboards, player statistics, and Instagram-ready social cards. It does not control or automate eFootball.

## V1
- Free entry only
- 8 players per tournament
- Single-elimination bracket
- Admin supplies the eFootball Custom Tournament ID
- Players receive the code through the website
- Results require evidence and admin verification
- Leaderboards, seasons, statistics, winners and social sharing
- No payment, UPI, cash-prize, or gameplay automation in V1

## Architecture
- Next.js + TypeScript frontend
- FastAPI + Python backend
- PostgreSQL
- Redis/background jobs
- S3-compatible screenshot storage
- Docker deployment

## Development
See `docs/IMPLEMENTATION.md` for the phased implementation plan and product requirements.

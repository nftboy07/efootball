# Implementation Plan

## Product
Independent eFootball Mobile community tournament platform. V1 is free-entry and does not automate gameplay.

## Core flow
Instagram -> public tournament page -> player registration -> 8/8 full -> admin locks tournament -> admin enters the actual eFootball Custom Tournament ID -> website activates tournament -> players receive the code -> matches are played in eFootball -> players submit scores and screenshots -> admin verifies -> winners advance -> final -> champion -> leaderboard/statistics/social winner card.

## Tournament model
- Maximum 8 players per tournament in V1.
- Single elimination.
- Four quarter-finals, two semi-finals, one final.
- Platform tournament IDs are separate from eFootball Custom Tournament IDs.
- eFootball ID is entered by an authorized admin/host; there is no unofficial game automation.

## Required entities
- users
- user_profiles
- seasons
- tournaments
- tournament_players
- matches
- result_submissions
- disputes
- media_files
- player_statistics
- leaderboard_entries
- winner_records
- referrals
- social_cards
- notifications
- notification_deliveries
- admin_users
- roles
- permissions
- audit_logs
- terms_acceptances

## Tournament states
DRAFT -> OPEN -> FULL -> LOCKED -> IN_PROGRESS -> COMPLETED
Also support CANCELLED.

## Match states
SCHEDULED -> READY -> RESULT_SUBMITTED -> UNDER_REVIEW -> CONFIRMED
Alternative terminal states: DISPUTED, FORFEIT, CANCELLED.

## Admin workflow
1. Create tournament.
2. Open registration.
3. Wait for eight players.
4. Lock registration.
5. Generate bracket.
6. Create the Custom Tournament manually in eFootball.
7. Enter the generated eFootball Tournament ID into the admin panel.
8. Activate the platform tournament.
9. Notify players.
10. Verify submitted results and resolve disputes.
11. Confirm final result.
12. Declare champion and update leaderboard/statistics.
13. Generate Instagram-ready winner/bracket cards.

## V1 economics
- Entry fee: 0
- Cash prize: 0
- Payment gateway: disabled
- UPI: disabled

The architecture should leave a clean provider interface for a future compliant payment feature, but no real-money functionality is exposed in V1.

## Security requirements
- Server-side authorization and RBAC.
- Database-enforced 8-player capacity and unique tournament registration.
- Transactional bracket/result updates.
- Webhook/payment code must not exist in V1 production paths.
- Screenshot uploads require MIME/size validation and private storage.
- Audit all sensitive admin actions.
- Rate-limit authentication, registration, result submission and uploads.
- Protect against IDOR, privilege escalation, duplicate registration and race conditions.

## Growth features
- Fast mobile-first Instagram landing pages.
- Open Graph metadata.
- Shareable tournament, bracket, result, winner and leaderboard cards.
- Referral codes and attribution without monetary rewards.
- Seasons, badges, streaks and public player statistics.

## Suggested implementation phases
1. Monorepo, Docker, CI, configuration.
2. PostgreSQL schema and migrations.
3. Authentication and RBAC.
4. Tournament engine and registration.
5. Bracket and match lifecycle.
6. Result screenshots, verification and disputes.
7. Leaderboard, seasons, statistics and achievements.
8. Admin dashboard.
9. Public website and Instagram landing experience.
10. Social card generation and referrals.
11. Notifications.
12. Security hardening, E2E tests, deployment and backups.

## Definition of done
A local E2E test must create an 8-player free tournament, fill all slots safely under concurrent registration, lock it, attach an eFootball Tournament ID, generate and complete the bracket, verify results, declare a champion, update statistics/leaderboard, and generate a winner card.

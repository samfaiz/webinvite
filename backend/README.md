# Backend — Wedding Invitation SaaS API

NestJS + Prisma. **Dev uses SQLite (zero install); production switches to PostgreSQL**
(see header in `prisma/schema.prisma`).

## Run (development)

```bash
cd backend
npm install                 # first time only
npx prisma migrate deploy   # creates the SQLite dev DB (first time / after pulling)
npm run start:dev           # API at http://localhost:4000/api  (watch mode)
```

Health check: open http://localhost:4000/api/health → `{"ok":true,...}`

> The **first account you register becomes the admin** (platform owner).

## API endpoints (prefix `/api`)

Auth
- `POST /auth/register` `{ email, password, name? }` → `{ token, user }`
- `POST /auth/login` `{ email, password }` → `{ token, user }`
- `GET  /auth/me` *(Bearer)* → current user

Invitations *(Bearer — owner only)*
- `POST   /invitations` — create draft `{ templateId, themeId, motifId, theme, content, ownerEmail? }`
- `GET    /invitations` — list mine
- `GET    /invitations/:id` — get one
- `PUT    /invitations/:id` — save
- `POST   /invitations/:id/publish` — publish (assigns unique slug, sets expiry)
- `POST   /invitations/:id/unpublish`
- `DELETE /invitations/:id`
- `GET    /invitations/:id/rsvps` — RSVP list + counts

Public (no auth)
- `GET  /public/invitations/:slug` — published, non-expired invite (counts a view)
- `POST /public/invitations/:slug/rsvp` `{ guestName, attending: "accept"|"decline", guests?, message? }`

Admin *(Bearer — admin role)*
- `GET /admin/stats` — users / invitations / published / rsvps / total views
- `GET /admin/invitations` — all invitations
- `GET /admin/users` — all users

## Background jobs
- Hourly cron (`src/tasks/expiry.service.ts`) flips published invitations to `expired`
  once their expiry date (wedding date + 1 day by default) passes.

## Switching to PostgreSQL (production)
1. In `prisma/schema.prisma`, set `provider = "postgresql"`.
2. Set `DATABASE_URL` in `.env` to your Postgres connection string (e.g. Neon).
3. Delete `prisma/migrations` (SQLite-specific) and run `npx prisma migrate dev --name init`.

Content & theme are stored as JSON strings, so the schema is identical on both engines.

# Eternal — Wedding Invitation SaaS

A multi-tenant platform where couples pick an admin-curated design, customise it
(photos, story, schedule, RSVP, music, custom video intro), and publish a live,
shareable invitation. Admins manage designs, the music library, email settings,
and see RSVPs/analytics.

**Monorepo** — one repository, one `main` branch, two apps:

```
frontend/   Next.js 16 (App Router) — the couple + admin UI, published invites
backend/    NestJS + Prisma (SQLite) — API, auth, uploads, RSVP export, email
```

> Frontend and backend live together on purpose. Branches are for features, not
> for splitting the code — make a feature branch off `main` and merge back.

## Local development

Run each app in its own terminal (from the repo root):

```bash
# backend  → http://localhost:4000/api
cd backend
cp .env.example .env         # first time only
npm install
npx prisma migrate deploy
npm run start:dev

# frontend → http://localhost:3000
cd frontend
cp .env.example .env.local   # first time only (set NEXT_PUBLIC_API_URL=http://localhost:4000/api)
npm install
npm run dev
```

## Deployment

See **[DEPLOY.md](DEPLOY.md)** — Docker Compose + host nginx + HTTPS on a single VPS.

## Notes

- Uploaded media (photos / intro video / library audio) is stored on disk under
  `backend/uploads/` (a persistent volume in production).
- The database is SQLite (`*.db`) — never committed; it holds real user data.
- Copy env from the `.env.example` files; never commit real `.env`.

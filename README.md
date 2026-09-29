# Ekstrem Spor 7/24 — Campus Event Platform

Next.js 16 (App Router) + Postgres 17. No Supabase, no third-party
backend: the database, auth, file storage, and realtime all run in
docker-compose on a single host.

## Stack

| Layer       | Tech                                                        |
| ----------- | ----------------------------------------------------------- |
| Web         | Next.js 16, React 19, Tailwind v4                           |
| Database    | Postgres 17 (`postgres:17-alpine`)                          |
| DB driver   | `pg` (`node-postgres`) pooled in the Next.js server         |
| Auth        | Session cookies; tokens stored in the `sessions` table      |
| Realtime    | Postgres `LISTEN/NOTIFY` → Next.js SSE → `EventSource`      |
| File store  | Docker named volume mounted at `/app/uploads`               |

## Running with docker-compose

```bash
cp .env.example .env
# fill in: POSTGRES_PASSWORD and SESSION_SECRET (openssl rand -hex 32),
#         ADMIN_EMAILS, ADMIN_PASSWORD; optionally ALLOWED_EMAIL_DOMAINS
docker compose up -d --build
```

`.env.example` carries names only. Compose refuses to start without
`POSTGRES_PASSWORD`; there is no default password.

`docker compose up -d` brings up two services on the `skynet` bridge
network:

- `db` (Postgres 17) — exposed on `localhost:5432`, persistent volume
  `pgdata`. On first boot the scripts under `db/init/` run automatically.
- `web` (Next.js production server) — exposed on `localhost:3000`,
  uploads on a separate `uploads` volume.

Open <http://localhost:3000>. The first admin login (any email in
`ADMIN_EMAILS` + the `ADMIN_PASSWORD`) auto-creates the admin row.
Student logins create themselves on first sign-in.

### Stopping / resetting

```bash
docker compose down        # stop, keep volumes (DB + uploads survive)
docker compose down -v     # wipe everything, schema re-runs on next up
```

## Running without docker (dev mode)

You still need a Postgres 17 instance somewhere. The quickest path:

```bash
cp .env.example .env       # set POSTGRES_PASSWORD, then
                           # DATABASE_URL=postgres://extremspor:<that password>@127.0.0.1:5432/extremspor
docker compose up -d db    # just the DB
npm install
npm run dev                # binds 0.0.0.0:3000 so LAN devices can reach it
```

## Release

Images are built by `.github/workflows/ghcr.yml` (the SKY LAB platform
pattern) for `linux/amd64`:

- Pull request (to `main` or `production`): build the image, boot it
  against a Postgres 17 service container with `db/init/01_schema.sql`,
  probe `GET /` and `GET /api/stats`. Nothing is pushed.
- Push to `main`: `ghcr.io/skylab-kulubu/ekstremspor-724-site:latest`
  and `:<sha>`. No deploy.
- Push to `production` (release = squash PR `main` → `production`):
  `:production` and `:<sha>`, then the Dokploy deploy hook from the
  `DOKPLOY_DEPLOY_HOOK` repository secret, if set.

Production runs in the SKY LAB Dokploy project "Ekstrem Sporlar" from
`:production`; secrets live in OpenBao and the Dokploy environment
holds references only. Uploads are a persistent volume at
`/app/uploads`, included in the nightly encrypted backup.

The pre-Postgres (Supabase) version of the site is kept on the
`supabase` branch.

## Architecture notes

### Auth

- `lib/auth/session.ts` mints a random 64-char token, inserts a row in
  `sessions(token, user_id, expires_at)`, and sets it as an
  `HttpOnly` cookie.
- Server actions read the cookie and look up the joined `profiles` row
  in one query (`getCurrentUser`).
- Admin login is gated by `ADMIN_EMAILS` + `ADMIN_PASSWORD` — one
  shared secret rather than per-user hashes. Switch to per-user hashes
  by populating `profiles.password_hash` and the verify step in
  `signInAdmin` will pick them up.

### Realtime

- A single `pg.Client` runs `LISTEN profiles_changes`,
  `LISTEN equipments_changes`, etc. (see `lib/realtime/listener.ts`).
- `db/init/01_schema.sql` installs an `AFTER INSERT/UPDATE/DELETE`
  trigger on each table that issues `pg_notify('<table>_changes', ...)`.
- `/api/sse/[channel]` streams those NOTIFYs as Server-Sent Events.
- Client components subscribe via `useRealtime("activities_changes", refetch)`.

### File storage

- Remote-activity screenshots are uploaded through
  `POST /api/activities/remote` (multipart). The server writes them to
  `UPLOADS_DIR/<userId>/<timestamp>-<rand>.<ext>` and stores the
  relative path in `activities.evidence_url`.
- Viewing is gated through `GET /api/files/<path>` which checks the
  session: owner can see their own, admins can see anyone's.

### Schema

All schema lives in `db/init/01_schema.sql`. Postgres runs files in
`/docker-entrypoint-initdb.d/` once, the first time the data volume is
created — wipe `pgdata` (`docker compose down -v`) to re-run.

## Project layout

```
db/init/                   ← schema + triggers, runs on first DB boot
src/
  app/
    api/                   ← Next.js route handlers
    page.tsx               ← landing
    admin/page.tsx         ← admin shell, role-checked server-side
  components/
    landing/  modals/  admin/  layout/  ui/
  lib/
    db/pool.ts             ← shared pg.Pool
    auth/{session,password}.ts
    storage/files.ts       ← local-disk evidence I/O
    realtime/listener.ts   ← LISTEN broker behind /api/sse
    realtime/useRealtime.ts ← client hook for EventSource
    queries/{leaderboard,stats}.ts
    actions/{auth,profile,activities,equipment}.ts
docker-compose.yml         ← db + web, skynet network, pgdata + uploads volumes
Dockerfile                 ← multi-stage standalone Next build
```

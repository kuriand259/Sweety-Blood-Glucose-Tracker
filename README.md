# Sweety – Blood Glucose Tracker

Sweety helps a diabetes patient log up to four blood glucose readings per day and review daily and monthly reports.

## Stack

- **API:** Node.js, Express, Prisma, PostgreSQL, bcrypt, JWT, Zod
- **Migrations:** Prisma Migrate (versioned SQL under `server/prisma/migrations/`)
- **UI:** Vite, React, React Router, Mantine
- **Tests:** Jest + Supertest

## Project layout

```
Sweety-Blood-Glucose-Tracker/
  server/          Express API + Prisma
  client/          React + Mantine app
  docker-compose.yml
  .env.example     Environment variable template
  README.md
```

## Prerequisites

- Docker (Compose v2) for the one-command setup below, or
- Node.js 20+ and PostgreSQL 14+ for the manual setup

## Quick start (Docker Compose)

From the repo root, with Docker running:

```bash
docker compose up --build
```

That starts Postgres, applies committed Prisma migrations, seeds the demo user, and starts the API and the client. No `.env` files are required for this path.

- App: http://localhost:5173
- API: http://localhost:4100 (`curl http://localhost:4100/api/health` → `{"status":"ok"}`)
- Demo login: `demo@sweety.test` / `password123`

`Ctrl+C` stops the stack. `docker compose down` removes the containers. The database lives in the `sweety_pg` volume, so the next `docker compose up` keeps existing data and skips migrations that are already applied. `npm run seed` still runs on each API start and replaces only the demo user's readings.

If port `5435`, `4100`, or `5173` is already in use, stop the other process first. A Postgres container started with the manual `docker run` example below also binds `5435`.

## Quick start (manual)

Once the env files exist (see Setup), run these in three terminals:

```bash
# 1. database (Docker example below; skip if Postgres is already running)
docker start sweety-postgres

# 2. API  → http://localhost:4100
cd server && npm run dev

# 3. client → http://localhost:5173
cd client && npm run dev
```

Check the API with `curl http://localhost:4100/api/health` (→ `{"status":"ok"}`), then log in with the demo account.

## Setup

### 1. Database

Create a PostgreSQL database, then copy env files:

```bash
cp .env.example server/.env
# Edit DATABASE_URL, JWT_SECRET, PORT, APP_TIMEZONE in server/.env

cp .env.example client/.env
# Keep only VITE_API_URL in client/.env (or create it manually)
```

| Variable | Where | Default | Notes |
| --- | --- | --- | --- |
| `DATABASE_URL` | `server/.env` | — (required) | Postgres connection string |
| `JWT_SECRET` | `server/.env` | — (required) | Any long random string; register/login fail without it |
| `PORT` | `server/.env` | `4100` | API port |
| `APP_TIMEZONE` | `server/.env` | `Asia/Kolkata` | Decides "today" for future-date checks |
| `VITE_API_URL` | `client/.env` | `http://localhost:4100` | Must match the API's port; restart `npm run dev` after changing it |

Example local Docker Postgres:

```bash
docker run -d --name sweety-postgres \
  -e POSTGRES_USER=sweety \
  -e POSTGRES_PASSWORD=sweety \
  -e POSTGRES_DB=sweety \
  -p 5435:5432 \
  postgres:16-alpine
```

### 2. API

```bash
cd server
npm install
npx prisma migrate deploy
npm run prisma:generate
npm run seed
npm run dev
```

API listens on `http://localhost:4100` by default (port 4000 is often taken by other local services).

`npm run seed` creates (or updates) the demo user and **replaces that user's readings** with a small sample set. It doesn't touch other users.

### 3. Client

```bash
cd client
npm install
npm run dev
```

Open the Vite URL (usually `http://localhost:5173`).

### Demo account

After seeding:

- **Email:** `demo@sweety.test`
- **Password:** `password123`

## Useful scripts

| Location | Command | Purpose |
| --- | --- | --- |
| repo root | `docker compose up --build` | Start Postgres, API, and client |
| repo root | `docker compose down` | Stop the Compose stack |
| `server/` | `npm run dev` | Start API with nodemon |
| `server/` | `npm start` | Start API without file watching |
| `server/` | `npm test` | Run API tests (needs the database, see below) |
| `server/` | `npm run seed` | Seed demo user + readings |
| `server/` | `npx prisma migrate deploy` | Apply committed migrations |
| `server/` | `npx prisma migrate dev --name <change>` | Create a new migration revision |
| `client/` | `npm run dev` | Start the React app |
| `client/` | `npm run build` | Production build |
| `client/` | `npm run preview` | Serve the production build locally |
| `client/` | `npm run lint` | Lint with oxlint |

## Tests

```bash
cd server
npm test
```

The API tests (Jest + Supertest) call the Express app directly, so the API server does not need to be running, but **Postgres does** and its migrations must be applied (`npx prisma migrate deploy`). They use `DATABASE_URL` from `server/.env`, i.e. the same database as development. Each test creates its own users and deletes them afterwards, so your demo data is left alone. `JWT_SECRET` falls back to a test value if it isn't set.

## Schema changes

Do **not** use `prisma db push` for this project.

1. Edit `server/prisma/schema.prisma`
2. Run `npx prisma migrate dev --name descriptive_change`
3. Commit the new folder under `server/prisma/migrations/`

`prisma migrate deploy` only applies existing revisions (good for a clean machine or reviewer setup).

## API overview

- `GET /api/health` — liveness check, no auth
- `POST /api/auth/register` — name, email, password (min 8)
- `POST /api/auth/login`
- `GET /api/auth/me`
- `GET /api/readings?date=YYYY-MM-DD&page=1&limit=20` — `date` is optional; omit it for full history. Defaults: `page=1`, `limit=20` (max 100). Response includes `pagination: { page, limit, total, totalPages }`.
- `POST /api/readings`
- `PUT /api/readings/:id`
- `DELETE /api/readings/:id`
- `GET /api/reports/daily?date=`
- `GET /api/reports/month-to-date?date=`
- `GET /api/reports/monthly?date=`

Reading and report routes require `Authorization: Bearer <token>` and only return the signed-in user’s data.

## Using the app

- **Dashboard** — always shows *today*: today's overview (average, readings logged, per-slot values, highest / lowest / spread), today's four slot cards (add, edit, delete), and this month's progress (share of readings in range, share of days logged). **Add reading** in the top bar opens the reading form.
- **Calendar** (dashboard and Reports) — each logged day is filled with the band colour of that day's average; hover for the values. Clicking a day (today or earlier) opens a day modal with that day's summary and its four readings, which can be added, edited or deleted in place. The calendar only displays data; it doesn't change what the rest of the page shows.
- **Reports** — pick a date to see the **Daily** report, the **Month overview** and the **Previous month**. For the **current** calendar month, Month overview is always month-to-date through **today** (1st → today), not through the picked day — so moving between days in this month only changes Daily, same idea as Previous month staying fixed for that month. That choice keeps month-to-date easier to read and cuts friction from the overview shifting under the date picker. For any **earlier** month, Month overview covers that whole month. **Previous month** is always the full calendar month before the selected date. **Edit readings** next to the date picker opens the day modal for the selected date, and the calendar jumps to and highlights that date.
- **Reading history** (dashboard) — all readings, newest first, 10 per page.

## Notes

- **Dates are calendar dates** (`YYYY-MM-DD`), stored as Postgres `DATE` values, not timestamps.
- **“Today” / future-date checks** use `APP_TIMEZONE` (default `Asia/Kolkata`). The client sends the user’s selected local date; the server rejects dates after that timezone’s current calendar date.
- **JWT** is returned on register/login, valid for 7 days, and stored in the browser’s `localStorage` as `sweety_token`. The API expects `Authorization: Bearer …`.
- **Glucose values** are whole numbers from 40–600 mg/dl. Report averages are computed and rounded to 1 decimal; they are not stored.
- Unique constraint `(userId, date, slot)` enforces one reading per slot per day. The “only 4 readings per day” check is an application backstop.
- **Colour coding** uses fixed display bands, the same for every slot: < 70 low, 70–140 in range, 141–180 elevated, > 180 high (`client/src/lib/glucose.js`). Calendar days are filled with the band colour of that day's average; values are shown in the tooltip.

## Bonus ideas (not implemented yet)

Core bonuses already shipped: paginated reading history and a Recharts monthly trend on Reports.

Shipped: Docker Compose for Postgres, the API, and the client (`docker compose up --build`). On API startup the container runs `prisma migrate deploy`, then `npm run seed`.

Still later:

- **Custom date-range reports** *(personal suggestion)* — a free start/end picker would likely be a clearer UX than today’s fixed windows (current-month MTD through today, full past month, previous calendar month). Shape: `GET /api/reports/range?start=&end=` reusing `fetchReadingsInRange` / `buildReport`, plus start/end inputs on Reports, so the user can ask for any window (e.g. last 14 days or 20 Sep → 5 Nov) instead of only calendar-month slices.
- **Custom glucose ranges** — per-slot target bands (e.g. fasting vs. post-meal), editable per patient after consultation. Likely shape: a `GlucoseBandRange` table keyed by user + slot (replacing the hardcoded thresholds in `client/src/lib/glucose.js`), a `band` column on `Reading` captured at save time and returned by the API, and a `bands:recompute` script for when a patient's targets change.
- React Testing Library form tests
- Redis report cache
- BullMQ reminder jobs
- Doctor role (new Prisma migration + authorization)

## Troubleshooting

- **`prisma migrate deploy` / API can't reach the database** — check Postgres is running and that the port in `DATABASE_URL` matches (the Docker example maps it to `5435`). Compose sets `DATABASE_URL` itself and uses the hostname `postgres`, so this applies to the manual setup only.
- **`docker compose up` fails because a port is in use** — stop the process on `5435`, `4100`, or `5173`. If you previously created the manual database with `docker run --name sweety-postgres`, stop it with `docker stop sweety-postgres` before Compose binds `5435`.
- **Client shows "Something went wrong" / network errors** — make sure the API is running and `VITE_API_URL` points at it; restart the Vite dev server after editing `client/.env`.
- **Logged out unexpectedly** — the JWT expired (7 days) or `JWT_SECRET` changed; log in again.
- **Port already in use** — change `PORT` in `server/.env` and `VITE_API_URL` in `client/.env` together.

## Screenshots / recording

Add submission screenshots or a short demo recording here before making the repository public.

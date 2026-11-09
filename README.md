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
  .env.example     Environment variable template
  README.md
```

## Prerequisites

- Node.js 20+
- PostgreSQL 14+

## Setup

### 1. Database

Create a PostgreSQL database, then copy env files:

```bash
cp .env.example server/.env
# Edit DATABASE_URL, JWT_SECRET, PORT, APP_TIMEZONE in server/.env

cp .env.example client/.env
# Keep only VITE_API_URL in client/.env (or create it manually)
```

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
| `server/` | `npm run dev` | Start API with nodemon |
| `server/` | `npm test` | Run API tests |
| `server/` | `npm run seed` | Seed demo user + readings |
| `server/` | `npx prisma migrate deploy` | Apply committed migrations |
| `server/` | `npx prisma migrate dev --name <change>` | Create a new migration revision |
| `client/` | `npm run dev` | Start the React app |
| `client/` | `npm run build` | Production build |

## Schema changes

Do **not** use `prisma db push` for this project.

1. Edit `server/prisma/schema.prisma`
2. Run `npx prisma migrate dev --name descriptive_change`
3. Commit the new folder under `server/prisma/migrations/`

`prisma migrate deploy` only applies existing revisions (good for a clean machine or reviewer setup).

## API overview

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

The Reports page also charts month-to-date readings (one Recharts line per time slot).

## Notes

- **Dates are calendar dates** (`YYYY-MM-DD`), stored as Postgres `DATE` values, not timestamps.
- **“Today” / future-date checks** use `APP_TIMEZONE` (default `Asia/Kolkata`). The client sends the user’s selected local date; the server rejects dates after that timezone’s current calendar date.
- **JWT** is returned on register/login and stored in the browser’s `localStorage` as `sweety_token`. The API expects `Authorization: Bearer …`.
- **Glucose values** are whole numbers from 40–600 mg/dl. Report averages are computed and rounded to 1 decimal; they are not stored.
- Unique constraint `(userId, date, slot)` enforces one reading per slot per day. The “only 4 readings per day” check is an application backstop.
- **Colour coding** uses fixed display bands, the same for every slot: < 70 low, 70–140 in range, 141–180 elevated, > 180 high (`client/src/lib/glucose.js`). Calendar days are filled with the band colour of that day's average; values are shown in the tooltip.

## Bonus ideas (not implemented yet)

Core bonuses already shipped: paginated reading history and a month-to-date Recharts trend on Reports.

Still later:

- **Custom glucose ranges** — per-slot target bands (e.g. fasting vs. post-meal), editable per patient after consultation. Likely shape: a `GlucoseBandRange` table keyed by user + slot (replacing the hardcoded thresholds in `client/src/lib/glucose.js`), a `band` column on `Reading` captured at save time and returned by the API, and a `bands:recompute` script for when a patient's targets change.
- Docker Compose for full stack
- React Testing Library form tests
- Redis report cache
- BullMQ reminder jobs
- Doctor role (new Prisma migration + authorization)

## Screenshots / recording

Add submission screenshots or a short demo recording here before making the repository public.

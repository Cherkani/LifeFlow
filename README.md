# Momentum Core

Momentum Core is a personal productivity platform built with Next.js and Supabase.

## Monorepo Structure

```text
life_flow/
├── wh_frontend/   # Next.js app (UI + server actions)
├── wh_supabase/   # Supabase config + SQL migrations
└── README.md
```

## Main Modules

- Dashboard
- Planner
- Weekly Tracker
- Events
- Finance
- Knowledge
- Analytics
- Settings

## Tech Stack

- Next.js 15
- React 18
- Tailwind CSS
- Supabase Auth + PostgreSQL + RLS

## Environment

### Frontend (`wh_frontend/.env.local`)

```bash
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
NEXT_PUBLIC_SITE_URL=http://localhost:3000
PEXELS_API_KEY=<pexels-api-key>
DEMO_USER_EMAIL=demo@lifeflow.app
DEMO_USER_PASSWORD=Demo12345!
```

### Supabase migration runner (`wh_supabase/supabase/.env`)

Use either:

- `DATABASE_URL`
- or `SUPABASE_URL` + `SUPABASE_DB_PASSWORD`

## Local Development

### 1) Install dependencies

```bash
cd wh_frontend && npm install
cd ../wh_supabase && npm install
```

### 2) Run database migrations

```bash
cd wh_supabase
npm run run-migrations
```

Current migration files:

- `20260300000000_lifeflow_core_schema.sql`
- `20260300010000_lifeflow_demo_feb_march_seed.sql`

### 3) Run frontend

```bash
cd wh_frontend
npm run dev
```

Open `http://localhost:3000`.

## Demo Access

- Auth pages include a `User demo` action (`Open Demo Space`).
- Demo data is seeded for February and March 2026.

## Useful Scripts

In `wh_frontend`:

- `npm run dev`
- `npm run build`
- `npm run lint`
- `npm run typecheck`

In `wh_supabase`:

- `npm run run-migrations`

# wh_supabase

Supabase schema and migration scripts for LifeFlow.

## Folder structure

- `supabase/migrations/` - SQL migrations in lexical timestamp order
- `scripts/run-migrations.mjs` - executes all SQL migrations via `psql`

## Requirements

- Node.js 20+
- `psql` available in PATH
- One of:
  - `DATABASE_URL`
  - `SUPABASE_URL` + `SUPABASE_DB_PASSWORD`

## Run migrations

```bash
cd wh_supabase
npm install
npm run run-migrations
```

The runner executes all `*.sql` files from `supabase/migrations/` in sorted order.

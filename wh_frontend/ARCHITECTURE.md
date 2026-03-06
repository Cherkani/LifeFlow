# LifeFlow Frontend Architecture

## Stack
- Next.js 15 (App Router)
- TypeScript strict mode
- Tailwind CSS
- Supabase Auth + Postgres (RLS)

## App Topology

```
src/
├── app/
│   ├── (auth)/         # login/signup pages + server auth actions
│   ├── (app)/          # protected workspace pages
│   └── layout.tsx      # root styles + metadata
├── components/
│   ├── shell/          # Volt-inspired shell (sidebar/topbar)
│   ├── ui/             # cards, metrics, shared primitives
│   └── forms/          # generic submit button
└── lib/
    ├── supabase/       # browser/server/middleware clients
    ├── types/          # typed database contract
    ├── constants/      # nav + static config
    └── server-context  # authenticated account context helpers
```

## Auth + Routing Model

- `middleware.ts` refreshes Supabase session on every request.
- Public routes: `/login`, `/signup`.
- Protected routes: everything else.
- Authenticated users hitting public routes are redirected to `/dashboard`.

## Data Access Pattern

- Server components read data with `createServerSupabaseClient`.
- Mutations are implemented as Next.js server actions.
- Every mutation revalidates affected pages (`revalidatePath`) to keep UI consistent.
- RLS is the primary access control layer; frontend is account-aware but zero-trust by design.

## Domain Modules

- Knowledge: spaces -> notes -> cards
- Habits: habit definitions + session planning + session updates
- Planning: templates + template entries + generate week RPC
- Finance: ledger, debts, debt payments, subscriptions
- Analytics: computed KPI snapshots from habit + finance data

## Production Notes

- Deploy frontend and Supabase in consistent regions.
- Keep `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` in deployment secrets.
- Ensure Supabase Auth redirect URLs include production domain.
- Use `npm run build` in CI and gate releases on successful compile.

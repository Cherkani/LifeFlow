# wh_frontend

LifeFlow frontend application built with Next.js + Supabase, using a custom UI shell built from Tailwind and shadcn-style open-source components.

## Requirements

- Node.js 20+
- npm 10+
- Running Supabase project with LifeFlow schema/migrations

## Local Setup

```bash
cd wh_frontend
npm install
cp .env.example .env.local
# Fill NEXT_PUBLIC_SUPABASE_URL + NEXT_PUBLIC_SUPABASE_ANON_KEY
npm run dev
```

Open http://localhost:3000.

## Scripts

- `npm run dev` - start local development server
- `npm run build` - production build
- `npm run start` - run production server
- `npm run lint` - lint project
- `npm run typecheck` - TypeScript type checking

## Environment

Create `wh_frontend/.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
```

## Included Modules

- Dashboard
- Knowledge
- Habits
- Weekly Planning
- Finance
- Analytics
- Settings

## UI Notes

- Legacy `volt-react-dashboard` template files were removed.
- App shell is now implemented in `src/components/shell/app-shell.tsx`.
- Shared primitives live in `src/components/ui/` (`button`, `input`, `select`, `tabs`, `card`, etc.).

## Production checklist

1. Configure Supabase Auth URL settings for your domain.
2. Verify RLS policies on all critical tables.
3. Run `npm run build` before deployment.
4. Monitor logs for failed server actions and auth errors.

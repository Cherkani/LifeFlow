# LifeFlow (LifeOS)

A personal ERP that separates **thinking**, **planning**, **execution**, and **measurement**. Built with Next.js and Supabase.

## Philosophy

Most productivity apps mix everything together. LifeOS separates layers clearly:

| Layer | Purpose |
|-------|---------|
| **Knowledge** | Strategic thinking |
| **Templates** | Weekly planning |
| **Sessions** | Real execution |
| **Finance** | Resource control |
| **Analytics** | Self-awareness (computed) |

## Project Structure

```
LifeFlow/
├── wh_frontend/     # Next.js 15 + React + Supabase
├── wh_supabase/     # Supabase migrations & config
└── README.md
```

## System Layers

### Knowledge Layer (Strategic Brain)
- **Knowledge spaces** — Big intentions (e.g. "Master System Design")
- **Notes** — Topics inside a space
- **Cards** — Atomic ideas, reorderable and linkable

### Habit System (Execution Engine)
- **Habits** — Permanent definitions (type, weekly target, minimum time)
- **Habit sessions** — Reality: planned vs actual minutes, rating, notes

### Weekly Planning (Tactical)
- **Templates** — Weekly blueprints
- **Template entries** — Habit + day + planned/min time + required
- **Weeks** — Week instances; selecting a template generates habit sessions

### Finance (Control & Awareness)
- **Expenses** — Daily spending (ledger entries)
- **Debts** — Long-term obligations
- **Subscriptions** — Recurring payments

## Getting Started

### Prerequisites
- Node.js 18+
- Supabase account

### Frontend
```bash
cd wh_frontend
npm install
cp .env.example .env.local  # Add Supabase URL + anon key
npm run dev
```

### Database
```bash
cd wh_supabase
# Configure Supabase connection in .env
npm run run-migrations
```

## Tech Stack

- **Frontend:** Next.js 15, React 18, Tailwind CSS, Supabase client
- **Backend:** Supabase (PostgreSQL, Auth, RLS)

## License

Private project.

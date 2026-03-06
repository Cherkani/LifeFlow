-- LifeOS - Base schema
-- Aligned with: Knowledge | Templates | Sessions | Finance | Analytics (computed)
-- Created: 2026-03-04

create extension if not exists pgcrypto;

-- =========================
-- 1) profiles (extends auth.users)
-- =========================
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  email text,
  role text not null default 'user' check (role in ('admin','user')),
  timezone text default 'UTC',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  last_signed_in_at timestamptz
);
create index if not exists idx_profiles_role on public.profiles(role);
create index if not exists idx_profiles_email on public.profiles(email);
create index if not exists idx_profiles_last_signed_in on public.profiles(last_signed_in_at desc nulls last);

-- =========================
-- 2) accounts (workspace per person/household)
-- =========================
create table if not exists public.accounts (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  currency_code text not null default 'USD',
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists idx_accounts_owner on public.accounts(owner_id);

-- =========================
-- 3) account_users (membership & per-account role)
-- =========================
create table if not exists public.account_users (
  account_id uuid not null references public.accounts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null check (role in ('owner','admin','member')),
  created_at timestamptz not null default now(),
  primary key (account_id, user_id)
);
create index if not exists idx_account_users_user on public.account_users(user_id);

-- =========================
-- 4) KNOWLEDGE LAYER - Strategic Brain
-- =========================

-- knowledge_spaces: big intentions ("master System Design", "learn investing")
create table if not exists public.knowledge_spaces (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts(id) on delete cascade,
  title text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_knowledge_spaces_account on public.knowledge_spaces(account_id);

-- notes: topics inside a space (e.g. Scalability, CAP Theorem)
create table if not exists public.notes (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null references public.knowledge_spaces(id) on delete cascade,
  title text not null,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_notes_space on public.notes(space_id);
create index if not exists idx_notes_position on public.notes(space_id, position);

-- cards: atomic thinking units (one idea, one concept, reorderable, linkable)
create table if not exists public.cards (
  id uuid primary key default gen_random_uuid(),
  note_id uuid not null references public.notes(id) on delete cascade,
  content text not null,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_cards_note on public.cards(note_id);
create index if not exists idx_cards_position on public.cards(note_id, position);

-- card_links: link cards to each other
create table if not exists public.card_links (
  from_card_id uuid not null references public.cards(id) on delete cascade,
  to_card_id uuid not null references public.cards(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (from_card_id, to_card_id),
  check (from_card_id != to_card_id)
);
create index if not exists idx_card_links_to on public.card_links(to_card_id);

-- =========================
-- 5) HABIT SYSTEM - Execution Engine
-- =========================

-- habits: permanent definitions (what to execute, not history)
create table if not exists public.habits (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts(id) on delete cascade,
  title text not null,
  type text not null default 'time_tracking' check (type in ('time_tracking','fixed_protocol','count','custom')),
  weekly_target_minutes integer,
  minimum_minutes integer,
  is_active boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_habits_account on public.habits(account_id);
create index if not exists idx_habits_active on public.habits(account_id, is_active) where is_active = true;

-- habit_sessions: THE CORE TABLE - stores reality (planned vs actual)
create table if not exists public.habit_sessions (
  id uuid primary key default gen_random_uuid(),
  habit_id uuid not null references public.habits(id) on delete cascade,
  session_date date not null,
  planned_minutes integer not null default 0,
  minimum_minutes integer not null default 0,
  actual_minutes integer,
  completed boolean not null default false,
  rating integer check (rating is null or (rating >= 1 and rating <= 5)),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (habit_id, session_date)
);
create index if not exists idx_habit_sessions_habit on public.habit_sessions(habit_id);
create index if not exists idx_habit_sessions_date on public.habit_sessions(session_date);
create index if not exists idx_habit_sessions_habit_date on public.habit_sessions(habit_id, session_date desc);

-- =========================
-- 6) WEEKLY PLANNING LAYER - Tactical
-- =========================

-- templates: weekly blueprints
create table if not exists public.templates (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_templates_account on public.templates(account_id);

-- template_entries: habit + day + planned/min time + required
-- day_of_week: 1=Monday .. 7=Sunday (ISO)
create table if not exists public.template_entries (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references public.templates(id) on delete cascade,
  habit_id uuid not null references public.habits(id) on delete cascade,
  day_of_week integer not null check (day_of_week >= 1 and day_of_week <= 7),
  planned_minutes integer not null default 0,
  minimum_minutes integer not null default 0,
  is_required boolean not null default true,
  created_at timestamptz not null default now(),
  unique (template_id, habit_id, day_of_week)
);
create index if not exists idx_template_entries_template on public.template_entries(template_id);
create index if not exists idx_template_entries_habit on public.template_entries(habit_id);

-- weeks: week instances (user selects template → creates week)
create table if not exists public.weeks (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts(id) on delete cascade,
  template_id uuid not null references public.templates(id) on delete cascade,
  week_start_date date not null,
  created_at timestamptz not null default now(),
  unique (account_id, week_start_date)
);
create index if not exists idx_weeks_account on public.weeks(account_id);
create index if not exists idx_weeks_date on public.weeks(week_start_date desc);

-- =========================
-- 7) FINANCE LAYER - Control & Awareness
-- =========================

-- finance_categories
create table if not exists public.finance_categories (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts(id) on delete cascade,
  name text not null,
  kind text not null check (kind in ('income','expense','savings','debt_payment')),
  color text,
  created_at timestamptz not null default now()
);
create unique index if not exists idx_finance_categories_account_name on public.finance_categories(account_id, name);

-- ledger_entries: income + expenses (daily spending)
create table if not exists public.ledger_entries (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts(id) on delete cascade,
  category_id uuid references public.finance_categories(id) on delete set null,
  entry_type text not null check (entry_type in ('income','expense')),
  amount numeric(14,2) not null,
  currency_code text not null default 'USD',
  occurred_on date not null,
  notes text,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);
create index if not exists idx_ledger_account_date on public.ledger_entries(account_id, occurred_on desc);
create index if not exists idx_ledger_category on public.ledger_entries(category_id);

-- debts: long-term obligations
create table if not exists public.debts (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts(id) on delete cascade,
  type text not null check (type in ('owed','owing')),
  name text not null,
  principal numeric(14,2) not null,
  apr numeric(6,3),
  due_date date,
  status text not null default 'open' check (status in ('open','closed')),
  remaining_balance numeric(14,2),
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);
create index if not exists idx_debts_account on public.debts(account_id);

-- debt_payments: payments toward debts
create table if not exists public.debt_payments (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts(id) on delete cascade,
  debt_id uuid not null references public.debts(id) on delete cascade,
  amount numeric(14,2) not null,
  paid_at date not null,
  method text,
  notes text,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);
create index if not exists idx_debt_payments_debt on public.debt_payments(debt_id);

-- subscriptions: recurring payments
create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts(id) on delete cascade,
  name text not null,
  amount numeric(14,2) not null,
  currency_code text not null default 'USD',
  recurrence text not null check (recurrence in ('monthly','yearly')),
  next_due_date date,
  notes text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_subscriptions_account on public.subscriptions(account_id);

-- =========================
-- 8) Helper: updated_at trigger
-- =========================
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_knowledge_spaces_set_updated on public.knowledge_spaces;
create trigger trg_knowledge_spaces_set_updated
  before update on public.knowledge_spaces for each row execute function public.set_updated_at();
drop trigger if exists trg_notes_set_updated on public.notes;
create trigger trg_notes_set_updated
  before update on public.notes for each row execute function public.set_updated_at();
drop trigger if exists trg_cards_set_updated on public.cards;
create trigger trg_cards_set_updated
  before update on public.cards for each row execute function public.set_updated_at();
drop trigger if exists trg_habits_set_updated on public.habits;
create trigger trg_habits_set_updated
  before update on public.habits for each row execute function public.set_updated_at();
drop trigger if exists trg_habit_sessions_set_updated on public.habit_sessions;
create trigger trg_habit_sessions_set_updated
  before update on public.habit_sessions for each row execute function public.set_updated_at();
drop trigger if exists trg_templates_set_updated on public.templates;
create trigger trg_templates_set_updated
  before update on public.templates for each row execute function public.set_updated_at();
drop trigger if exists trg_subscriptions_set_updated on public.subscriptions;
create trigger trg_subscriptions_set_updated
  before update on public.subscriptions for each row execute function public.set_updated_at();

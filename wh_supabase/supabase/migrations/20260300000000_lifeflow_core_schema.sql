
drop table if exists public.monthly_reports cascade;
drop table if exists public.reminders cascade;
drop table if exists public.budgets cascade;
drop table if exists public.tasks cascade;
drop table if exists public.objectives cascade;


create extension if not exists pgcrypto;

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

create table if not exists public.accounts (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  currency_code text not null default 'USD',
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists idx_accounts_owner on public.accounts(owner_id);

create table if not exists public.account_users (
  account_id uuid not null references public.accounts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null check (role in ('owner','admin','member')),
  created_at timestamptz not null default now(),
  primary key (account_id, user_id)
);
create index if not exists idx_account_users_user on public.account_users(user_id);


create table if not exists public.knowledge_spaces (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts(id) on delete cascade,
  title text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_knowledge_spaces_account on public.knowledge_spaces(account_id);

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

create table if not exists public.card_links (
  from_card_id uuid not null references public.cards(id) on delete cascade,
  to_card_id uuid not null references public.cards(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (from_card_id, to_card_id),
  check (from_card_id != to_card_id)
);
create index if not exists idx_card_links_to on public.card_links(to_card_id);


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


create table if not exists public.templates (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_templates_account on public.templates(account_id);

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


create table if not exists public.finance_categories (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts(id) on delete cascade,
  name text not null,
  kind text not null check (kind in ('income','expense','savings','debt_payment')),
  color text,
  created_at timestamptz not null default now()
);
create unique index if not exists idx_finance_categories_account_name on public.finance_categories(account_id, name);

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


create or replace function public.is_active_user()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles p where p.id = auth.uid() and p.is_active = true
  );
$$;

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin' and p.is_active = true
  );
$$;

create or replace function public.account_ids_for_user()
returns setof uuid language sql stable security definer set search_path = public as $$
  select au.account_id
  from public.account_users au
  where au.user_id = auth.uid();
$$;

alter table public.profiles enable row level security;
alter table public.accounts enable row level security;
alter table public.account_users enable row level security;
alter table public.knowledge_spaces enable row level security;
alter table public.notes enable row level security;
alter table public.cards enable row level security;
alter table public.card_links enable row level security;
alter table public.habits enable row level security;
alter table public.habit_sessions enable row level security;
alter table public.templates enable row level security;
alter table public.template_entries enable row level security;
alter table public.weeks enable row level security;
alter table public.finance_categories enable row level security;
alter table public.ledger_entries enable row level security;
alter table public.debts enable row level security;
alter table public.debt_payments enable row level security;
alter table public.subscriptions enable row level security;

drop policy if exists profiles_select_self on public.profiles;
drop policy if exists profiles_select_self on public.profiles;
create policy profiles_select_self on public.profiles
  for select using (is_active_user() and id = auth.uid());
drop policy if exists profiles_update_self on public.profiles;
drop policy if exists profiles_update_self on public.profiles;
create policy profiles_update_self on public.profiles
  for update using (is_active_user() and id = auth.uid()) with check (id = auth.uid());
drop policy if exists profiles_all_admin on public.profiles;
drop policy if exists profiles_all_admin on public.profiles;
create policy profiles_all_admin on public.profiles
  for all using (is_admin()) with check (is_admin());

drop policy if exists accounts_read_member on public.accounts;
drop policy if exists accounts_read_member on public.accounts;
create policy accounts_read_member on public.accounts
  for select using (id in (select account_ids_for_user()));
drop policy if exists accounts_all_admin on public.accounts;
drop policy if exists accounts_all_admin on public.accounts;
create policy accounts_all_admin on public.accounts
  for all using (is_admin()) with check (is_admin());
drop policy if exists accounts_update_owner on public.accounts;
drop policy if exists accounts_update_owner on public.accounts;
create policy accounts_update_owner on public.accounts
  for update using (
    exists (
      select 1 from public.account_users au
      where au.account_id = id and au.user_id = auth.uid() and au.role in ('owner','admin')
    )
  ) with check (
    exists (
      select 1 from public.account_users au
      where au.account_id = id and au.user_id = auth.uid() and au.role in ('owner','admin')
    )
  );

drop policy if exists account_users_read_member on public.account_users;
drop policy if exists account_users_read_member on public.account_users;
create policy account_users_read_member on public.account_users
  for select using (account_id in (select account_ids_for_user()));
drop policy if exists account_users_manage_owner on public.account_users;
drop policy if exists account_users_manage_owner on public.account_users;
create policy account_users_manage_owner on public.account_users
  for all using (
    exists (
      select 1 from public.account_users au
      where au.account_id = account_id and au.user_id = auth.uid() and au.role in ('owner','admin')
    )
  ) with check (
    exists (
      select 1 from public.account_users au
      where au.account_id = account_id and au.user_id = auth.uid() and au.role in ('owner','admin')
    )
  );
drop policy if exists account_users_all_admin on public.account_users;
drop policy if exists account_users_all_admin on public.account_users;
create policy account_users_all_admin on public.account_users
  for all using (is_admin()) with check (is_admin());

drop policy if exists knowledge_spaces_member on public.knowledge_spaces;
drop policy if exists knowledge_spaces_member on public.knowledge_spaces;
create policy knowledge_spaces_member on public.knowledge_spaces
  for all using (account_id in (select account_ids_for_user()))
  with check (account_id in (select account_ids_for_user()));
drop policy if exists knowledge_spaces_admin on public.knowledge_spaces;
drop policy if exists knowledge_spaces_admin on public.knowledge_spaces;
create policy knowledge_spaces_admin on public.knowledge_spaces
  for all using (is_admin()) with check (is_admin());

drop policy if exists notes_member on public.notes;
drop policy if exists notes_member on public.notes;
create policy notes_member on public.notes
  for all using (
    exists (
      select 1 from public.knowledge_spaces ks
      where ks.id = space_id and ks.account_id in (select account_ids_for_user())
    )
  ) with check (
    exists (
      select 1 from public.knowledge_spaces ks
      where ks.id = space_id and ks.account_id in (select account_ids_for_user())
    )
  );
drop policy if exists notes_admin on public.notes;
create policy notes_admin on public.notes for all using (is_admin()) with check (is_admin());

drop policy if exists cards_member on public.cards;
drop policy if exists cards_member on public.cards;
create policy cards_member on public.cards
  for all using (
    exists (
      select 1 from public.notes n
      join public.knowledge_spaces ks on ks.id = n.space_id
      where n.id = note_id and ks.account_id in (select account_ids_for_user())
    )
  ) with check (
    exists (
      select 1 from public.notes n
      join public.knowledge_spaces ks on ks.id = n.space_id
      where n.id = note_id and ks.account_id in (select account_ids_for_user())
    )
  );
drop policy if exists cards_admin on public.cards;
create policy cards_admin on public.cards for all using (is_admin()) with check (is_admin());

drop policy if exists card_links_member on public.card_links;
drop policy if exists card_links_member on public.card_links;
create policy card_links_member on public.card_links
  for all using (
    exists (
      select 1 from public.cards c
      join public.notes n on n.id = c.note_id
      join public.knowledge_spaces ks on ks.id = n.space_id
      where c.id = from_card_id and ks.account_id in (select account_ids_for_user())
    )
  ) with check (
    exists (
      select 1 from public.cards c
      join public.notes n on n.id = c.note_id
      join public.knowledge_spaces ks on ks.id = n.space_id
      where c.id = from_card_id and ks.account_id in (select account_ids_for_user())
    )
  );
drop policy if exists card_links_admin on public.card_links;
create policy card_links_admin on public.card_links for all using (is_admin()) with check (is_admin());

drop policy if exists habits_member on public.habits;
drop policy if exists habits_member on public.habits;
create policy habits_member on public.habits
  for all using (account_id in (select account_ids_for_user()))
  with check (account_id in (select account_ids_for_user()));
drop policy if exists habits_admin on public.habits;
create policy habits_admin on public.habits for all using (is_admin()) with check (is_admin());

drop policy if exists habit_sessions_member on public.habit_sessions;
drop policy if exists habit_sessions_member on public.habit_sessions;
create policy habit_sessions_member on public.habit_sessions
  for all using (
    exists (
      select 1 from public.habits h
      where h.id = habit_id and h.account_id in (select account_ids_for_user())
    )
  ) with check (
    exists (
      select 1 from public.habits h
      where h.id = habit_id and h.account_id in (select account_ids_for_user())
    )
  );
drop policy if exists habit_sessions_admin on public.habit_sessions;
create policy habit_sessions_admin on public.habit_sessions for all using (is_admin()) with check (is_admin());

drop policy if exists templates_member on public.templates;
drop policy if exists templates_member on public.templates;
create policy templates_member on public.templates
  for all using (account_id in (select account_ids_for_user()))
  with check (account_id in (select account_ids_for_user()));
drop policy if exists templates_admin on public.templates;
create policy templates_admin on public.templates for all using (is_admin()) with check (is_admin());

drop policy if exists template_entries_member on public.template_entries;
drop policy if exists template_entries_member on public.template_entries;
create policy template_entries_member on public.template_entries
  for all using (
    exists (
      select 1 from public.templates t
      where t.id = template_id and t.account_id in (select account_ids_for_user())
    )
  ) with check (
    exists (
      select 1 from public.templates t
      where t.id = template_id and t.account_id in (select account_ids_for_user())
    )
  );
drop policy if exists template_entries_admin on public.template_entries;
create policy template_entries_admin on public.template_entries for all using (is_admin()) with check (is_admin());

drop policy if exists weeks_member on public.weeks;
drop policy if exists weeks_member on public.weeks;
create policy weeks_member on public.weeks
  for all using (account_id in (select account_ids_for_user()))
  with check (account_id in (select account_ids_for_user()));
drop policy if exists weeks_admin on public.weeks;
create policy weeks_admin on public.weeks for all using (is_admin()) with check (is_admin());

drop policy if exists finance_categories_member on public.finance_categories;
drop policy if exists finance_categories_member on public.finance_categories;
create policy finance_categories_member on public.finance_categories
  for all using (account_id in (select account_ids_for_user()))
  with check (account_id in (select account_ids_for_user()));
drop policy if exists finance_categories_admin on public.finance_categories;
create policy finance_categories_admin on public.finance_categories for all using (is_admin()) with check (is_admin());

drop policy if exists ledger_entries_member on public.ledger_entries;
drop policy if exists ledger_entries_member on public.ledger_entries;
create policy ledger_entries_member on public.ledger_entries
  for all using (account_id in (select account_ids_for_user()))
  with check (account_id in (select account_ids_for_user()));
drop policy if exists ledger_entries_admin on public.ledger_entries;
create policy ledger_entries_admin on public.ledger_entries for all using (is_admin()) with check (is_admin());

drop policy if exists debts_member on public.debts;
drop policy if exists debts_member on public.debts;
create policy debts_member on public.debts
  for all using (account_id in (select account_ids_for_user()))
  with check (account_id in (select account_ids_for_user()));
drop policy if exists debts_admin on public.debts;
create policy debts_admin on public.debts for all using (is_admin()) with check (is_admin());

drop policy if exists debt_payments_member on public.debt_payments;
drop policy if exists debt_payments_member on public.debt_payments;
create policy debt_payments_member on public.debt_payments
  for all using (account_id in (select account_ids_for_user()))
  with check (account_id in (select account_ids_for_user()));
drop policy if exists debt_payments_admin on public.debt_payments;
create policy debt_payments_admin on public.debt_payments for all using (is_admin()) with check (is_admin());

drop policy if exists subscriptions_member on public.subscriptions;
drop policy if exists subscriptions_member on public.subscriptions;
create policy subscriptions_member on public.subscriptions
  for all using (account_id in (select account_ids_for_user()))
  with check (account_id in (select account_ids_for_user()));
drop policy if exists subscriptions_admin on public.subscriptions;
create policy subscriptions_admin on public.subscriptions for all using (is_admin()) with check (is_admin());

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_full_name text;
  v_tz text;
  v_role text;
  v_email text;
  v_account_name text;
  v_account_id uuid;
begin
  if exists(select 1 from public.profiles where id = new.id) then return new; end if;

  v_email := new.email;
  v_full_name := coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', '');
  v_tz := coalesce(new.raw_user_meta_data->>'timezone', 'UTC');
  v_role := coalesce(new.raw_user_meta_data->>'role', 'user');
  v_account_name := coalesce(new.raw_user_meta_data->>'account_name', nullif(trim(v_full_name), ''), 'My Life');

  insert into public.profiles (id, full_name, email, role, timezone, is_active)
  values (new.id, nullif(trim(v_full_name), ''), v_email, v_role, v_tz, true);

  insert into public.accounts (owner_id, name)
  values (new.id, coalesce(nullif(trim(v_account_name), ''), 'My Life'))
  returning id into v_account_id;

  insert into public.account_users (account_id, user_id, role)
  values (v_account_id, new.id, 'owner');

  insert into public.finance_categories (account_id, name, kind)
  values
    (v_account_id, 'Income', 'income'),
    (v_account_id, 'Savings', 'savings'),
    (v_account_id, 'Housing', 'expense'),
    (v_account_id, 'Food', 'expense'),
    (v_account_id, 'Transport', 'expense'),
    (v_account_id, 'Debt Payment', 'debt_payment')
  on conflict do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.create_week_from_template(
  p_account_id uuid,
  p_template_id uuid,
  p_week_start_date date
)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_week_id uuid;
  v_entry record;
  v_session_date date;
  v_dow integer;
begin
  if not exists (
    select 1 from public.account_users au
    where au.account_id = p_account_id and au.user_id = auth.uid()
  ) then
    return jsonb_build_object('success', false, 'error', 'Unauthorized');
  end if;

  if not exists (
    select 1 from public.templates t
    where t.id = p_template_id and t.account_id = p_account_id
  ) then
    return jsonb_build_object('success', false, 'error', 'Template not found');
  end if;

  insert into public.weeks (account_id, template_id, week_start_date)
  values (p_account_id, p_template_id, p_week_start_date)
  on conflict (account_id, week_start_date) do update set template_id = excluded.template_id
  returning id into v_week_id;

  delete from public.habit_sessions
  where session_date >= p_week_start_date and session_date <= p_week_start_date + 6
  and habit_id in (select id from public.habits where account_id = p_account_id);

  for v_entry in
    select te.habit_id, te.day_of_week, te.planned_minutes, te.minimum_minutes
    from public.template_entries te
    where te.template_id = p_template_id
  loop
    v_session_date := p_week_start_date + (v_entry.day_of_week - 1);
    insert into public.habit_sessions (habit_id, session_date, planned_minutes, minimum_minutes, completed)
    values (v_entry.habit_id, v_session_date, v_entry.planned_minutes, v_entry.minimum_minutes, false)
    on conflict (habit_id, session_date) do update set
      planned_minutes = excluded.planned_minutes,
      minimum_minutes = excluded.minimum_minutes;
  end loop;

  return jsonb_build_object('success', true, 'week_id', v_week_id);
end;
$$;

grant execute on function public.create_week_from_template(uuid, uuid, date) to authenticated;

create or replace function public.update_habit_session(
  p_session_id uuid,
  p_actual_minutes integer default null,
  p_rating integer default null,
  p_notes text default null
)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_session record;
begin
  select hs.*, h.account_id into v_session
  from public.habit_sessions hs
  join public.habits h on h.id = hs.habit_id
  where hs.id = p_session_id;

  if v_session is null then
    return jsonb_build_object('success', false, 'error', 'Session not found');
  end if;

  if not exists (
    select 1 from public.account_users au
    where au.account_id = v_session.account_id and au.user_id = auth.uid()
  ) then
    return jsonb_build_object('success', false, 'error', 'Unauthorized');
  end if;

  update public.habit_sessions
  set
    actual_minutes = coalesce(p_actual_minutes, actual_minutes),
    rating = coalesce(p_rating, rating),
    notes = coalesce(p_notes, notes),
    completed = case when p_actual_minutes is not null then (p_actual_minutes >= minimum_minutes) else completed end,
    updated_at = now()
  where id = p_session_id;

  return jsonb_build_object('success', true, 'session_id', p_session_id);
end;
$$;

grant execute on function public.update_habit_session(uuid, integer, integer, text) to authenticated;

create or replace function public.update_my_last_signed_in()
returns void language plpgsql security definer set search_path = public as $$
begin
  update public.profiles set last_signed_in_at = now() where id = auth.uid();
end;
$$;

grant execute on function public.update_my_last_signed_in() to authenticated;


create or replace function public.user_is_account_owner_or_admin(p_account_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.account_users au
    where au.account_id = p_account_id and au.user_id = auth.uid() and au.role in ('owner','admin')
  );
$$;

drop policy if exists accounts_update_owner on public.accounts;
drop policy if exists accounts_update_owner on public.accounts;
drop policy if exists accounts_update_owner on public.accounts;
create policy accounts_update_owner on public.accounts
  for update using (user_is_account_owner_or_admin(id))
  with check (user_is_account_owner_or_admin(id));

drop policy if exists account_users_manage_owner on public.account_users;
drop policy if exists account_users_manage_owner on public.account_users;
drop policy if exists account_users_manage_owner on public.account_users;
create policy account_users_manage_owner on public.account_users
  for all using (user_is_account_owner_or_admin(account_id))
  with check (user_is_account_owner_or_admin(account_id));


create table if not exists public.knowledge_items (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null references public.knowledge_spaces(id) on delete cascade,
  kind text not null check (kind in ('link', 'note')),
  title text,
  url text,
  content text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    (kind = 'link' and url is not null)
    or
    (kind = 'note' and content is not null and length(btrim(content)) > 0)
  )
);

create index if not exists idx_knowledge_items_space_created
  on public.knowledge_items(space_id, created_at desc);
create index if not exists idx_knowledge_items_kind
  on public.knowledge_items(kind);

insert into public.knowledge_items (space_id, kind, title, content, created_at, updated_at)
select
  n.space_id,
  'note',
  n.title,
  c.content,
  c.created_at,
  c.updated_at
from public.cards c
join public.notes n on n.id = c.note_id
where not exists (
  select 1
  from public.knowledge_items ki
  where ki.space_id = n.space_id
    and ki.created_at = c.created_at
    and coalesce(ki.content, '') = coalesce(c.content, '')
);

insert into public.knowledge_items (space_id, kind, title, content, created_at, updated_at)
select
  n.space_id,
  'note',
  n.title,
  n.title,
  n.created_at,
  n.updated_at
from public.notes n
where not exists (
  select 1
  from public.knowledge_items ki
  where ki.space_id = n.space_id
    and coalesce(ki.title, '') = coalesce(n.title, '')
    and ki.created_at = n.created_at
);

alter table public.knowledge_items enable row level security;

drop policy if exists knowledge_items_member on public.knowledge_items;
drop policy if exists knowledge_items_member on public.knowledge_items;
create policy knowledge_items_member on public.knowledge_items
  for all using (
    exists (
      select 1
      from public.knowledge_spaces ks
      where ks.id = space_id
        and ks.account_id in (select account_ids_for_user())
    )
  ) with check (
    exists (
      select 1
      from public.knowledge_spaces ks
      where ks.id = space_id
        and ks.account_id in (select account_ids_for_user())
    )
  );

drop policy if exists knowledge_items_admin on public.knowledge_items;
drop policy if exists knowledge_items_admin on public.knowledge_items;
create policy knowledge_items_admin on public.knowledge_items
  for all using (is_admin()) with check (is_admin());

drop trigger if exists trg_knowledge_items_set_updated on public.knowledge_items;
create trigger trg_knowledge_items_set_updated
  before update on public.knowledge_items
  for each row execute function public.set_updated_at();


drop table if exists public.knowledge_diary_entries cascade;
drop table if exists public.card_links cascade;
drop table if exists public.cards cascade;
drop table if exists public.notes cascade;


create table if not exists public.habit_objectives (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts(id) on delete cascade,
  title text not null,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_habit_objectives_account
  on public.habit_objectives(account_id);

alter table public.habit_objectives enable row level security;

drop policy if exists habit_objectives_member on public.habit_objectives;
drop policy if exists habit_objectives_member on public.habit_objectives;
drop policy if exists habit_objectives_member on public.habit_objectives;
create policy habit_objectives_member on public.habit_objectives
  for all using (account_id in (select account_ids_for_user()))
  with check (account_id in (select account_ids_for_user()));

drop policy if exists habit_objectives_admin on public.habit_objectives;
drop policy if exists habit_objectives_admin on public.habit_objectives;
drop policy if exists habit_objectives_admin on public.habit_objectives;
create policy habit_objectives_admin on public.habit_objectives
  for all using (is_admin()) with check (is_admin());

drop trigger if exists trg_habit_objectives_set_updated on public.habit_objectives;
create trigger trg_habit_objectives_set_updated
  before update on public.habit_objectives
  for each row execute function public.set_updated_at();

alter table public.habits
  add column if not exists objective_id uuid references public.habit_objectives(id) on delete set null;
create index if not exists idx_habits_objective on public.habits(objective_id);

alter table public.templates
  add column if not exists objective_id uuid references public.habit_objectives(id) on delete set null;
create index if not exists idx_templates_objective on public.templates(objective_id);

insert into public.habit_objectives (account_id, title, description)
select
  account_id,
  'General Objective',
  'Auto-created during objective/category migration.'
from (
  select distinct account_id from public.habits where objective_id is null
  union
  select distinct account_id from public.templates where objective_id is null
) as accounts_without_objective
where not exists (
  select 1
  from public.habit_objectives ho
  where ho.account_id = accounts_without_objective.account_id
    and ho.title = 'General Objective'
);

update public.habits h
set objective_id = (
  select ho.id
  from public.habit_objectives ho
  where ho.account_id = h.account_id
  order by
    case when ho.title = 'General Objective' then 0 else 1 end,
    ho.created_at
  limit 1
)
where h.objective_id is null;

update public.templates t
set objective_id = (
  select ho.id
  from public.habit_objectives ho
  where ho.account_id = t.account_id
  order by
    case when ho.title = 'General Objective' then 0 else 1 end,
    ho.created_at
  limit 1
)
where t.objective_id is null;


create table if not exists public.calendar_events (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts(id) on delete cascade,
  title text not null,
  details text,
  event_date date not null,
  event_type text not null default 'important' check (event_type in ('meeting', 'important', 'general')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_calendar_events_account_date
  on public.calendar_events(account_id, event_date desc);

drop trigger if exists trg_calendar_events_set_updated on public.calendar_events;
create trigger trg_calendar_events_set_updated
  before update on public.calendar_events
  for each row execute function public.set_updated_at();

alter table public.calendar_events enable row level security;

drop policy if exists calendar_events_member on public.calendar_events;
drop policy if exists calendar_events_member on public.calendar_events;
drop policy if exists calendar_events_member on public.calendar_events;
create policy calendar_events_member on public.calendar_events
  for all using (account_id in (select account_ids_for_user()))
  with check (account_id in (select account_ids_for_user()));

drop policy if exists calendar_events_admin on public.calendar_events;
drop policy if exists calendar_events_admin on public.calendar_events;
drop policy if exists calendar_events_admin on public.calendar_events;
create policy calendar_events_admin on public.calendar_events
  for all using (is_admin()) with check (is_admin());

alter table public.finance_categories
  add column if not exists monthly_limit numeric(14,2) check (monthly_limit is null or monthly_limit >= 0);

alter table if exists public.knowledge_spaces
  add column if not exists image_url text;


begin;

do $$
declare
  table_names text;
begin
  select string_agg(format('%I.%I', schemaname, tablename), ', ')
  into table_names
  from pg_tables
  where schemaname = 'public'
    and tablename not in ('profiles', 'accounts', 'account_users');

  if table_names is not null then
    execute format('truncate table %s restart identity cascade', table_names);
  end if;
end $$;

drop table if exists public.subscriptions cascade;
drop table if exists public.knowledge_diary_entries cascade;
drop table if exists public.card_links cascade;
drop table if exists public.cards cascade;
drop table if exists public.notes cascade;

commit;

alter table if exists public.habit_objectives
  add column if not exists image_url text;

alter table if exists public.finance_categories
  add column if not exists image_url text;

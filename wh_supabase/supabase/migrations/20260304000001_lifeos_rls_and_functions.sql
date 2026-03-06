-- LifeOS - RLS policies, helper functions, auth trigger
-- Created: 2026-03-04

-- =========================
-- Helper functions (SECURITY DEFINER to avoid RLS recursion)
-- =========================
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

-- =========================
-- Enable RLS on all tables
-- =========================
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

-- =========================
-- Profiles policies
-- =========================
create policy profiles_select_self on public.profiles
  for select using (is_active_user() and id = auth.uid());
create policy profiles_update_self on public.profiles
  for update using (is_active_user() and id = auth.uid()) with check (id = auth.uid());
create policy profiles_all_admin on public.profiles
  for all using (is_admin()) with check (is_admin());

-- =========================
-- Accounts policies
-- =========================
create policy accounts_read_member on public.accounts
  for select using (id in (select account_ids_for_user()));
create policy accounts_all_admin on public.accounts
  for all using (is_admin()) with check (is_admin());
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

-- =========================
-- Account users policies
-- =========================
create policy account_users_read_member on public.account_users
  for select using (account_id in (select account_ids_for_user()));
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
create policy account_users_all_admin on public.account_users
  for all using (is_admin()) with check (is_admin());

-- =========================
-- Knowledge layer: access via account (notes/cards via space)
-- =========================
create policy knowledge_spaces_member on public.knowledge_spaces
  for all using (account_id in (select account_ids_for_user()))
  with check (account_id in (select account_ids_for_user()));
create policy knowledge_spaces_admin on public.knowledge_spaces
  for all using (is_admin()) with check (is_admin());

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
create policy notes_admin on public.notes for all using (is_admin()) with check (is_admin());

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
create policy cards_admin on public.cards for all using (is_admin()) with check (is_admin());

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
create policy card_links_admin on public.card_links for all using (is_admin()) with check (is_admin());

-- =========================
-- Habit system: habits + habit_sessions
-- =========================
create policy habits_member on public.habits
  for all using (account_id in (select account_ids_for_user()))
  with check (account_id in (select account_ids_for_user()));
create policy habits_admin on public.habits for all using (is_admin()) with check (is_admin());

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
create policy habit_sessions_admin on public.habit_sessions for all using (is_admin()) with check (is_admin());

-- =========================
-- Weekly planning: templates, template_entries, weeks
-- =========================
create policy templates_member on public.templates
  for all using (account_id in (select account_ids_for_user()))
  with check (account_id in (select account_ids_for_user()));
create policy templates_admin on public.templates for all using (is_admin()) with check (is_admin());

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
create policy template_entries_admin on public.template_entries for all using (is_admin()) with check (is_admin());

create policy weeks_member on public.weeks
  for all using (account_id in (select account_ids_for_user()))
  with check (account_id in (select account_ids_for_user()));
create policy weeks_admin on public.weeks for all using (is_admin()) with check (is_admin());

-- =========================
-- Finance layer
-- =========================
create policy finance_categories_member on public.finance_categories
  for all using (account_id in (select account_ids_for_user()))
  with check (account_id in (select account_ids_for_user()));
create policy finance_categories_admin on public.finance_categories for all using (is_admin()) with check (is_admin());

create policy ledger_entries_member on public.ledger_entries
  for all using (account_id in (select account_ids_for_user()))
  with check (account_id in (select account_ids_for_user()));
create policy ledger_entries_admin on public.ledger_entries for all using (is_admin()) with check (is_admin());

create policy debts_member on public.debts
  for all using (account_id in (select account_ids_for_user()))
  with check (account_id in (select account_ids_for_user()));
create policy debts_admin on public.debts for all using (is_admin()) with check (is_admin());

create policy debt_payments_member on public.debt_payments
  for all using (account_id in (select account_ids_for_user()))
  with check (account_id in (select account_ids_for_user()));
create policy debt_payments_admin on public.debt_payments for all using (is_admin()) with check (is_admin());

create policy subscriptions_member on public.subscriptions
  for all using (account_id in (select account_ids_for_user()))
  with check (account_id in (select account_ids_for_user()));
create policy subscriptions_admin on public.subscriptions for all using (is_admin()) with check (is_admin());

-- =========================
-- Auth trigger: on signup create profile + account + membership + starter categories
-- =========================
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

-- =========================
-- RPC: create week from template (generates habit_sessions)
-- =========================
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

  -- Remove existing sessions for this week (in case of template change)
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

-- =========================
-- RPC: update habit session (actual_minutes, rating, notes)
-- =========================
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

-- =========================
-- RPC: update last signed in
-- =========================
create or replace function public.update_my_last_signed_in()
returns void language plpgsql security definer set search_path = public as $$
begin
  update public.profiles set last_signed_in_at = now() where id = auth.uid();
end;
$$;

grant execute on function public.update_my_last_signed_in() to authenticated;

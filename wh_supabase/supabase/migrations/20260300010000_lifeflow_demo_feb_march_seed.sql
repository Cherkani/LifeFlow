create or replace function public.seed_demo_data_for_user(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_demo_user_id uuid;
  v_profile_id uuid;
  v_account_id uuid;
  v_objective_focus_id uuid;
  v_objective_health_id uuid;
  v_habit_deep_work_id uuid;
  v_habit_review_id uuid;
  v_habit_workout_id uuid;
  v_template_id uuid;
  v_space_ai_id uuid;
  v_space_fitness_id uuid;
  v_food_category_id uuid;
  v_transport_category_id uuid;
  v_learning_category_id uuid;
  v_health_category_id uuid;
  v_date date;
begin
  v_demo_user_id := p_user_id;
  if v_demo_user_id is null then
    return;
  end if;
  if auth.uid() is not null and auth.uid() <> v_demo_user_id then
    return;
  end if;

  insert into public.profiles (id, full_name, email, role, timezone, is_active)
  values (v_demo_user_id, 'Momentum Grid Demo', coalesce((select email from auth.users where id = v_demo_user_id), 'demo@lifeflow.app'), 'user', 'Africa/Casablanca', true)
  on conflict (id) do update set
    full_name = excluded.full_name,
    email = excluded.email,
    timezone = excluded.timezone,
    is_active = true;

  select id into v_profile_id from public.profiles where id = v_demo_user_id;

  select id into v_account_id
  from public.accounts
  where owner_id = v_profile_id
  order by created_at asc
  limit 1;

  if v_account_id is null then
    insert into public.accounts (owner_id, name, currency_code)
    values (v_profile_id, 'Momentum Grid Demo', 'MAD')
    returning id into v_account_id;
  else
    update public.accounts
    set name = 'Momentum Grid Demo', currency_code = 'MAD'
    where id = v_account_id;
  end if;

  insert into public.account_users (account_id, user_id, role)
  values (v_account_id, v_profile_id, 'owner')
  on conflict (account_id, user_id) do update set role = excluded.role;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'habit_objectives' and column_name = 'image_url'
  ) then
    insert into public.habit_objectives (account_id, title, description, image_url)
    select v_account_id, 'Deep Work Mastery', 'Build consistent focused work blocks every day.', 'https://images.pexels.com/photos/1181244/pexels-photo-1181244.jpeg'
    where not exists (
      select 1 from public.habit_objectives where account_id = v_account_id and title = 'Deep Work Mastery'
    );

    insert into public.habit_objectives (account_id, title, description, image_url)
    select v_account_id, 'Health Momentum', 'Maintain fitness and healthy routines weekly.', 'https://images.pexels.com/photos/3768916/pexels-photo-3768916.jpeg'
    where not exists (
      select 1 from public.habit_objectives where account_id = v_account_id and title = 'Health Momentum'
    );
  else
    insert into public.habit_objectives (account_id, title, description)
    select v_account_id, 'Deep Work Mastery', 'Build consistent focused work blocks every day.'
    where not exists (
      select 1 from public.habit_objectives where account_id = v_account_id and title = 'Deep Work Mastery'
    );

    insert into public.habit_objectives (account_id, title, description)
    select v_account_id, 'Health Momentum', 'Maintain fitness and healthy routines weekly.'
    where not exists (
      select 1 from public.habit_objectives where account_id = v_account_id and title = 'Health Momentum'
    );
  end if;

  select id into v_objective_focus_id
  from public.habit_objectives
  where account_id = v_account_id and title = 'Deep Work Mastery'
  limit 1;

  select id into v_objective_health_id
  from public.habit_objectives
  where account_id = v_account_id and title = 'Health Momentum'
  limit 1;

  insert into public.habits (account_id, objective_id, title, type, weekly_target_minutes, minimum_minutes, is_active)
  select v_account_id, v_objective_focus_id, 'Deep Work Session', 'time_tracking', 600, 60, true
  where not exists (
    select 1 from public.habits where account_id = v_account_id and title = 'Deep Work Session'
  );

  insert into public.habits (account_id, objective_id, title, type, weekly_target_minutes, minimum_minutes, is_active)
  select v_account_id, v_objective_focus_id, 'Daily Learning Review', 'time_tracking', 180, 20, true
  where not exists (
    select 1 from public.habits where account_id = v_account_id and title = 'Daily Learning Review'
  );

  insert into public.habits (account_id, objective_id, title, type, weekly_target_minutes, minimum_minutes, is_active)
  select v_account_id, v_objective_health_id, 'Workout Block', 'time_tracking', 240, 30, true
  where not exists (
    select 1 from public.habits where account_id = v_account_id and title = 'Workout Block'
  );

  select id into v_habit_deep_work_id from public.habits where account_id = v_account_id and title = 'Deep Work Session' limit 1;
  select id into v_habit_review_id from public.habits where account_id = v_account_id and title = 'Daily Learning Review' limit 1;
  select id into v_habit_workout_id from public.habits where account_id = v_account_id and title = 'Workout Block' limit 1;

  insert into public.templates (account_id, name)
  select v_account_id, 'Momentum Week'
  where not exists (
    select 1 from public.templates where account_id = v_account_id and name = 'Momentum Week'
  );

  select id into v_template_id
  from public.templates
  where account_id = v_account_id and name = 'Momentum Week'
  limit 1;

  delete from public.template_entries where template_id = v_template_id;

  insert into public.template_entries (template_id, habit_id, day_of_week, planned_minutes, minimum_minutes, is_required)
  values
    (v_template_id, v_habit_deep_work_id, 1, 120, 60, true),
    (v_template_id, v_habit_review_id, 1, 30, 20, true),
    (v_template_id, v_habit_workout_id, 1, 40, 30, true),
    (v_template_id, v_habit_deep_work_id, 2, 120, 60, true),
    (v_template_id, v_habit_review_id, 2, 30, 20, true),
    (v_template_id, v_habit_workout_id, 2, 30, 20, true),
    (v_template_id, v_habit_deep_work_id, 3, 120, 60, true),
    (v_template_id, v_habit_review_id, 3, 25, 20, true),
    (v_template_id, v_habit_workout_id, 3, 40, 30, true),
    (v_template_id, v_habit_deep_work_id, 4, 100, 60, true),
    (v_template_id, v_habit_review_id, 4, 25, 20, true),
    (v_template_id, v_habit_workout_id, 4, 30, 20, true),
    (v_template_id, v_habit_deep_work_id, 5, 120, 60, true),
    (v_template_id, v_habit_review_id, 5, 30, 20, true),
    (v_template_id, v_habit_workout_id, 5, 40, 30, true),
    (v_template_id, v_habit_deep_work_id, 6, 90, 45, true),
    (v_template_id, v_habit_review_id, 6, 20, 15, true),
    (v_template_id, v_habit_workout_id, 6, 30, 20, true),
    (v_template_id, v_habit_deep_work_id, 7, 80, 45, true),
    (v_template_id, v_habit_review_id, 7, 20, 15, true),
    (v_template_id, v_habit_workout_id, 7, 25, 15, true)
  on conflict (template_id, habit_id, day_of_week) do update set
    planned_minutes = excluded.planned_minutes,
    minimum_minutes = excluded.minimum_minutes,
    is_required = excluded.is_required;

  insert into public.weeks (account_id, template_id, week_start_date)
  values (v_account_id, v_template_id, date '2026-03-09')
  on conflict (account_id, week_start_date) do update set template_id = excluded.template_id;

  delete from public.habit_sessions
  where habit_id in (
    select id from public.habits where account_id = v_account_id
  ) and session_date between date '2026-02-01' and date '2026-03-31';

  for v_date in select generate_series(date '2026-02-01', date '2026-03-31', interval '1 day')::date loop
    if extract(isodow from v_date) between 1 and 5 then
      insert into public.habit_sessions (habit_id, session_date, planned_minutes, minimum_minutes, actual_minutes, completed)
      values (v_habit_deep_work_id, v_date, 120, 60, 70 + ((extract(day from v_date)::int * 3) % 50), true)
      on conflict (habit_id, session_date) do update set
        planned_minutes = excluded.planned_minutes,
        minimum_minutes = excluded.minimum_minutes,
        actual_minutes = excluded.actual_minutes,
        completed = excluded.completed;

      insert into public.habit_sessions (habit_id, session_date, planned_minutes, minimum_minutes, actual_minutes, completed)
      values (v_habit_review_id, v_date, 30, 20, 15 + ((extract(day from v_date)::int * 5) % 20), (15 + ((extract(day from v_date)::int * 5) % 20)) >= 20)
      on conflict (habit_id, session_date) do update set
        planned_minutes = excluded.planned_minutes,
        minimum_minutes = excluded.minimum_minutes,
        actual_minutes = excluded.actual_minutes,
        completed = excluded.completed;
    end if;

    if extract(isodow from v_date) in (1, 2, 3, 4, 5, 6) then
      insert into public.habit_sessions (habit_id, session_date, planned_minutes, minimum_minutes, actual_minutes, completed)
      values (v_habit_workout_id, v_date, 35, 20, 10 + ((extract(day from v_date)::int * 7) % 35), (10 + ((extract(day from v_date)::int * 7) % 35)) >= 20)
      on conflict (habit_id, session_date) do update set
        planned_minutes = excluded.planned_minutes,
        minimum_minutes = excluded.minimum_minutes,
        actual_minutes = excluded.actual_minutes,
        completed = excluded.completed;
    end if;
  end loop;

  if to_regclass('public.debt_payments') is not null and to_regclass('public.debts') is not null then
    delete from public.debt_payments
    where account_id = v_account_id;

    delete from public.debts
    where account_id = v_account_id and name in ('Laptop Installments', 'Friend Loan');

    insert into public.debts (account_id, type, name, principal, apr, due_date, status, remaining_balance, created_by)
    values
      (v_account_id, 'owing', 'Laptop Installments', 9000, 7.5, date '2026-08-31', 'open', 4200, v_profile_id),
      (v_account_id, 'owed', 'Friend Loan', 2500, null, date '2026-04-30', 'open', 1100, v_profile_id);

    insert into public.debt_payments (account_id, debt_id, amount, paid_at, method, notes, created_by)
    select v_account_id, d.id, 600, date '2026-02-10', 'bank_transfer', 'February installment', v_profile_id
    from public.debts d
    where d.account_id = v_account_id and d.name = 'Laptop Installments';

    insert into public.debt_payments (account_id, debt_id, amount, paid_at, method, notes, created_by)
    select v_account_id, d.id, 700, date '2026-03-10', 'bank_transfer', 'March installment', v_profile_id
    from public.debts d
    where d.account_id = v_account_id and d.name = 'Laptop Installments';

    insert into public.debt_payments (account_id, debt_id, amount, paid_at, method, notes, created_by)
    select v_account_id, d.id, 800, date '2026-03-18', 'cash', 'Partial repayment from friend', v_profile_id
    from public.debts d
    where d.account_id = v_account_id and d.name = 'Friend Loan';
  end if;

  if to_regclass('public.subscriptions') is not null then
    delete from public.subscriptions
    where account_id = v_account_id and name in ('Notion Plus', 'Spotify', 'Cloud Storage');

    insert into public.subscriptions (account_id, name, amount, currency_code, recurrence, next_due_date, notes, is_active)
    values
      (v_account_id, 'Notion Plus', 10, 'USD', 'monthly', date '2026-04-01', 'Knowledge workspace', true),
      (v_account_id, 'Spotify', 6, 'USD', 'monthly', date '2026-04-07', 'Music while working', true),
      (v_account_id, 'Cloud Storage', 24, 'USD', 'yearly', date '2026-11-20', 'Backups and assets', true);
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'finance_categories' and column_name = 'image_url'
  ) and exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'finance_categories' and column_name = 'monthly_limit'
  ) then
    insert into public.finance_categories (account_id, name, kind, color, monthly_limit, image_url)
    select v_account_id, 'Food', 'expense', '#ef4444', 2200, 'https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg'
    where not exists (select 1 from public.finance_categories where account_id = v_account_id and name = 'Food');

    insert into public.finance_categories (account_id, name, kind, color, monthly_limit, image_url)
    select v_account_id, 'Transport', 'expense', '#3b82f6', 900, 'https://images.pexels.com/photos/210182/pexels-photo-210182.jpeg'
    where not exists (select 1 from public.finance_categories where account_id = v_account_id and name = 'Transport');

    insert into public.finance_categories (account_id, name, kind, color, monthly_limit, image_url)
    select v_account_id, 'Learning', 'expense', '#8b5cf6', 1400, 'https://images.pexels.com/photos/159866/books-book-pages-read-literature-159866.jpeg'
    where not exists (select 1 from public.finance_categories where account_id = v_account_id and name = 'Learning');

    insert into public.finance_categories (account_id, name, kind, color, monthly_limit, image_url)
    select v_account_id, 'Health', 'expense', '#10b981', 1200, 'https://images.pexels.com/photos/4324020/pexels-photo-4324020.jpeg'
    where not exists (select 1 from public.finance_categories where account_id = v_account_id and name = 'Health');
  elsif exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'finance_categories' and column_name = 'monthly_limit'
  ) then
    insert into public.finance_categories (account_id, name, kind, color, monthly_limit)
    select v_account_id, 'Food', 'expense', '#ef4444', 2200
    where not exists (select 1 from public.finance_categories where account_id = v_account_id and name = 'Food');

    insert into public.finance_categories (account_id, name, kind, color, monthly_limit)
    select v_account_id, 'Transport', 'expense', '#3b82f6', 900
    where not exists (select 1 from public.finance_categories where account_id = v_account_id and name = 'Transport');

    insert into public.finance_categories (account_id, name, kind, color, monthly_limit)
    select v_account_id, 'Learning', 'expense', '#8b5cf6', 1400
    where not exists (select 1 from public.finance_categories where account_id = v_account_id and name = 'Learning');

    insert into public.finance_categories (account_id, name, kind, color, monthly_limit)
    select v_account_id, 'Health', 'expense', '#10b981', 1200
    where not exists (select 1 from public.finance_categories where account_id = v_account_id and name = 'Health');
  else
    insert into public.finance_categories (account_id, name, kind, color)
    select v_account_id, 'Food', 'expense', '#ef4444'
    where not exists (select 1 from public.finance_categories where account_id = v_account_id and name = 'Food');

    insert into public.finance_categories (account_id, name, kind, color)
    select v_account_id, 'Transport', 'expense', '#3b82f6'
    where not exists (select 1 from public.finance_categories where account_id = v_account_id and name = 'Transport');

    insert into public.finance_categories (account_id, name, kind, color)
    select v_account_id, 'Learning', 'expense', '#8b5cf6'
    where not exists (select 1 from public.finance_categories where account_id = v_account_id and name = 'Learning');

    insert into public.finance_categories (account_id, name, kind, color)
    select v_account_id, 'Health', 'expense', '#10b981'
    where not exists (select 1 from public.finance_categories where account_id = v_account_id and name = 'Health');
  end if;

  select id into v_food_category_id from public.finance_categories where account_id = v_account_id and name = 'Food' limit 1;
  select id into v_transport_category_id from public.finance_categories where account_id = v_account_id and name = 'Transport' limit 1;
  select id into v_learning_category_id from public.finance_categories where account_id = v_account_id and name = 'Learning' limit 1;
  select id into v_health_category_id from public.finance_categories where account_id = v_account_id and name = 'Health' limit 1;

  delete from public.ledger_entries
  where account_id = v_account_id and occurred_on between date '2026-02-01' and date '2026-03-31';

  for v_date in select generate_series(date '2026-02-01', date '2026-03-31', interval '1 day')::date loop
    insert into public.ledger_entries (account_id, category_id, entry_type, amount, currency_code, occurred_on, notes, created_by)
    values (v_account_id, v_food_category_id, 'expense', 35 + ((extract(day from v_date)::int * 2) % 45), 'MAD', v_date, 'Meals and groceries', v_profile_id);

    if extract(isodow from v_date) between 1 and 5 then
      insert into public.ledger_entries (account_id, category_id, entry_type, amount, currency_code, occurred_on, notes, created_by)
      values (v_account_id, v_transport_category_id, 'expense', 12 + ((extract(day from v_date)::int * 3) % 18), 'MAD', v_date, 'Commute', v_profile_id);
    end if;

    if extract(day from v_date)::int % 3 = 0 then
      insert into public.ledger_entries (account_id, category_id, entry_type, amount, currency_code, occurred_on, notes, created_by)
      values (v_account_id, v_learning_category_id, 'expense', 60 + ((extract(day from v_date)::int * 11) % 90), 'MAD', v_date, 'Books or courses', v_profile_id);
    end if;

    if extract(day from v_date)::int % 4 = 0 then
      insert into public.ledger_entries (account_id, category_id, entry_type, amount, currency_code, occurred_on, notes, created_by)
      values (v_account_id, v_health_category_id, 'expense', 40 + ((extract(day from v_date)::int * 5) % 60), 'MAD', v_date, 'Gym and wellness', v_profile_id);
    end if;
  end loop;

  if to_regclass('public.calendar_events') is not null then
    delete from public.calendar_events
    where account_id = v_account_id and event_date between date '2026-02-01' and date '2026-03-31';

    if exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'calendar_events' and column_name = 'description'
    ) then
      insert into public.calendar_events (account_id, title, description, event_date, start_time, end_time, kind)
      values
        (v_account_id, 'Weekly Planning', 'Plan weekly priorities and review backlog.', date '2026-02-02', '09:00', '09:45', 'meeting'),
        (v_account_id, 'Mentor Call', 'Discuss strategy and blockers.', date '2026-02-11', '18:00', '19:00', 'important'),
        (v_account_id, 'Project Milestone', 'Submit monthly deliverable.', date '2026-02-26', '11:00', '12:00', 'important'),
        (v_account_id, 'March Kickoff', 'Define March learning and habits.', date '2026-03-01', '10:00', '11:00', 'meeting'),
        (v_account_id, 'Team Sync', 'Progress update and next actions.', date '2026-03-12', '14:30', '15:15', 'meeting'),
        (v_account_id, 'Quarter Reflection', 'Assess outcomes and adjust goals.', date '2026-03-29', '17:30', '18:30', 'important');
    else
      insert into public.calendar_events (account_id, title, details, event_date, event_type)
      values
        (v_account_id, 'Weekly Planning', 'Plan weekly priorities and review backlog.', date '2026-02-02', 'meeting'),
        (v_account_id, 'Mentor Call', 'Discuss strategy and blockers.', date '2026-02-11', 'important'),
        (v_account_id, 'Project Milestone', 'Submit monthly deliverable.', date '2026-02-26', 'important'),
        (v_account_id, 'March Kickoff', 'Define March learning and habits.', date '2026-03-01', 'meeting'),
        (v_account_id, 'Team Sync', 'Progress update and next actions.', date '2026-03-12', 'meeting'),
        (v_account_id, 'Quarter Reflection', 'Assess outcomes and adjust goals.', date '2026-03-29', 'important');
    end if;
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'knowledge_spaces' and column_name = 'image_url'
  ) then
    insert into public.knowledge_spaces (account_id, title, image_url)
    select v_account_id, 'AI Research', 'https://images.pexels.com/photos/8386440/pexels-photo-8386440.jpeg'
    where not exists (select 1 from public.knowledge_spaces where account_id = v_account_id and title = 'AI Research');

    insert into public.knowledge_spaces (account_id, title, image_url)
    select v_account_id, 'Fitness Notes', 'https://images.pexels.com/photos/841130/pexels-photo-841130.jpeg'
    where not exists (select 1 from public.knowledge_spaces where account_id = v_account_id and title = 'Fitness Notes');
  else
    insert into public.knowledge_spaces (account_id, title)
    select v_account_id, 'AI Research'
    where not exists (select 1 from public.knowledge_spaces where account_id = v_account_id and title = 'AI Research');

    insert into public.knowledge_spaces (account_id, title)
    select v_account_id, 'Fitness Notes'
    where not exists (select 1 from public.knowledge_spaces where account_id = v_account_id and title = 'Fitness Notes');
  end if;

  select id into v_space_ai_id from public.knowledge_spaces where account_id = v_account_id and title = 'AI Research' limit 1;
  select id into v_space_fitness_id from public.knowledge_spaces where account_id = v_account_id and title = 'Fitness Notes' limit 1;

  if to_regclass('public.knowledge_items') is not null then
    delete from public.knowledge_items where space_id in (v_space_ai_id, v_space_fitness_id);

    insert into public.knowledge_items (space_id, kind, title, url, content, created_at, updated_at)
    values
      (v_space_ai_id, 'link', 'Attention Is All You Need', 'https://arxiv.org/abs/1706.03762', 'Core transformer paper for fundamentals.', '2026-02-05T09:15:00Z', '2026-02-05T09:15:00Z'),
      (v_space_ai_id, 'note', 'Prompt evaluation checklist', null, 'Define success criteria, edge cases, and failure signals before iterating prompts.', '2026-02-18T21:10:00Z', '2026-02-18T21:10:00Z'),
      (v_space_ai_id, 'link', 'RAG best practices', 'https://docs.llamaindex.ai', 'Reference patterns for indexing and retrieval quality.', '2026-03-08T12:30:00Z', '2026-03-08T12:30:00Z'),
      (v_space_fitness_id, 'note', 'Progressive overload', null, 'Increase volume weekly with one lighter deload week each month.', '2026-02-09T07:40:00Z', '2026-02-09T07:40:00Z'),
      (v_space_fitness_id, 'link', 'Mobility routine', 'https://www.youtube.com/watch?v=L_xrDAtykMI', '15-minute daily mobility flow.', '2026-03-15T06:55:00Z', '2026-03-15T06:55:00Z');
  end if;
end;
$$;

grant execute on function public.seed_demo_data_for_user(uuid) to authenticated;

do $$
declare
  v_demo_user_id uuid;
begin
  select id into v_demo_user_id from auth.users where email = 'demo@lifeflow.app' limit 1;
  if v_demo_user_id is not null then
    perform public.seed_demo_data_for_user(v_demo_user_id);
  end if;
end $$;

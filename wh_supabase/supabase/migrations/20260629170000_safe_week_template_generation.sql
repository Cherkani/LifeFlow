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

  delete from public.habit_sessions hs
  using public.habits h
  where h.id = hs.habit_id
    and h.account_id = p_account_id
    and hs.session_date >= p_week_start_date
    and hs.session_date <= p_week_start_date + 6
    and hs.completed = false
    and hs.actual_minutes is null
    and hs.rating is null
    and hs.notes is null
    and not exists (
      select 1
      from public.template_entries te
      where te.template_id = p_template_id
        and te.habit_id = hs.habit_id
        and te.day_of_week = extract(isodow from hs.session_date)::integer
    );

  for v_entry in
    select te.habit_id, te.day_of_week, te.planned_minutes, te.minimum_minutes
    from public.template_entries te
    join public.habits h on h.id = te.habit_id
    where te.template_id = p_template_id
      and h.account_id = p_account_id
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

-- Add cycle tracking demo data for Momentum Grid Demo user.
-- This migration runs for existing databases; fresh installs get cycle data via seed_demo_data_for_user.

do $$
declare
  v_demo_email text := 'demo@lifeflow.app';
  v_demo_user_id uuid;
begin
  select id into v_demo_user_id from auth.users where email = v_demo_email limit 1;
  if v_demo_user_id is null then
    return;
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public' and table_name = 'profiles' and column_name = 'cycle_tracking_enabled'
  ) then
    update public.profiles
    set
      cycle_tracking_enabled = true,
      luteal_phase_length = 13
    where id = v_demo_user_id;
  end if;

  if to_regclass('public.period_cycles') is not null then
    delete from public.period_daily_logs where user_id = v_demo_user_id;
    delete from public.period_cycles where user_id = v_demo_user_id;

    insert into public.period_cycles (user_id, period_start, period_end)
    values
      (v_demo_user_id, date '2026-01-15', date '2026-01-19'),
      (v_demo_user_id, date '2026-02-12', date '2026-02-16');

    insert into public.period_daily_logs (user_id, log_date, flow_intensity, symptoms, notes, moods)
    values
      (v_demo_user_id, date '2026-02-12', 'medium', array['cramps', 'fatigue'], 'First day of period', array['tired', 'sensitive']),
      (v_demo_user_id, date '2026-02-13', 'heavy', array['cramps', 'bloating'], null, array['low energy']),
      (v_demo_user_id, date '2026-02-14', 'heavy', array['cramps'], null, array['moody']),
      (v_demo_user_id, date '2026-02-15', 'light', array['fatigue'], null, array['calm']),
      (v_demo_user_id, date '2026-02-16', 'spotting', '{}', null, array['relieved']),
      (v_demo_user_id, date '2026-03-09', null, array['cramps'], 'Feeling a bit off today', array['anxious']);
  end if;

  if to_regclass('public.ovulation_confirmations') is not null then
    delete from public.ovulation_confirmations where user_id = v_demo_user_id;
    insert into public.ovulation_confirmations (user_id, confirmed_on, method, notes)
    values
      (v_demo_user_id, date '2026-02-26', 'opk', 'Positive OPK followed by temperature shift'),
      (v_demo_user_id, date '2026-03-26', 'symptoms', 'Cervical fluid + LH strip');
  end if;
end $$;

create or replace function public.ensure_my_account()
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_email text;
  v_full_name text;
  v_timezone text;
  v_account_id uuid;
begin
  if v_user_id is null then
    return null;
  end if;

  select
    u.email,
    coalesce(u.raw_user_meta_data->>'full_name', u.raw_user_meta_data->>'name', ''),
    coalesce(u.raw_user_meta_data->>'timezone', 'Africa/Casablanca')
  into
    v_email,
    v_full_name,
    v_timezone
  from auth.users u
  where u.id = v_user_id;

  insert into public.profiles (id, full_name, email, role, timezone, is_active)
  values (
    v_user_id,
    nullif(trim(v_full_name), ''),
    v_email,
    'user',
    v_timezone,
    true
  )
  on conflict (id) do update set
    full_name = coalesce(excluded.full_name, public.profiles.full_name),
    email = coalesce(excluded.email, public.profiles.email),
    timezone = coalesce(excluded.timezone, public.profiles.timezone),
    is_active = true;

  select au.account_id
  into v_account_id
  from public.account_users au
  where au.user_id = v_user_id
  order by au.created_at asc
  limit 1;

  if v_account_id is null then
    select a.id
    into v_account_id
    from public.accounts a
    where a.owner_id = v_user_id
    order by a.created_at asc
    limit 1;
  end if;

  if v_account_id is null then
    insert into public.accounts (owner_id, name, currency_code)
    values (
      v_user_id,
      coalesce(nullif(trim(v_full_name), ''), 'My Workspace'),
      'USD'
    )
    returning id into v_account_id;
  end if;

  insert into public.account_users (account_id, user_id, role)
  values (v_account_id, v_user_id, 'owner')
  on conflict (account_id, user_id) do update set role = excluded.role;

  insert into public.finance_categories (account_id, name, kind)
  values
    (v_account_id, 'Income', 'income'),
    (v_account_id, 'Savings', 'savings'),
    (v_account_id, 'Housing', 'expense'),
    (v_account_id, 'Food', 'expense'),
    (v_account_id, 'Transport', 'expense'),
    (v_account_id, 'Debt Payment', 'debt_payment')
  on conflict do nothing;

  return v_account_id;
end;
$$;

grant execute on function public.ensure_my_account() to authenticated;

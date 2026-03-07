do $$
declare
  v_demo_email text := 'demo@lifeflow.app';
  v_demo_user_id uuid;
  v_demo_account_id uuid;
begin
  select id into v_demo_user_id
  from auth.users
  where email = v_demo_email
  limit 1;

  if v_demo_user_id is null then
    raise exception 'Demo user % not found in auth.users', v_demo_email;
  end if;

  insert into public.profiles (id, full_name, email, role, timezone, is_active)
  values (v_demo_user_id, 'Momentum Grid Demo', v_demo_email, 'user', 'Africa/Casablanca', true)
  on conflict (id) do update set
    full_name = excluded.full_name,
    email = excluded.email,
    timezone = excluded.timezone,
    is_active = true;

  select id into v_demo_account_id
  from public.accounts
  where owner_id = v_demo_user_id
  order by created_at asc
  limit 1;

  if v_demo_account_id is null then
    insert into public.accounts (owner_id, name, currency_code)
    values (v_demo_user_id, 'Momentum Grid Demo', 'MAD')
    returning id into v_demo_account_id;
  else
    update public.accounts
    set owner_id = v_demo_user_id,
        name = 'Momentum Grid Demo',
        currency_code = 'MAD'
    where id = v_demo_account_id;
  end if;

  insert into public.account_users (account_id, user_id, role)
  values (v_demo_account_id, v_demo_user_id, 'owner')
  on conflict (account_id, user_id) do update set role = excluded.role;

  delete from public.account_users
  where account_id = v_demo_account_id
    and user_id <> v_demo_user_id;

  delete from public.account_users
  where account_id <> v_demo_account_id;

  delete from public.accounts
  where id <> v_demo_account_id;

  delete from public.profiles
  where id <> v_demo_user_id;

  perform public.seed_demo_data_for_user(v_demo_user_id);
end $$;

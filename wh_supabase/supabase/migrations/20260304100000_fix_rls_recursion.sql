-- Fix 42P17 infinite recursion: policies that query account_users from within account_users RLS
-- Use SECURITY DEFINER helper to bypass RLS when checking role

create or replace function public.user_is_account_owner_or_admin(p_account_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.account_users au
    where au.account_id = p_account_id and au.user_id = auth.uid() and au.role in ('owner','admin')
  );
$$;

-- Drop and recreate policies that caused recursion
drop policy if exists accounts_update_owner on public.accounts;
create policy accounts_update_owner on public.accounts
  for update using (user_is_account_owner_or_admin(id))
  with check (user_is_account_owner_or_admin(id));

drop policy if exists account_users_manage_owner on public.account_users;
create policy account_users_manage_owner on public.account_users
  for all using (user_is_account_owner_or_admin(account_id))
  with check (user_is_account_owner_or_admin(account_id));

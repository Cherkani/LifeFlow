create table if not exists public.finance_public_shares (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts(id) on delete cascade,
  token text not null unique default replace(gen_random_uuid()::text, '-', ''),
  scope text not null default 'debts' check (scope in ('debts')),
  debt_group_key text,
  is_active boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create unique index if not exists idx_finance_public_shares_debt_group_unique
  on public.finance_public_shares(account_id, scope, debt_group_key)
  where is_active = true and scope = 'debts';
create index if not exists idx_finance_public_shares_account on public.finance_public_shares(account_id, scope, debt_group_key, is_active);
create index if not exists idx_finance_public_shares_token on public.finance_public_shares(token) where is_active = true;

alter table public.finance_public_shares enable row level security;

drop policy if exists finance_public_shares_member on public.finance_public_shares;
create policy finance_public_shares_member on public.finance_public_shares
  for all using (
    exists (
      select 1 from public.account_users au
      where au.account_id = finance_public_shares.account_id
        and au.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.account_users au
      where au.account_id = finance_public_shares.account_id
        and au.user_id = auth.uid()
    )
  );

create or replace function public.get_public_finance_debts(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_share record;
begin
  select s.account_id, s.debt_group_key, a.name as account_name, a.currency_code
    into v_share
  from public.finance_public_shares s
  join public.accounts a on a.id = s.account_id
  where s.token = p_token
    and s.scope = 'debts'
    and s.is_active = true
  limit 1;

  if v_share.account_id is null then
    return jsonb_build_object('found', false);
  end if;

  return jsonb_build_object(
    'found', true,
    'accountName', v_share.account_name,
    'currencyCode', v_share.currency_code,
    'debtGroupKey', v_share.debt_group_key,
    'debts', coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'id', d.id,
            'name', d.name,
            'type', d.type,
            'principal', d.principal,
            'remainingBalance', case
              when d.status = 'open' and coalesce(d.remaining_balance, 0) <= 0 then d.principal
              else coalesce(d.remaining_balance, d.principal)
            end,
            'status', d.status,
            'dueDate', d.due_date
          )
          order by d.created_at desc
        )
        from public.debts d
        where d.account_id = v_share.account_id
          and lower(coalesce(nullif((regexp_split_to_array(trim(d.name), '\s+'))[1], ''), 'ungrouped')) = v_share.debt_group_key
      ),
      '[]'::jsonb
    )
  );
end;
$$;

revoke all on function public.get_public_finance_debts(text) from public;
grant execute on function public.get_public_finance_debts(text) to anon, authenticated;

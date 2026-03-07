-- Simplify knowledge model:
-- Keep only knowledge_spaces + knowledge_items (link or note)

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

-- Best-effort data migration from old tables
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

create policy knowledge_items_admin on public.knowledge_items
  for all using (is_admin()) with check (is_admin());

drop trigger if exists trg_knowledge_items_set_updated on public.knowledge_items;
create trigger trg_knowledge_items_set_updated
  before update on public.knowledge_items
  for each row execute function public.set_updated_at();

-- remove old knowledge complexity tables

drop table if exists public.knowledge_diary_entries cascade;
drop table if exists public.card_links cascade;
drop table if exists public.cards cascade;
drop table if exists public.notes cascade;

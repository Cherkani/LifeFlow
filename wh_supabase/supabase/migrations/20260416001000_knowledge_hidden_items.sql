-- Add hidden/protected knowledge items support.

alter table public.knowledge_items
  add column if not exists is_hidden boolean not null default false;

create index if not exists idx_knowledge_items_hidden
  on public.knowledge_items(space_id, is_hidden, created_at desc);

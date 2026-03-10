-- Add checked/done state to knowledge_items
-- When checked, items are considered done and sort to the bottom

alter table public.knowledge_items
  add column if not exists checked boolean not null default false;

create index if not exists idx_knowledge_items_checked
  on public.knowledge_items(space_id, checked, created_at desc);

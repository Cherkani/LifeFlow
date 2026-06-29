alter table public.knowledge_items
  add column if not exists tag text;

create index if not exists idx_knowledge_items_space_tag
  on public.knowledge_items(space_id, tag);

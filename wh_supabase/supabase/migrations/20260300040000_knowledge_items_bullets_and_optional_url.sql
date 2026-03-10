-- Add 'bullets' kind to knowledge_items
-- Notes and bullets can have optional url (shown as "Check" button)

-- Drop all check constraints (kind check + table check)
do $$
declare
  r record;
begin
  for r in (
    select conname from pg_constraint
    where conrelid = 'public.knowledge_items'::regclass and contype = 'c'
  ) loop
    execute format('alter table public.knowledge_items drop constraint if exists %I', r.conname);
  end loop;
end $$;

-- Re-add kind constraint with bullets
alter table public.knowledge_items add constraint knowledge_items_kind_check
  check (kind in ('link', 'note', 'bullets'));

-- Re-add content/url validation
alter table public.knowledge_items add constraint knowledge_items_check
  check (
    (kind = 'link' and url is not null)
    or
    ((kind = 'note' or kind = 'bullets') and content is not null and length(btrim(content)) > 0)
  );

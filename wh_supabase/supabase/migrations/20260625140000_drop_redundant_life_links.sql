-- Phase/project ownership is represented by real foreign-key columns. The old
-- polymorphic table duplicated those relationships without referential integrity.
drop table if exists public.life_links;

-- Remove gender column (no longer used; cycle tracking is a simple opt-in for all users)
alter table public.profiles drop column if exists gender;

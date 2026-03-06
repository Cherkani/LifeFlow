-- Cleanup: drop old LifeQuest tables (objectives, tasks, budgets, etc.)
-- Only drops tables that don't exist in LifeOS schema. Safe to run multiple times.
-- Created: 2026-03-04

drop table if exists public.monthly_reports cascade;
drop table if exists public.reminders cascade;
drop table if exists public.budgets cascade;
drop table if exists public.tasks cascade;
drop table if exists public.objectives cascade;

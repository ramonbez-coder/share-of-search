-- ============================================================
-- Share of Search — Supabase Setup
-- Run this in: Supabase Dashboard → SQL Editor → New Query
-- ============================================================

-- 1. Create the table (skip if it already exists)
create table if not exists "brand-share-of-search" (
  id         bigserial primary key,
  created_at timestamptz default now() not null,
  country    text        not null,
  traffic    numeric     not null,
  brand      text        not null,
  -- period stores the first day of the month this data represents
  -- e.g. 2026-03-01 = March 2026 data
  period     date        not null
);

-- 2. Add a unique constraint so upserts work correctly
--    (prevents duplicate rows if the job runs twice)
create unique index if not exists brand_country_period_idx
  on "brand-share-of-search" (brand, country, period);

-- 3. Optional: add an index for fast dashboard queries by period
create index if not exists period_idx
  on "brand-share-of-search" (period desc);

-- 4. Optional: Row Level Security
--    Enable this if you want to restrict reads/writes by user.
--    For a service-side script with the anon key, you can leave RLS off.
-- alter table "brand-share-of-search" enable row level security;

-- ============================================================
-- Verify setup — run this after to check the table exists
-- ============================================================
select
  column_name,
  data_type,
  is_nullable
from information_schema.columns
where table_name = 'brand-share-of-search'
order by ordinal_position;

-- ============================================================
-- Share of Search + LLM Mentions — Supabase Setup
-- Run this in: Supabase Dashboard → SQL Editor → New Query
-- ============================================================

-- ── Table 1: Brand Share of Search (Google keyword volumes) ─────────────────

create table if not exists "brand-share-of-search" (
  id         bigserial primary key,
  created_at timestamptz default now() not null,
  country    text        not null,
  traffic    numeric     not null,
  brand      text        not null,
  period     date        not null   -- e.g. 2026-03-01 = March 2026
);

create unique index if not exists brand_country_period_idx
  on "brand-share-of-search" (brand, country, period);

create index if not exists sos_period_idx
  on "brand-share-of-search" (period desc);


-- ── Table 2: Brand LLM Mentions (Google AI Overviews / AI Search) ────────────

create table if not exists "brand-llm-mentions" (
  id               bigserial primary key,
  created_at       timestamptz default now() not null,
  brand            text        not null,
  country          text        not null,
  mentions         integer     not null default 0,  -- raw mention count in LLM responses
  ai_search_volume integer     not null default 0,  -- estimated AI search queries that surfaced the brand
  impressions      bigint      not null default 0,  -- estimated total impressions
  platform         text        not null default 'google', -- 'google' or 'chat_gpt'
  period           date        not null   -- e.g. 2026-03-01 = March 2026
);

create unique index if not exists llm_brand_country_platform_period_idx
  on "brand-llm-mentions" (brand, country, platform, period);

create index if not exists llm_period_idx
  on "brand-llm-mentions" (period desc);


-- ── Verify both tables ───────────────────────────────────────────────────────
select table_name, column_name, data_type
from information_schema.columns
where table_name in ('brand-share-of-search', 'brand-llm-mentions')
order by table_name, ordinal_position;


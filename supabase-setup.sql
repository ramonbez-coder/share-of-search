-- ============================================================
-- Share of Search + LLM Mentions — Supabase Setup
-- Run this in: Supabase Dashboard → SQL Editor → New Query
-- ============================================================
--
-- `id` is a BIGINT primary key computed in code (`src/record-key.ts`).
--
-- Share of search digit layout : {CC}{MM}{YYYY}{BB}  →  country / month / year / brand
--   Codes follow declaration order in `MARKETS` and `BRANDS` in src/config.ts
-- LLM mentions              : {CC}{MM}{YYYY}{BB}{PP}  → … + platform (google=01, chat_gpt=02)

-- ── Table 1: Brand Share of Search (Google keyword volumes) ─────────────────

create table if not exists "brand-share-of-search" (
  id         bigint          primary key,
  created_at timestamptz     default now() not null,
  country    text            not null,
  traffic    numeric         not null,
  brand      text            not null,
  period     date            not null   -- e.g. 2026-03-01 = March 2026
);

create unique index if not exists brand_country_period_idx
  on "brand-share-of-search" (brand, country, period);

create index if not exists sos_period_idx
  on "brand-share-of-search" (period desc);

-- Internal analytics table — no user data, RLS not needed
alter table "brand-share-of-search" disable row level security;


-- ── Table 2: Brand LLM Mentions (Google AI Overviews / AI Search) ────────────

create table if not exists "brand-llm-mentions" (
  id               bigint          primary key,
  created_at       timestamptz     default now() not null,
  brand            text            not null,
  country          text            not null,
  mentions         integer         not null default 0,
  ai_search_volume integer         not null default 0,
  impressions      bigint          not null default 0,
  platform         text            not null default 'google',
  period           date            not null
);

create unique index if not exists llm_brand_country_platform_period_idx
  on "brand-llm-mentions" (brand, country, platform, period);

create index if not exists llm_period_idx
  on "brand-llm-mentions" (period desc);

-- Internal analytics table — no user data, RLS not needed
alter table "brand-llm-mentions" disable row level security;


-- ── Verify both tables ───────────────────────────────────────────────────────
select table_name, column_name, data_type
from information_schema.columns
where table_name in ('brand-share-of-search', 'brand-llm-mentions')
order by table_name, ordinal_position;

# SKILL: Brand Share of Search Tracker

## Purpose
Monthly cron job that fetches Google keyword search volume for brand names
across European markets using DataForSEO, then stores the results in Supabase
for share-of-search competitive analysis.

---

## Architecture

```
src/
├── index.ts        Entry point. Parses args, orchestrates the run, prints summary.
├── config.ts       Brand list and market definitions (location codes, languages).
├── dataforseo.ts   DataForSEO API client. Calls search_volume/live endpoint.
└── supabase.ts     Supabase client. Upserts results into brand-share-of-search table.
```

---

## Brands tracked
- eversports (our brand)
- bsport, mindbody, timp, momence, deciplus (competitors)

To add/remove brands: edit `src/config.ts` → `BRANDS` array.

## Markets tracked
Germany, Austria, Switzerland, France, Spain, Italy, Netherlands, Belgium

To add/remove markets: edit `src/config.ts` → `MARKETS` object.
DataForSEO location codes: https://api.dataforseo.com/v3/keywords_data/google_ads/locations

---

## Environment Variables

| Variable              | Where to get it                                          |
|-----------------------|----------------------------------------------------------|
| DATAFORSEO_LOGIN      | https://app.dataforseo.com/api-dashboard                 |
| DATAFORSEO_PASSWORD   | https://app.dataforseo.com/api-dashboard                 |
| SUPABASE_URL          | Supabase Dashboard → Settings → API → Project URL        |
| SUPABASE_ANON_KEY     | Supabase Dashboard → Settings → API → anon public key    |

---

## First-Time Setup

1. **Supabase table**: Run `supabase-setup.sql` in the Supabase SQL Editor.

2. **Install deps**: `npm install`

3. **Credentials**: `cp .env.example .env` and fill in all 4 values.

4. **Test dry run** (no API calls, no DB writes):
   ```bash
   DRY_RUN=true npm run start
   ```

5. **Test live** (makes real API calls, writes to DB):
   ```bash
   npm run start
   ```

6. **Backfill a specific month**:
   ```bash
   npm run start -- --month 2026-03
   ```

---

## Scheduling (GitHub Actions)

1. Push this repo to GitHub.
2. Add 4 secrets in GitHub → Settings → Secrets and variables → Actions:
   - `DATAFORSEO_LOGIN`
   - `DATAFORSEO_PASSWORD`
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
3. The workflow in `.github/workflows/share-of-search.yml` runs automatically
   on the 1st of each month at 07:00 UTC.
4. You can also trigger it manually from the GitHub Actions tab, with an
   optional `month` input for backfilling (e.g. `2025-11`).

---

## Supabase Table Schema

```sql
"brand-share-of-search" (
  id         bigserial PRIMARY KEY,
  created_at timestamptz DEFAULT now(),
  country    text NOT NULL,        -- e.g. "Germany"
  traffic    numeric NOT NULL,     -- total monthly search volume
  brand      text NOT NULL,        -- e.g. "eversports"
  period     date NOT NULL         -- e.g. 2026-03-01 = March 2026
)
```

Unique index: `(brand, country, period)` — prevents duplicate rows on re-runs.

---

## Cost estimate

- 6 brands × 8 markets = 48 keywords per run
- DataForSEO search_volume/live: ~$0.002 per keyword
- **~$0.10 per monthly run** (about $1.20/year)

---

## Common Issues

**"Missing DATAFORSEO_LOGIN"** → `.env` file not found or not filled in.

**"Supabase upsert failed"** → Check:
  1. Table exists (run `supabase-setup.sql`)
  2. Unique index exists on `(brand, country, period)`
  3. Your anon key has INSERT permissions (check RLS policies)

**All volumes are 0** → The brand keyword may have no search data for that
  market/month. This is normal for small brands in small markets.

**DataForSEO status_code != 20000** → Check your account balance and that
  your login/password are correct.

---

## Cursor Context

This is a TypeScript Node.js project. It calls the DataForSEO
`/v3/keywords_data/google_ads/search_volume/live` endpoint to get monthly
search volume for brand keyword strings across 8 European markets, then
upserts the results (brand, country, traffic, period) into a Supabase
Postgres table called `brand-share-of-search`. It runs as a monthly
GitHub Actions cron job on the 1st of each month.

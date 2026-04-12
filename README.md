# Brand Share of Search Tracker

Fetches monthly Google keyword search volume for brand names across European markets using DataForSEO, stores results in Supabase. Runs on the 1st of each month via GitHub Actions.

## Quick Start

```bash
# 1. Install
npm install

# 2. Configure
cp .env.example .env
# → fill in your DataForSEO and Supabase credentials

# 3. Set up Supabase table
# → run supabase-setup.sql in Supabase SQL Editor

# 4. Test (dry run — no API calls, no DB writes)
DRY_RUN=true npm run start

# 5. Run for real
npm run start

# 6. Backfill a specific month
npm run start -- --month 2026-01
```

## Brands tracked
eversports · bsport · mindbody · timp · momence · deciplus

## Markets tracked
Germany · Austria · Switzerland · France · Spain · Italy · Netherlands · Belgium

## Scheduling
See `.github/workflows/share-of-search.yml` — runs automatically on the 1st of each month.
Add your 4 secrets to GitHub → Settings → Secrets.

## Cost
~$0.10/month on DataForSEO (48 keywords × $0.002).

---

See `SKILL.md` for full documentation including schema, troubleshooting, and Cursor context.

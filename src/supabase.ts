import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { BrandVolumeResult } from "./dataforseo";
import { LlmMentionResult } from "./llm-mentions";
import { numericRowIdLlm, numericRowIdShare } from "./record-key";

// ─── Table names ──────────────────────────────────────────────────────────────
const TABLE_SEARCH = "brand-share-of-search";
const TABLE_LLM    = "brand-llm-mentions";

// ─── Row type ─────────────────────────────────────────────────────────────────
interface BrandShareRow {
  id: number;
  brand: string;
  country: string;
  traffic: number;
  period: string; // ISO date string: "YYYY-MM-01"
  created_at: string;
}

// ─── Client factory ───────────────────────────────────────────────────────────
function supabaseSecretKey(): string | undefined {
  return process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
}

function createSupabaseClient(): SupabaseClient {
  const key = supabaseSecretKey();

  if (!process.env.SUPABASE_URL || !key) {
    throw new Error(
      "Missing Supabase credentials.\n" +
      "Set SUPABASE_URL plus either SUPABASE_ANON_KEY (with RLS policies that allow your writes)\n" +
      "or SUPABASE_SERVICE_ROLE_KEY for server-side workflows (recommended for CI / GitHub Actions)."
    );
  }

  return createClient(process.env.SUPABASE_URL, key);
}

// ─── Store results ────────────────────────────────────────────────────────────

/**
 * Upserts brand volume results into Supabase.
 * Uses deterministic numeric `id` (see `numericRowIdShare` in `record-key.ts`).
 *
 * @param results   - Array of brand/country/volume results from DataForSEO
 * @param period    - The month this data represents (e.g. new Date(2026, 2, 1))
 * @param dryRun    - If true, logs rows but does not write to DB
 */
export async function storeResults(
  results: BrandVolumeResult[],
  period: Date,
  dryRun = false
): Promise<void> {
  // Format period as YYYY-MM-01 (first of the month)
  const periodStr = formatPeriod(period);

  const rows: BrandShareRow[] = results.map((r) => ({
    id: numericRowIdShare(r.country, period, r.brand),
    brand: r.brand,
    country: r.country,
    traffic: r.totalVolume,
    period: periodStr,
    created_at: new Date().toISOString(),
  }));

  if (dryRun) {
    console.log("\n📋 DRY RUN — rows that would be written to Supabase:");
    console.table(rows);
    return;
  }

  console.log(`\n💾 Writing ${rows.length} rows to Supabase (period: ${periodStr})...`);

  const supabase = createSupabaseClient();

  // Upsert in batches of 50 to stay within Supabase limits
  const batchSize = 50;
  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize);

    const { error } = await supabase
      .from(TABLE_SEARCH)
      .upsert(batch);

    if (error) {
      throw new Error(
        `Supabase upsert failed for batch starting at index ${i}:\n${error.message}\n\n` +
        "Check that:\n" +
        "  1. Your Supabase key has INSERT permissions\n" +
        "  2. The table 'brand-share-of-search' exists with BIGINT PRIMARY KEY `id` (numeric composite id).\n" +
        "  3. Auxiliary unique index on (brand, country, period) matches supabase-setup.sql\n"
      );
    }
  }

  console.log(`✅ Successfully stored ${rows.length} rows`);
}

// ─── Store LLM mention results ────────────────────────────────────────────────

interface LlmMentionRow {
  id: number;
  brand: string;
  country: string;
  mentions: number;
  ai_search_volume: number;
  impressions: number;
  platform: string;
  period: string;
  created_at: string;
}

/**
 * Upserts LLM mention results into Supabase.
 * Uses deterministic numeric `id` with platform suffix (`numericRowIdLlm`).
 */
export async function storeLlmMentions(
  results: LlmMentionResult[],
  period: Date,
  dryRun = false
): Promise<void> {
  const periodStr = formatPeriod(period);

  const rows: LlmMentionRow[] = results.map((r) => ({
    id: numericRowIdLlm(r.country, period, r.brand, r.platform),
    brand: r.brand,
    country: r.country,
    mentions: r.mentions,
    ai_search_volume: r.aiSearchVolume,
    impressions: r.impressions,
    platform: r.platform,
    period: periodStr,
    created_at: new Date().toISOString(),
  }));

  if (dryRun) {
    console.log("\n📋 DRY RUN — LLM mention rows that would be written:");
    console.table(rows.slice(0, 10));
    if (rows.length > 10) console.log(`  ... and ${rows.length - 10} more rows`);
    return;
  }

  console.log(`\n💾 Writing ${rows.length} LLM mention rows to Supabase (period: ${periodStr})...`);

  const supabase = createSupabaseClient();
  const batchSize = 50;

  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize);

    const { error } = await supabase
      .from(TABLE_LLM)
      .upsert(batch);

    if (error) {
      throw new Error(
        `Supabase upsert failed for LLM mentions batch at index ${i}:\n${error.message}\n\n` +
        "Check that the table 'brand-llm-mentions' exists (run supabase-setup.sql).\n"
      );
    }
  }

  console.log(`✅ Successfully stored ${rows.length} LLM mention rows`);
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatPeriod(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}-01`;
}

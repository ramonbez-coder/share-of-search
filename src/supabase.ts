import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { BrandVolumeResult } from "./dataforseo";

// ─── Table name ───────────────────────────────────────────────────────────────
// Must match exactly what you created in Supabase (hyphens are valid but need quoting in SQL)
const TABLE = "brand-share-of-search";

// ─── Row type ─────────────────────────────────────────────────────────────────
interface BrandShareRow {
  brand: string;
  country: string;
  traffic: number;
  period: string; // ISO date string: "YYYY-MM-01"
  created_at: string;
}

// ─── Client factory ───────────────────────────────────────────────────────────
function createSupabaseClient(): SupabaseClient {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
    throw new Error(
      "Missing SUPABASE_URL or SUPABASE_ANON_KEY in environment variables.\n" +
      "Copy .env.example to .env and fill in your Supabase credentials."
    );
  }

  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
}

// ─── Store results ────────────────────────────────────────────────────────────

/**
 * Upserts brand volume results into Supabase.
 * Uses brand + country + period as the unique key to prevent duplicates.
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
      .from(TABLE)
      .upsert(batch, { onConflict: "brand,country,period" });

    if (error) {
      throw new Error(
        `Supabase upsert failed for batch starting at index ${i}:\n${error.message}\n\n` +
        "Check that:\n" +
        "  1. Your SUPABASE_ANON_KEY has INSERT permissions\n" +
        "  2. The table 'brand-share-of-search' exists with the correct schema\n" +
        "  3. The unique index on (brand, country, period) exists\n"
      );
    }
  }

  console.log(`✅ Successfully stored ${rows.length} rows`);
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatPeriod(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}-01`;
}

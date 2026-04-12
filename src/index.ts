import * as dotenv from "dotenv";
dotenv.config();

import { getBrandVolumes } from "./dataforseo";
import { storeResults } from "./supabase";

// ─── Parse CLI args ───────────────────────────────────────────────────────────
// Usage:
//   npm run start                      → previous month (normal cron behaviour)
//   npm run start -- --month 2026-03   → specific month (for backfilling)
//   DRY_RUN=true npm run start         → dry run (no DB writes, no API calls)

function parseTargetMonth(): Date {
  const monthEq = process.argv.find((a) => a.startsWith("--month="));
  const monthIdx = process.argv.indexOf("--month");
  const monthArg =
    monthEq?.replace(/^--month=/, "") ??
    (monthIdx >= 0 ? process.argv[monthIdx + 1] : undefined);

  if (monthArg && !monthArg.startsWith("--")) {
    const [year, month] = monthArg.split("-").map(Number);
    if (!year || !month || month < 1 || month > 12) {
      throw new Error(`Invalid --month argument: "${monthArg}". Use format: YYYY-MM (e.g. 2026-03)`);
    }
    return new Date(year, month - 1, 1);
  }

  // Default: previous calendar month
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth() - 1, 1);
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const dryRun = process.env.DRY_RUN === "true";
  const targetMonth = parseTargetMonth();

  const monthLabel = targetMonth.toLocaleString("en-GB", {
    month: "long",
    year: "numeric",
  });

  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("  🔍 Brand Share of Search Tracker");
  console.log(`  Period : ${monthLabel}`);
  console.log(`  Mode   : ${dryRun ? "DRY RUN (no writes)" : "LIVE"}`);
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  // 1. Fetch keyword volumes from DataForSEO
  const results = await getBrandVolumes(targetMonth, dryRun);

  if (results.length === 0) {
    console.warn("\n⚠️  No results returned from DataForSEO. Exiting without writing.");
    process.exit(1);
  }

  // 2. Log a quick summary table
  console.log("\n📊 Volume summary:");
  const summary: Record<string, number> = {};
  for (const r of results) {
    summary[r.brand] = (summary[r.brand] ?? 0) + r.totalVolume;
  }
  for (const [brand, total] of Object.entries(summary).sort((a, b) => b[1] - a[1])) {
    const bar = "█".repeat(Math.min(Math.floor(total / 1000), 40));
    console.log(`  ${brand.padEnd(14)} ${String(total).padStart(8)}  ${bar}`);
  }

  // 3. Write to Supabase
  await storeResults(results, targetMonth, dryRun);

  console.log("\n✅ Done!\n");
}

main().catch((err) => {
  console.error("\n❌ Fatal error:", err instanceof Error ? err.message : err);
  process.exit(1);
});

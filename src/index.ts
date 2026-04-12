import * as dotenv from "dotenv";
dotenv.config();

import { getBrandVolumes } from "./dataforseo";
import { getBrandLlmMentions } from "./llm-mentions";
import { storeResults, storeLlmMentions } from "./supabase";

// ─── Parse CLI args ───────────────────────────────────────────────────────────
// Usage:
//   npm run start                         → run both modules, previous month
//   npm run start -- --month 2026-03      → specific month
//   npm run start -- --mode search        → share-of-search only
//   npm run start -- --mode llm           → LLM mentions only
//   DRY_RUN=true npm run start            → no API calls, no DB writes

function parseArgs(): { targetMonth: Date; mode: "both" | "search" | "llm" } {
  const args = process.argv.slice(2);

  // --month YYYY-MM
  const monthIdx = args.indexOf("--month");
  const monthArg = monthIdx !== -1 ? args[monthIdx + 1] : undefined;
  let targetMonth: Date;

  if (monthArg && !monthArg.startsWith("--")) {
    const [year, month] = monthArg.split("-").map(Number);
    if (!year || !month || month < 1 || month > 12) {
      throw new Error(`Invalid --month: "${monthArg}". Use format YYYY-MM (e.g. 2026-03)`);
    }
    targetMonth = new Date(year, month - 1, 1);
  } else {
    const now = new Date();
    targetMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  }

  // --mode search | llm | both
  const modeIdx = args.indexOf("--mode");
  const modeArg = modeIdx !== -1 ? args[modeIdx + 1] : "both";
  const mode = (["search", "llm", "both"].includes(modeArg) ? modeArg : "both") as
    "both" | "search" | "llm";

  return { targetMonth, mode };
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const dryRun = process.env.DRY_RUN === "true";
  const { targetMonth, mode } = parseArgs();

  const monthLabel = targetMonth.toLocaleString("en-GB", {
    month: "long",
    year: "numeric",
  });

  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("  🔍 Brand Intelligence Tracker");
  console.log(`  Period  : ${monthLabel}`);
  console.log(`  Mode    : ${mode === "both" ? "Share of Search + LLM Mentions" : mode}`);
  console.log(`  Dry run : ${dryRun ? "YES (no writes)" : "NO (live)"}`);
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  // ── Module 1: Share of Search (Google Ads keyword volumes) ──────────────────
  if (mode === "both" || mode === "search") {
    console.log("\n═══ Module 1: Share of Search ═══");

    const searchResults = await getBrandVolumes(targetMonth, dryRun);

    if (searchResults.length === 0) {
      console.warn("⚠️  No search volume results returned.");
    } else {
      console.log("\n📊 Search volume summary by brand:");
      const summary: Record<string, number> = {};
      for (const r of searchResults) summary[r.brand] = (summary[r.brand] ?? 0) + r.totalVolume;
      for (const [brand, total] of Object.entries(summary).sort((a, b) => b[1] - a[1])) {
        const bar = "█".repeat(Math.min(Math.floor(total / 2000), 30));
        console.log(`  ${brand.padEnd(14)} ${String(total).padStart(8)}  ${bar}`);
      }

      await storeResults(searchResults, targetMonth, dryRun);
    }
  }

  // ── Module 2: LLM Brand Mentions (Google AI Overviews) ─────────────────────
  if (mode === "both" || mode === "llm") {
    console.log("\n═══ Module 2: LLM Brand Mentions ═══");

    const llmResults = await getBrandLlmMentions(dryRun);

    if (llmResults.length === 0) {
      console.warn("⚠️  No LLM mention results returned.");
      console.warn("   This is common for niche B2B brands in non-English markets.");
      console.warn("   Data coverage improves as DataForSEO indexes more AI responses.");
    } else {
      console.log("\n📊 LLM mentions summary by brand (all markets combined):");
      const summary: Record<string, number> = {};
      for (const r of llmResults) summary[r.brand] = (summary[r.brand] ?? 0) + r.mentions;
      for (const [brand, total] of Object.entries(summary).sort((a, b) => b[1] - a[1])) {
        const bar = "█".repeat(Math.min(Math.floor(total / 10), 30));
        console.log(`  ${brand.padEnd(14)} ${String(total).padStart(6)} mentions  ${bar}`);
      }

      await storeLlmMentions(llmResults, targetMonth, dryRun);
    }
  }

  console.log("\n✅ All done!\n");
}

main().catch((err) => {
  console.error("\n❌ Fatal error:", err instanceof Error ? err.message : err);
  process.exit(1);
});

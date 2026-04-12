import axios, { AxiosInstance } from "axios";
import {
  BRANDS,
  MARKETS,
  type Brand,
  LLM_EXTRA_KEYWORDS_ALL_BRANDS,
  LLM_EXTRA_KEYWORDS_BY_BRAND,
} from "./config";

// ─── Important limitation ─────────────────────────────────────────────────────
// The LLM Mentions Cross Aggregated Metrics endpoint currently only supports:
//   - platform: "chat_gpt"  → US English only (location_code: 2840, language: en)
//   - platform: "google"    → multiple locations/languages
//
// For your European markets you should use platform: "google" (Google AI Overviews).
// ChatGPT data is US-only. We run one request per market using Google platform.
// ─────────────────────────────────────────────────────────────────────────────

// ─── Types ───────────────────────────────────────────────────────────────────

export interface LlmMentionResult {
  brand: string;
  country: string;
  mentions: number;
  aiSearchVolume: number;
  impressions: number;
  platform: "google" | "chat_gpt";
}

interface GroupElement {
  type: "group_element";
  key: string;
  mentions: number;
  ai_search_volume: number;
  impressions: number;
}

interface CrossAggregatedItem {
  key: string; // aggregation_key = brand name
  location: GroupElement[];
  language: GroupElement[];
  platform: GroupElement[];
}

interface DataForSEOTask {
  status_code: number;
  status_message: string;
  result: Array<{
    items: CrossAggregatedItem[];
  }> | null;
}

interface DataForSEOResponse {
  tasks: DataForSEOTask[];
}

// ─── Client ──────────────────────────────────────────────────────────────────

function createClient(): AxiosInstance {
  if (!process.env.DATAFORSEO_LOGIN || !process.env.DATAFORSEO_PASSWORD) {
    throw new Error(
      "Missing DATAFORSEO_LOGIN or DATAFORSEO_PASSWORD in environment variables."
    );
  }
  return axios.create({
    baseURL: "https://api.dataforseo.com/v3",
    auth: {
      username: process.env.DATAFORSEO_LOGIN,
      password: process.env.DATAFORSEO_PASSWORD,
    },
    timeout: 150_000, // endpoint can take up to 120s per docs
  });
}

// ─── Main fetch function ──────────────────────────────────────────────────────

/**
 * Fetches LLM brand mention metrics for all brands × all markets.
 *
 * Uses the Cross Aggregated Metrics endpoint which compares all brands
 * in a single request per market — up to 10 targets per call.
 *
 * For European markets: uses platform "google" (Google AI Overviews).
 * Note: ChatGPT data is US/English only per DataForSEO docs.
 *
 * @param dryRun - If true, returns mock data without API calls
 */
export async function getBrandLlmMentions(
  dryRun = false
): Promise<LlmMentionResult[]> {
  if (dryRun) {
    console.log("⚠️  DRY RUN — returning mock LLM mention data");
    return generateMockData();
  }

  const client = createClient();
  const results: LlmMentionResult[] = [];

  // Build targets — one entry per brand (max 10 target sets; each `target` ≤10 entities)
  const targets = BRANDS.map((brand) => ({
    aggregation_key: brand,
    target: buildLlmTargetEntities(brand),
  }));

  console.log(`\n📡 Fetching LLM mention data from DataForSEO...`);

  for (const [country, { locationCode, languageCode }] of Object.entries(MARKETS)) {
    process.stdout.write(`  → ${country.padEnd(12)}`);

    try {
      const payload = [
        {
          targets,
          location_code: locationCode,
          language_code: languageCode,
          platform: "google", // Google AI Overviews — available for all markets
          internal_list_limit: 5,
        },
      ];

      const response = await client.post<DataForSEOResponse>(
        "/ai_optimization/llm_mentions/cross_aggregated_metrics/live",
        payload
      );

      const task = response.data.tasks?.[0];

      if (!task || task.status_code !== 20000) {
        console.warn(`FAILED (${task?.status_message ?? "no response"})`);
        continue;
      }

      const items = task.result?.[0]?.items ?? [];

      if (items.length === 0) {
        console.log("⚠  no data returned (market may not be indexed yet)");
        continue;
      }

      let countryTotal = 0;

      for (const item of items) {
        const brand = item.key;

        // Extract metrics from the location grouping (most reliable)
        const locationData = item.location?.[0];
        const mentions = locationData?.mentions ?? 0;
        const aiSearchVolume = locationData?.ai_search_volume ?? 0;
        const impressions = locationData?.impressions ?? 0;

        results.push({
          brand,
          country,
          mentions,
          aiSearchVolume,
          impressions,
          platform: "google",
        });

        countryTotal += mentions;
      }

      console.log(`✓ (total mentions: ${countryTotal.toLocaleString()})`);

    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`ERROR — ${message}`);
    }

    // Rate limiting — endpoint can take up to 120s, be conservative
    await sleep(1000);
  }

  return results;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function keywordInclude(keyword: string) {
  return {
    keyword,
    search_filter: "include" as const,
    match_type: "word_match" as const,
  };
}

/** Brand token plus optional context keywords from config (narrowing / disambiguation). */
function buildLlmTargetEntities(brand: Brand) {
  const extra = [
    ...LLM_EXTRA_KEYWORDS_ALL_BRANDS,
    ...(LLM_EXTRA_KEYWORDS_BY_BRAND[brand] ?? []),
  ];
  return [keywordInclude(brand), ...extra.map(keywordInclude)];
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function generateMockData(): LlmMentionResult[] {
  const mock: LlmMentionResult[] = [];
  for (const country of Object.keys(MARKETS)) {
    for (const brand of BRANDS) {
      mock.push({
        brand,
        country,
        mentions: Math.floor(Math.random() * 500),
        aiSearchVolume: Math.floor(Math.random() * 50000),
        impressions: Math.floor(Math.random() * 5000000),
        platform: "google",
      });
    }
  }
  return mock;
}

import axios, { AxiosInstance } from "axios";
import { BRANDS, MARKETS } from "./config";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface BrandVolumeResult {
  brand: string;
  country: string;
  totalVolume: number;
}

interface DataForSEOTask {
  status_code: number;
  status_message: string;
  result: Array<{
    keyword: string;
    search_volume: number | null;
    monthly_searches?: Array<{ year: number; month: number; search_volume: number }>;
  }> | null;
}

interface DataForSEOResponse {
  tasks: DataForSEOTask[];
}

// ─── Client ──────────────────────────────────────────────────────────────────

function createClient(): AxiosInstance {
  if (!process.env.DATAFORSEO_LOGIN || !process.env.DATAFORSEO_PASSWORD) {
    throw new Error(
      "Missing DATAFORSEO_LOGIN or DATAFORSEO_PASSWORD in environment variables.\n" +
      "Copy .env.example to .env and fill in your credentials."
    );
  }

  return axios.create({
    baseURL: "https://api.dataforseo.com/v3",
    auth: {
      username: process.env.DATAFORSEO_LOGIN,
      password: process.env.DATAFORSEO_PASSWORD,
    },
    timeout: 30_000,
  });
}

// ─── Main fetch function ──────────────────────────────────────────────────────

/**
 * Fetches monthly search volume for all brands × all markets.
 * Uses the Google Ads Search Volume endpoint which returns historical monthly data.
 *
 * @param targetMonth - The month to get data for (e.g. new Date(2026, 2, 1) = March 2026)
 * @param dryRun      - If true, skips API call and returns fake data
 */
export async function getBrandVolumes(
  targetMonth: Date,
  dryRun = false
): Promise<BrandVolumeResult[]> {
  if (dryRun) {
    console.log("⚠️  DRY RUN — returning mock data, no API calls made");
    return generateMockData();
  }

  const client = createClient();
  const results: BrandVolumeResult[] = [];

  const targetYear = targetMonth.getFullYear();
  const targetMonthNum = targetMonth.getMonth() + 1; // 1-indexed

  console.log(`\n📡 Fetching data from DataForSEO for ${targetYear}-${String(targetMonthNum).padStart(2, "0")}...`);

  for (const [country, { locationCode, languageCode }] of Object.entries(MARKETS)) {
    process.stdout.write(`  → ${country.padEnd(12)}`);

    try {
      // One API request per country, with all brands as keywords
      const payload = [
        {
          keywords: [...BRANDS],
          location_code: locationCode,
          language_code: languageCode,
        },
      ];

      const response = await client.post<DataForSEOResponse>(
        "/keywords_data/google_ads/search_volume/live",
        payload
      );

      const task = response.data.tasks?.[0];

      if (!task || task.status_code !== 20000) {
        console.warn(`FAILED (${task?.status_message ?? "no task"})`);
        continue;
      }

      let countryTotal = 0;

      for (const result of task.result ?? []) {
        const brand = result.keyword;

        // Prefer monthly_searches for the specific target month if available,
        // otherwise fall back to the aggregate search_volume
        let volume = 0;

        if (result.monthly_searches && result.monthly_searches.length > 0) {
          const monthEntry = result.monthly_searches.find(
            (m) => m.year === targetYear && m.month === targetMonthNum
          );
          volume = monthEntry?.search_volume ?? result.search_volume ?? 0;
        } else {
          volume = result.search_volume ?? 0;
        }

        results.push({ brand, country, totalVolume: volume });
        countryTotal += volume;
      }

      console.log(`✓ (total volume: ${countryTotal.toLocaleString()})`);

    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`ERROR — ${message}`);
    }

    // Be polite to the API — 500ms between country requests
    await sleep(500);
  }

  return results;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function generateMockData(): BrandVolumeResult[] {
  const mock: BrandVolumeResult[] = [];
  for (const country of Object.keys(MARKETS)) {
    for (const brand of BRANDS) {
      mock.push({
        brand,
        country,
        totalVolume: Math.floor(Math.random() * 10000),
      });
    }
  }
  return mock;
}

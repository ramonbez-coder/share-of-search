import { BRANDS, MARKETS, type Brand } from "./config";

/**
 * Canonical country order follows `MARKETS` keys top-to-bottom in `src/config.ts`
 * → country code 01 = first country in that record, etc.
 */

const MARKET_ORDER = Object.freeze(Object.keys(MARKETS));

const PLATFORM_ORDER = ["google", "chat_gpt"] as const;

function countryIndexCode(country: string): string {
  const i = MARKET_ORDER.indexOf(country);
  if (i === -1) {
    throw new Error(
      `Unknown country "${country}". Add it to MARKETS in config.ts (known: ${MARKET_ORDER.join(", ")}).`
    );
  }
  return String(i + 1).padStart(2, "0");
}

function brandIndexCode(brand: string): string {
  const i = BRANDS.indexOf(brand as Brand);
  if (i === -1) {
    throw new Error(`Unknown brand "${brand}". Add it to BRANDS in config.ts.`);
  }
  return String(i + 1).padStart(2, "0");
}

function platformIndexCode(platform: string): string {
  const i = (PLATFORM_ORDER as readonly string[]).indexOf(platform);
  if (i === -1) {
    throw new Error(
      `Unknown platform "${platform}". Extend PLATFORM_ORDER in record-key.ts (supported: ${PLATFORM_ORDER.join(", ")}).`
    );
  }
  return String(i + 1).padStart(2, "0");
}

/**
 * Share-of-search row id (`id` BIGINT in Supabase), digit layout:
 *
 * `{CC}{MM}{YYYY}{BB}` — e.g. Austria = 02nd country, April 2026, 1st brand → `0204202601`.
 * (Germany is `01`; order matches MARKETS.)
 */
export function numericRowIdShare(country: string, period: Date, brand: string): number {
  const cc = countryIndexCode(country);
  const mm = String(period.getMonth() + 1).padStart(2, "0");
  const yyyy = String(period.getFullYear());
  const bb = brandIndexCode(brand);
  return Number(`${cc}${mm}${yyyy}${bb}`);
}

/**
 * LLM row id: `{CC}{MM}{YYYY}{BB}{PP}` (platform suffix; google=01, chat_gpt=02).
 */
export function numericRowIdLlm(
  country: string,
  period: Date,
  brand: string,
  platform: string
): number {
  const cc = countryIndexCode(country);
  const mm = String(period.getMonth() + 1).padStart(2, "0");
  const yyyy = String(period.getFullYear());
  const bb = brandIndexCode(brand);
  const pp = platformIndexCode(platform);
  return Number(`${cc}${mm}${yyyy}${bb}${pp}`);
}

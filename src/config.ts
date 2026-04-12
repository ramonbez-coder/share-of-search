// ─── Brands to track ────────────────────────────────────────────────────────
// Add or remove brands here. The first entry is "your" brand (for reporting).
export const BRANDS = [
  "eversports",
  "bsport",
  "mindbody",
  "timp",
  "momence",
  "deciplus",
] as const;

export type Brand = (typeof BRANDS)[number];

/**
 * Optional extra keywords merged into each brand’s LLM Mentions `target` array
 * (DataForSEO combines them with the brand keyword — typically co-occurrence /
 * same snapshot — so counts drop false positives for short or ambiguous names).
 *
 * Applied to every brand after the brand name; keep this short (1–2 terms).
 * Wording is global across all markets — tune for your languages or leave empty.
 *
 * Example vertical signal: `["studio", "software"]` (strict) or just `["studio"]`.
 */
export const LLM_EXTRA_KEYWORDS_ALL_BRANDS: readonly string[] = [];

/**
 * Per-brand extra keywords (same AND semantics as above). Use for noisy tokens
 * like "timp" without affecting distinctive competitor names.
 */
export const LLM_EXTRA_KEYWORDS_BY_BRAND: Partial<Record<Brand, readonly string[]>> = {
  // Requires “timp” to appear together with studio-context copy (cuts unrelated “timp” hits).
  timp: ["studio"],
};

// ─── Markets ─────────────────────────────────────────────────────────────────
// DataForSEO location codes for Google Ads keyword volume.
// Full list: https://api.dataforseo.com/v3/keywords_data/google_ads/locations
export const MARKETS: Record<string, { locationCode: number; languageCode: string }> = {
  Germany:     { locationCode: 2276, languageCode: "de" },
  Austria:     { locationCode: 2040, languageCode: "de" },
  Switzerland: { locationCode: 2756, languageCode: "de" },
  France:      { locationCode: 2250, languageCode: "fr" },
  Spain:       { locationCode: 2724, languageCode: "es" },
  Italy:       { locationCode: 2380, languageCode: "it" },
  Netherlands: { locationCode: 2528, languageCode: "nl" },
  Belgium:     { locationCode: 2056, languageCode: "nl" },
};

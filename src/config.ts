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

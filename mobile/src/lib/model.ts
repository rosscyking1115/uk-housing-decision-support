// The mobile app's view model + scoring. Mirrors the design handoff's logic and
// api/scoring.py: match = weighted GEOMETRIC mean over the indicators an area
// actually holds (weight > 0). Missing indicators are excluded, never zeroed.

export type IndicatorKey = "aff" | "crime" | "energy" | "flood" | "transit";

export interface Indicator {
  key: IndicatorKey;
  /** short label shown in the app */
  label: string;
  /** what a high score means, in plain words (never a verdict) */
  meaning: string;
  /** matching API component key, for wiring to the live service later */
  apiKey:
    | "affordability_score"
    | "safety_score"
    | "energy_score"
    | "flood_score"
    | "convenience_score";
}

export const INDICATORS: Indicator[] = [
  { key: "aff", label: "Affordability", meaning: "Lower housing cost vs local income", apiKey: "affordability_score" },
  { key: "crime", label: "Lower crime", meaning: "Lower recorded-crime rate", apiKey: "safety_score" },
  { key: "energy", label: "Energy", meaning: "More efficient homes (EPC)", apiKey: "energy_score" },
  { key: "flood", label: "Flood", meaning: "Lower flood risk", apiKey: "flood_score" },
  { key: "transit", label: "Getting around", meaning: "More amenities & transport in reach", apiKey: "convenience_score" },
];

export type Weights = Record<IndicatorKey, number>; // each 0–100
export type Scores = Record<IndicatorKey, number | null>; // 0–100 or held (null)
export type RawFacts = Record<IndicatorKey, string>; // the figure behind each score

export interface Area {
  id: string;
  name: string;
  region: string;
  epc: string;
  scores: Scores;
  raw: RawFacts;
}

export const DEFAULT_WEIGHTS: Weights = {
  aff: 42,
  crime: 82,
  energy: 40,
  flood: 38,
  transit: 74,
};

/** Weighted geometric mean over held indicators with weight > 0. */
export function matchScore(scores: Scores, weights: Weights): number {
  let ws = 0;
  let sum = 0;
  for (const { key } of INDICATORS) {
    const v = scores[key];
    if (v == null) continue;
    const w = weights[key];
    if (w <= 0) continue;
    ws += w;
    sum += w * Math.log(v);
  }
  if (ws > 0) return Math.round(Math.exp(sum / ws));
  // All weights zero → unweighted geometric mean of the held indicators.
  let n = 0;
  let ls = 0;
  for (const { key } of INDICATORS) {
    const v = scores[key];
    if (v == null) continue;
    n++;
    ls += Math.log(v);
  }
  return n ? Math.round(Math.exp(ls / n)) : 0;
}

export function heldCount(scores: Scores): number {
  return INDICATORS.reduce((n, { key }) => n + (scores[key] == null ? 0 : 1), 0);
}

/** Rank areas by match desc, tie-break by name asc (matches the design). */
export function rankAreas(
  areas: Area[],
  weights: Weights,
): { area: Area; match: number }[] {
  return areas
    .map((area) => ({ area, match: matchScore(area.scores, weights) }))
    .sort((a, b) => b.match - a.match || a.area.name.localeCompare(b.area.name));
}

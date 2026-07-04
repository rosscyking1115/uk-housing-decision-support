// MoveIn design tokens — the "surveyor's ledger" identity, taken verbatim from
// the design handoff. Score bars are NEUTRAL length-only (#4a5c64), never a
// red→green ramp; the ONLY good/bad palette is the official EPC A–G scale.

export const color = {
  ink: "#172026",
  textSecondary: "#3f4c53",
  muted: "#6b7a82",
  faint: "#8a969b",

  accent: "#13476b",
  accentDark: "#0e3350",

  scoreBar: "#4a5c64",
  scoreTrack: "#eef1ea",
  scoreTrackAndroid: "#dfe4dc",

  screenBg: "#eff1ec",
  settingsBg: "#e7eae4",
  tonalCard: "#f6f7f2",
  tonalBand: "#e6e9e2",

  white: "#ffffff",
  cardBorder: "#e0e4dc",
  hairline: "#eef1ea",

  chip: "#cddcea",
  infoCallout: "#dbe6ef",
  bezel: "#0b1013",
} as const;

// The one allowed good/bad palette — official EPC energy ratings only.
export const epcColor: Record<string, string> = {
  A: "#008054",
  B: "#008054",
  C: "#8dce46",
  D: "#ffd500",
  E: "#f8a01c",
  F: "#e9153b",
  G: "#e9153b",
};

// Family names match the @expo-google-fonts/* exports loaded in app/_layout.tsx.
export const font = {
  sans: "IBMPlexSans_400Regular",
  sansMedium: "IBMPlexSans_500Medium",
  sansSemiBold: "IBMPlexSans_600SemiBold",
  sansBold: "IBMPlexSans_700Bold",
  serif: "IBMPlexSerif_400Regular",
  serifMedium: "IBMPlexSerif_500Medium",
  serifSemiBold: "IBMPlexSerif_600SemiBold",
  mono: "IBMPlexMono_400Regular",
  monoMedium: "IBMPlexMono_500Medium",
  monoSemiBold: "IBMPlexMono_600SemiBold",
} as const;

export const radius = {
  card: 16,
  cardSm: 14,
  searchBar: 28,
  chip: 10,
  pill: 100,
  bar: 3,
  screen: 41,
} as const;

export const space = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

// M3 elevation for Android tonal cards (per the handoff).
export const androidCardShadow =
  "0 1px 2px rgba(23,32,38,.16), 0 1px 3px 1px rgba(23,32,38,.07)";

import { View } from "react-native";
import { INDICATORS, type Scores } from "@/lib/model";
import { color, radius } from "@/theme/tokens";

// Five vertical mini bars — one per indicator, fill height = score length only.
// NEUTRAL colour (#4a5c64), never a red→green ramp (hard design rule). A held
// (missing) indicator renders as an empty track, never a zero-height "bad" bar.
export function MiniScoreBars({
  scores,
  barWidth = 9,
  barHeight = 24,
  gap = 4,
}: {
  scores: Scores;
  barWidth?: number;
  barHeight?: number;
  gap?: number;
}) {
  return (
    <View style={{ flexDirection: "row", gap, alignItems: "flex-end" }}>
      {INDICATORS.map(({ key }) => {
        const v = scores[key];
        const fill = v == null ? 0 : Math.max(0, Math.min(100, v));
        return (
          <View
            key={key}
            style={{
              width: barWidth,
              height: barHeight,
              borderRadius: radius.bar,
              backgroundColor: color.scoreTrack,
              justifyContent: "flex-end",
              overflow: "hidden",
            }}>
            <View
              style={{
                height: `${fill}%`,
                backgroundColor: color.scoreBar,
                borderRadius: radius.bar,
              }}
            />
          </View>
        );
      })}
    </View>
  );
}

// A single thin horizontal bar (used in Area Detail / Check rows).
export function HScoreBar({ value, width = 120 }: { value: number | null; width?: number }) {
  const fill = value == null ? 0 : Math.max(0, Math.min(100, value));
  return (
    <View
      style={{
        width,
        height: 3,
        borderRadius: radius.bar,
        backgroundColor: color.scoreTrack,
        overflow: "hidden",
      }}>
      <View style={{ width: `${fill}%`, height: 3, backgroundColor: color.scoreBar }} />
    </View>
  );
}

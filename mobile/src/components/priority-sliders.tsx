import Slider from "@react-native-community/slider";
import { Platform, Text, View } from "react-native";
import { INDICATORS } from "@/lib/model";
import { useWeights } from "@/state/weights";
import { color, font, radius, space } from "@/theme/tokens";

// The "YOUR PRIORITIES" card: five compact sliders bound to the global weights.
// Dragging any one re-ranks Search live (the list reads the same weights).
export function PrioritySliders({ compact = true }: { compact?: boolean }) {
  const { weights, setWeight } = useWeights();
  const isAndroid = Platform.OS === "android";

  return (
    <View
      style={{
        backgroundColor: isAndroid ? color.tonalCard : color.white,
        borderRadius: radius.card,
        borderWidth: isAndroid ? 0 : 1,
        borderColor: color.cardBorder,
        padding: space.lg,
        gap: compact ? space.sm : space.md,
      }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <Text style={{ fontFamily: font.monoSemiBold, fontSize: 11, letterSpacing: 0.7, color: color.muted }}>
          YOUR PRIORITIES
        </Text>
        <Text style={{ fontFamily: font.mono, fontSize: 11, color: color.accent }}>re-ranks live</Text>
      </View>

      {INDICATORS.map((ind) => (
        <View key={ind.key} style={{ gap: 2 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
            <Text style={{ fontFamily: font.sansMedium, fontSize: 13, color: color.ink }}>{ind.label}</Text>
            <Text style={{ fontFamily: font.mono, fontSize: 12, color: color.muted }}>{weights[ind.key]}</Text>
          </View>
          <Slider
            minimumValue={0}
            maximumValue={100}
            step={1}
            value={weights[ind.key]}
            onValueChange={(v) => setWeight(ind.key, Math.round(v))}
            minimumTrackTintColor={color.accent}
            maximumTrackTintColor={color.scoreTrack}
            thumbTintColor={isAndroid ? color.accent : color.white}
            style={{ height: 28 }}
          />
        </View>
      ))}
    </View>
  );
}

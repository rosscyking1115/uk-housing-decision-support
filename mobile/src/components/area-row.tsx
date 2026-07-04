import { Link } from "expo-router";
import { Platform, Pressable, Text, View } from "react-native";
import { MiniScoreBars } from "@/components/score-bars";
import { heldCount, type Area } from "@/lib/model";
import { color, font, radius, space } from "@/theme/tokens";

// One ranked-list row (design 1a "compact"): rank · name · match score · the five
// neutral mini bars, plus an "n/5 held" chip when an indicator is missing.
export function AreaRow({
  area,
  match,
  rank,
}: {
  area: Area;
  match: number;
  rank: number;
}) {
  const held = heldCount(area.scores);
  const isAndroid = Platform.OS === "android";
  const rankLabel = String(rank).padStart(2, "0");

  return (
    <Link href={{ pathname: "/area/[id]", params: { id: area.id } }} asChild>
      <Pressable
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: space.md,
          backgroundColor: isAndroid ? color.tonalCard : color.white,
          borderRadius: isAndroid ? radius.card : radius.cardSm,
          borderWidth: isAndroid ? 0 : 1,
          borderColor: color.cardBorder,
          paddingVertical: space.md,
          paddingHorizontal: space.lg,
          ...(isAndroid ? { boxShadow: "0 1px 2px rgba(23,32,38,.12)" } : null),
        }}>
        {/* rank */}
        <View
          style={
            isAndroid
              ? {
                  width: 30,
                  height: 30,
                  borderRadius: 15,
                  backgroundColor: color.chip,
                  alignItems: "center",
                  justifyContent: "center",
                }
              : { width: 24, alignItems: "center" }
          }>
          <Text style={{ fontFamily: font.mono, fontSize: 12, color: isAndroid ? color.accentDark : color.faint }}>
            {rankLabel}
          </Text>
        </View>

        {/* name + region + held chip */}
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={{ fontFamily: font.sansSemiBold, fontSize: 16, color: color.ink }}>{area.name}</Text>
          <View style={{ flexDirection: "row", alignItems: "center", gap: space.sm }}>
            <Text style={{ fontFamily: font.mono, fontSize: 11, color: color.muted }}>{area.region}</Text>
            {held < 5 && (
              <Text
                style={{
                  fontFamily: font.mono,
                  fontSize: 10,
                  color: color.muted,
                  backgroundColor: color.hairline,
                  paddingHorizontal: 6,
                  paddingVertical: 1,
                  borderRadius: radius.chip,
                  overflow: "hidden",
                }}>
                {held}/5 held
              </Text>
            )}
          </View>
        </View>

        {/* mini bars */}
        <MiniScoreBars scores={area.scores} />

        {/* match score */}
        <Text style={{ fontFamily: font.monoMedium, fontSize: 21, color: color.accent, width: 34, textAlign: "right" }}>
          {match}
        </Text>
      </Pressable>
    </Link>
  );
}

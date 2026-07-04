import { useLocalSearchParams } from 'expo-router';
import { ScrollView, Text, View } from 'react-native';

import { HScoreBar } from '@/components/score-bars';
import { FIXTURE_AREAS } from '@/lib/fixtures';
import { INDICATORS, heldCount, matchScore } from '@/lib/model';
import { useWeights } from '@/state/weights';
import { color, epcColor, font, radius, space } from '@/theme/tokens';

// Area Detail — the "trade-off receipt": the overall match, then one ledger row
// per indicator with the RAW FIGURE beside every score (never a score alone).
export default function AreaDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { weights } = useWeights();
  const area = FIXTURE_AREAS.find((a) => a.id === id);

  if (!area) {
    return (
      <View style={{ flex: 1, backgroundColor: color.screenBg, padding: space.lg }}>
        <Text style={{ fontFamily: font.sans, color: color.muted }}>Area not found.</Text>
      </View>
    );
  }

  const match = matchScore(area.scores, weights);
  const held = heldCount(area.scores);

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      style={{ backgroundColor: color.screenBg }}
      contentContainerStyle={{ padding: space.lg, gap: space.lg }}>
      <View style={{ gap: 4 }}>
        <Text style={{ fontFamily: font.serifSemiBold, fontSize: 26, color: color.ink }}>{area.name}</Text>
        <Text style={{ fontFamily: font.mono, fontSize: 12, color: color.muted }}>{area.region}</Text>
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: space.sm }}>
        <Text style={{ fontFamily: font.monoMedium, fontSize: 52, color: color.accent }}>{match}</Text>
        <Text style={{ fontFamily: font.sans, fontSize: 14, color: color.muted }}>match · your priorities</Text>
      </View>

      {/* Ledger card */}
      <View
        style={{
          backgroundColor: color.white,
          borderRadius: radius.card,
          borderWidth: 1,
          borderColor: color.cardBorder,
          overflow: 'hidden',
        }}>
        {INDICATORS.map((ind, i) => {
          const v = area.scores[ind.key];
          return (
            <View
              key={ind.key}
              style={{
                paddingVertical: space.md,
                paddingHorizontal: space.lg,
                gap: 6,
                borderTopWidth: i === 0 ? 0 : 1,
                borderTopColor: color.hairline,
              }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={{ fontFamily: font.sansMedium, fontSize: 15, color: color.ink }}>{ind.label}</Text>
                {ind.key === 'energy' ? (
                  <View
                    style={{
                      backgroundColor: epcColor[area.epc] ?? color.muted,
                      paddingHorizontal: 8,
                      paddingVertical: 2,
                      borderRadius: 6,
                    }}>
                    <Text style={{ fontFamily: font.monoSemiBold, fontSize: 12, color: color.white }}>EPC {area.epc}</Text>
                  </View>
                ) : (
                  <Text style={{ fontFamily: font.monoMedium, fontSize: 15, color: v == null ? color.faint : color.ink }}>
                    {v == null ? 'held' : v}
                  </Text>
                )}
              </View>
              <HScoreBar value={v} width={200} />
              <Text style={{ fontFamily: font.mono, fontSize: 12, color: color.muted }}>{area.raw[ind.key]}</Text>
            </View>
          );
        })}
      </View>

      <Text style={{ fontFamily: font.mono, fontSize: 11, color: color.faint }}>
        {held} of 5 indicators held · sources: ONS, Police.uk, EPC Register, Environment Agency, OpenStreetMap
      </Text>
    </ScrollView>
  );
}

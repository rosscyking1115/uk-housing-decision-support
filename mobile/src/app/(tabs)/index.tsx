import { useMemo } from 'react';
import { Platform, ScrollView, Text, View } from 'react-native';
import Animated, { LinearTransition } from 'react-native-reanimated';

import { AreaRow } from '@/components/area-row';
import { PrioritySliders } from '@/components/priority-sliders';
import { FIXTURE_AREAS, SEARCH_REGION } from '@/lib/fixtures';
import { rankAreas } from '@/lib/model';
import { useWeights } from '@/state/weights';
import { color, font, radius, space } from '@/theme/tokens';

// Search — the hero screen. The list re-ranks live as priority sliders move
// (rankAreas + the shared weights), with a FLIP animation on reorder.
export default function SearchScreen() {
  const { weights } = useWeights();
  const ranked = useMemo(() => rankAreas(FIXTURE_AREAS, weights), [weights]);
  const isAndroid = Platform.OS === 'android';

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      style={{ backgroundColor: color.screenBg }}
      contentContainerStyle={{ padding: space.lg, gap: space.lg, paddingBottom: space.xxl }}>
      <Text style={{ fontFamily: font.serifSemiBold, fontSize: 30, color: color.ink }}>Search</Text>

      {/* Search field (static placeholder for this slice) */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: isAndroid ? color.tonalCard : color.white,
          borderRadius: isAndroid ? radius.searchBar : radius.cardSm,
          borderWidth: isAndroid ? 0 : 1,
          borderColor: color.cardBorder,
          paddingHorizontal: space.lg,
          paddingVertical: space.md,
        }}>
        <Text style={{ fontFamily: font.sans, fontSize: 15, color: color.muted }}>{SEARCH_REGION}</Text>
      </View>

      <PrioritySliders />

      <Text style={{ fontFamily: font.mono, fontSize: 12, color: color.muted }}>
        {ranked.length} areas · ranked for you
      </Text>

      <View style={{ gap: space.sm }}>
        {ranked.map(({ area, match }, i) => (
          <Animated.View key={area.id} layout={LinearTransition.duration(480)}>
            <AreaRow area={area} match={match} rank={i + 1} />
          </Animated.View>
        ))}
      </View>
    </ScrollView>
  );
}

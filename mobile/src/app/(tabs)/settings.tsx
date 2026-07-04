import { ScrollView, Text, View } from 'react-native';

import { PrioritySliders } from '@/components/priority-sliders';
import { color, font, radius, space } from '@/theme/tokens';

// Settings hosts the same global weight sliders (changing them re-ranks Search),
// plus data vintage / sources / coverage. The full section list is a later slice.
export default function SettingsScreen() {
  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      style={{ backgroundColor: color.settingsBg }}
      contentContainerStyle={{ padding: space.lg, gap: space.lg }}>
      <Text style={{ fontFamily: font.serifSemiBold, fontSize: 30, color: color.ink }}>Settings</Text>

      <PrioritySliders compact={false} />
      <Text style={{ fontFamily: font.sans, fontSize: 13, color: color.muted, paddingHorizontal: space.xs }}>
        Changing a weight re-ranks Search and Compare instantly.
      </Text>

      <View
        style={{
          backgroundColor: color.infoCallout,
          borderRadius: radius.card,
          padding: space.lg,
        }}>
        <Text style={{ fontFamily: font.sans, fontSize: 14, lineHeight: 22, color: color.accentDark }}>
          Coverage: England &amp; Wales. Scotland and Northern Ireland are on the roadmap.
        </Text>
      </View>
    </ScrollView>
  );
}

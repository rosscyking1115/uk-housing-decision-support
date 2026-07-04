import { ScrollView, Text, View } from 'react-native';
import { color, font, space } from '@/theme/tokens';

// Placeholder for screens not yet built in this slice (Compare / Check / Settings).
export function ScreenStub({ title, note }: { title: string; note: string }) {
  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      style={{ backgroundColor: color.screenBg }}
      contentContainerStyle={{ padding: space.lg, gap: space.md }}>
      <Text style={{ fontFamily: font.serifSemiBold, fontSize: 30, color: color.ink }}>{title}</Text>
      <View
        style={{
          backgroundColor: color.white,
          borderRadius: 16,
          borderWidth: 1,
          borderColor: color.cardBorder,
          padding: space.lg,
        }}>
        <Text style={{ fontFamily: font.sans, fontSize: 15, lineHeight: 24, color: color.textSecondary }}>{note}</Text>
      </View>
    </ScrollView>
  );
}

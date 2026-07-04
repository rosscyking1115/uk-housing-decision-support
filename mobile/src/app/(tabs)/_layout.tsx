import { NativeTabs } from 'expo-router/unstable-native-tabs';

// Four product tabs. Area Detail is pushed onto the root Stack (see app/_layout).
export default function TabsLayout() {
  return (
    <NativeTabs>
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Icon sf="magnifyingglass" md="search" />
        <NativeTabs.Trigger.Label>Search</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="compare">
        <NativeTabs.Trigger.Icon sf="rectangle.split.3x1" md="compare" />
        <NativeTabs.Trigger.Label>Compare</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="check">
        <NativeTabs.Trigger.Icon sf="tag" md="sell" />
        <NativeTabs.Trigger.Label>Check</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="settings">
        <NativeTabs.Trigger.Icon sf="slider.horizontal.3" md="tune" />
        <NativeTabs.Trigger.Label>Settings</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}

import { NativeTabs } from 'expo-router/unstable-native-tabs';
import { Stack } from 'expo-router';

const TINT = '#9A7DE4';

export default function BloomLayout() {
  return (
    <>
      <Stack.Screen
        options={{
          headerShown: false,
          gestureEnabled: true,
          fullScreenGestureEnabled: true,
          gestureResponseDistance: 80,
        }}
      />
      <NativeTabs
        blurEffect="systemUltraThinMaterialDark"
        tintColor={TINT}
        backgroundColor="#0F0A1A"
        minimizeBehavior="onScrollDown"
      >
        <NativeTabs.Trigger name="index">
          <NativeTabs.Trigger.Icon sf={{ default: 'leaf', selected: 'leaf.fill' }} />
          <NativeTabs.Trigger.Label>Bugün</NativeTabs.Trigger.Label>
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="log">
          <NativeTabs.Trigger.Icon sf={{ default: 'plus.circle', selected: 'plus.circle.fill' }} />
          <NativeTabs.Trigger.Label>Logla</NativeTabs.Trigger.Label>
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="insights">
          <NativeTabs.Trigger.Icon sf={{ default: 'chart.bar', selected: 'chart.bar.fill' }} />
          <NativeTabs.Trigger.Label>Trend</NativeTabs.Trigger.Label>
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="conditions">
          <NativeTabs.Trigger.Icon sf={{ default: 'heart', selected: 'heart.fill' }} />
          <NativeTabs.Trigger.Label>Durumlar</NativeTabs.Trigger.Label>
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="education">
          <NativeTabs.Trigger.Icon sf={{ default: 'books.vertical', selected: 'books.vertical.fill' }} />
          <NativeTabs.Trigger.Label>Eğitim</NativeTabs.Trigger.Label>
        </NativeTabs.Trigger>
      </NativeTabs>
    </>
  );
}

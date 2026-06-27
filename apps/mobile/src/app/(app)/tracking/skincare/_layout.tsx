import { NativeTabs } from 'expo-router/unstable-native-tabs';
import { Stack } from 'expo-router';

const TINT = '#9A7DE4';

export default function SkincareLayout() {
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
          <NativeTabs.Trigger.Icon sf={{ default: 'drop', selected: 'drop.fill' }} />
          <NativeTabs.Trigger.Label>Skincare</NativeTabs.Trigger.Label>
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="body">
          <NativeTabs.Trigger.Icon sf="figure.stand" />
          <NativeTabs.Trigger.Label>Body</NativeTabs.Trigger.Label>
        </NativeTabs.Trigger>
      </NativeTabs>
    </>
  );
}

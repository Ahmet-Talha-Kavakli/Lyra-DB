import { NativeTabs } from 'expo-router/unstable-native-tabs';
import { Stack } from 'expo-router';

const TINT = '#9A7DE4';

export default function LyraLayout() {
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
          <NativeTabs.Trigger.Icon sf={{ default: 'book', selected: 'book.fill' }} />
          <NativeTabs.Trigger.Label>Journal</NativeTabs.Trigger.Label>
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="session">
          <NativeTabs.Trigger.Icon sf="bubble.left.and.bubble.right.fill" />
          <NativeTabs.Trigger.Label>Sessions</NativeTabs.Trigger.Label>
        </NativeTabs.Trigger>
      </NativeTabs>
    </>
  );
}

import { Stack } from 'expo-router';
import { colors } from '@/constants/theme';

export default function AppLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.brand[950] },
        gestureEnabled: true,
        fullScreenGestureEnabled: true,
        animation: 'slide_from_right',
        gestureResponseDistance: 80,
      }}
    />
  );
}

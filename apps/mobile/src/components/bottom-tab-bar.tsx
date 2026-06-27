import { View, Pressable, Text as RNText, StyleSheet, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { colors } from '@/constants/theme';

type IconName = keyof typeof Ionicons.glyphMap;

interface TabItem<T extends string> {
  id: T;
  label: string;
  icon: IconName;
}

interface BottomTabBarProps<T extends string> {
  tabs: ReadonlyArray<TabItem<T>>;
  value: T;
  onChange: (id: T) => void;
  tint?: string;
}

const INACTIVE = '#8E8E93';

export function BottomTabBar<T extends string>({
  tabs,
  value,
  onChange,
  tint = '#9A7DE4',
}: BottomTabBarProps<T>) {
  const insets = useSafeAreaInsets();

  const handlePress = (id: T) => {
    if (id === value) return;
    Haptics.selectionAsync();
    onChange(id);
  };

  return (
    <View style={[st.wrap, { paddingBottom: Math.max(insets.bottom, 8) }]}>
      <BlurView
        intensity={Platform.OS === 'ios' ? 80 : 0}
        tint="dark"
        style={StyleSheet.absoluteFill}
      />
      <View style={st.bg} />
      <View style={st.row}>
        {tabs.map((t) => {
          const active = t.id === value;
          const color = active ? tint : INACTIVE;
          return (
            <Pressable key={t.id} onPress={() => handlePress(t.id)} style={st.tab}>
              <Ionicons name={t.icon} size={26} color={color} />
              <RNText style={[st.label, { color }]}>{t.label}</RNText>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingTop: 6,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
    overflow: 'hidden',
  },
  bg: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.brand[950] + 'CC',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingTop: 4,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    paddingVertical: 4,
  },
  label: {
    fontSize: 10,
    fontWeight: '500',
    letterSpacing: 0.1,
  },
});

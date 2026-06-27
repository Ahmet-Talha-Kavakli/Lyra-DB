import { View, Text as RNText, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/constants/theme';
import { BackToTrackingButton } from '@/components/back-to-tracking-button';

type IconName = keyof typeof Ionicons.glyphMap;

interface ComingSoonProps {
  title: string;
  icon?: IconName;
  tint?: string;
  message?: string;
}

export function ComingSoon({
  title,
  icon = 'sparkles',
  tint = colors.brand[300],
  message = 'This space is being prepared for you.',
}: ComingSoonProps) {
  return (
    <SafeAreaView style={st.root} edges={['top']}>
      <BackToTrackingButton tint={tint} />
      <View style={st.center}>
        <View style={[st.iconWrap, { borderColor: tint + '44', backgroundColor: tint + '12' }]}>
          <Ionicons name={icon} size={44} color={tint} />
        </View>
        <RNText style={st.title}>{title}</RNText>
        <RNText style={[st.badge, { color: tint, borderColor: tint + '55', backgroundColor: tint + '14' }]}>
          COMING SOON
        </RNText>
        <RNText style={st.message}>{message}</RNText>
      </View>
    </SafeAreaView>
  );
}

const st = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.brand[950] },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40, gap: 18 },
  iconWrap: {
    width: 96,
    height: 96,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    marginBottom: 6,
  },
  title: { fontSize: 28, fontWeight: '800', color: colors.text.primary, letterSpacing: -0.4 },
  badge: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 2,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    overflow: 'hidden',
  },
  message: { fontSize: 15, color: colors.text.secondary, textAlign: 'center', maxWidth: 280, lineHeight: 22 },
});

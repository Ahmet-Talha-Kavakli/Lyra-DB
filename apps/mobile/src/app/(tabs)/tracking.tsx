import { View, ScrollView, Pressable, Text as RNText, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/constants/theme';

type IconName = keyof typeof Ionicons.glyphMap;

interface Category {
  id: 'lyra' | 'bloom' | 'skincare';
  title: string;
  subtitle: string;
  icon: IconName;
  tint: string;
  bg: string;
  border: string;
}

const CATEGORIES: Category[] = [
  {
    id: 'lyra',
    title: 'Lyra',
    subtitle: 'Sessions & Journal',
    icon: 'sparkles',
    tint: '#9A7DE4',
    bg: 'rgba(154, 125, 228, 0.10)',
    border: 'rgba(154, 125, 228, 0.28)',
  },
  {
    id: 'bloom',
    title: 'Bloom',
    subtitle: 'Cycle & Wellbeing',
    icon: 'leaf',
    tint: '#E8A87C',
    bg: 'rgba(232, 168, 124, 0.10)',
    border: 'rgba(232, 168, 124, 0.28)',
  },
  {
    id: 'skincare',
    title: 'Skincare',
    subtitle: 'Routines & Body',
    icon: 'water',
    tint: '#7EC8E3',
    bg: 'rgba(126, 200, 227, 0.10)',
    border: 'rgba(126, 200, 227, 0.28)',
  },
];

export default function TrackingScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={st.root} edges={['top']}>
      <ScrollView
        style={st.scroll}
        contentContainerStyle={st.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={st.header}>
          <RNText style={st.title}>Tracking</RNText>
          <RNText style={st.subtitle}>Choose what you want to track today</RNText>
        </View>

        <View style={st.cards}>
          {CATEGORIES.map((cat) => (
            <Pressable
              key={cat.id}
              onPress={() => router.push(`/(app)/tracking/${cat.id}` as never)}
              style={({ pressed }) => [
                st.card,
                { backgroundColor: cat.bg, borderColor: cat.border },
                pressed && { opacity: 0.7, transform: [{ scale: 0.98 }] },
              ]}
            >
              <View style={[st.iconWrap, { backgroundColor: cat.bg, borderColor: cat.border }]}>
                <Ionicons name={cat.icon} size={28} color={cat.tint} />
              </View>
              <View style={st.cardText}>
                <RNText style={[st.cardTitle, { color: cat.tint }]}>{cat.title}</RNText>
                <RNText style={st.cardSubtitle}>{cat.subtitle}</RNText>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.text.muted} />
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const st = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.brand[950] },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 40 },
  header: { marginBottom: 28, marginTop: 8 },
  title: { fontSize: 34, fontWeight: '800', color: colors.text.primary, letterSpacing: -0.5 },
  subtitle: { fontSize: 15, color: colors.text.secondary, marginTop: 6 },
  cards: { gap: 14 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    padding: 18,
    borderRadius: 22,
    borderWidth: 1,
  },
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  cardText: { flex: 1 },
  cardTitle: { fontSize: 20, fontWeight: '700', letterSpacing: -0.3 },
  cardSubtitle: { fontSize: 13, color: colors.text.secondary, marginTop: 2 },
});

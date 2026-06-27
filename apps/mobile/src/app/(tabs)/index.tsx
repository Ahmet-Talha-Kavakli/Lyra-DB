import { View, ScrollView, Pressable, Text as RNText, StyleSheet, Image, Animated } from 'react-native';
import { useState, useRef } from 'react';
import { useUser } from '@clerk/expo';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Defs, RadialGradient, Stop, Ellipse } from 'react-native-svg';
import { colors } from '@/constants/theme';

const CREAM = '#F5EDD8';

const MOODS = [
  { image: require('../../../assets/moods/great.png'),   label: 'Great',   labelColor: '#22C55E' },
  { image: require('../../../assets/moods/good.png'),    label: 'Good',    labelColor: '#10B981' },
  { image: require('../../../assets/moods/okay.png'),    label: 'Okay',    labelColor: '#7C3AED' },
  { image: require('../../../assets/moods/low.png'),     label: 'Low',     labelColor: '#3B82F6' },
  { image: require('../../../assets/moods/anxious.png'), label: 'Anxious', labelColor: '#EF4444' },
] as const;

function MoodItem({
  mood,
  index,
  selected,
  onSelect,
}: {
  mood: (typeof MOODS)[number];
  index: number;
  selected: boolean;
  onSelect: () => void;
}) {
  const scale = useRef(new Animated.Value(1)).current;

  const handlePress = () => {
    onSelect();
    Animated.sequence([
      Animated.spring(scale, { toValue: 1.14, useNativeDriver: true, speed: 40, bounciness: 12 }),
      Animated.spring(scale, { toValue: 1.0, useNativeDriver: true, speed: 18, bounciness: 4 }),
    ]).start();
  };

  const gradId = `rg${index}`;

  return (
    <Pressable onPress={handlePress} style={st.moodPressable}>
      <Animated.View style={[st.moodBlob, { transform: [{ scale }] }]}>
        {/* Radial fade blob — krem ortadan kenara doğru şeffaflaşıyor */}
        <Svg style={StyleSheet.absoluteFill} viewBox="0 0 100 100" preserveAspectRatio="none">
          <Defs>
            <RadialGradient id={gradId} cx="50%" cy="55%" r="50%">
              <Stop offset="0%"   stopColor={CREAM} stopOpacity={selected ? "0.95" : "0.75"} />
              <Stop offset="60%"  stopColor={CREAM} stopOpacity={selected ? "0.55" : "0.35"} />
              <Stop offset="100%" stopColor={CREAM} stopOpacity="0" />
            </RadialGradient>
          </Defs>
          <Ellipse cx="50" cy="55" rx="50" ry="50" fill={`url(#${gradId})`} />
        </Svg>
        <Image source={mood.image} style={st.moodImage} resizeMode="contain" />
      </Animated.View>
      <RNText style={[st.moodLabel, selected && { color: mood.labelColor, fontWeight: '800' }]}>
        {mood.label.toUpperCase()}
      </RNText>
    </Pressable>
  );
}

export default function HomeScreen() {
  const { user } = useUser();
  const router = useRouter();
  const firstName = user?.firstName ?? 'there';
  const [selectedMood, setSelectedMood] = useState<number | null>(null);

  return (
    <SafeAreaView style={st.root} edges={['top']}>
      <ScrollView
        style={st.scroll}
        contentContainerStyle={st.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={st.header}>
          <RNText style={st.welcomeLabel}>Welcome back,</RNText>
          <RNText style={st.welcomeName}>{firstName}</RNText>
        </View>

        {/* Mood Check-in */}
        <View style={st.card}>
          <RNText style={st.cardTitle}>How are you feeling?</RNText>
          <View style={st.moodRow}>
            {MOODS.map((mood, i) => (
              <MoodItem
                key={i}
                mood={mood}
                index={i}
                selected={selectedMood === i}
                onSelect={() => setSelectedMood(i)}
              />
            ))}
          </View>
        </View>

        {/* Session CTA */}
        <View style={st.card}>
          <View style={st.sessionHeader}>
            <View style={st.sessionIconWrap}>
              <Ionicons name="sparkles" size={20} color={colors.brand[300]} />
            </View>
            <View style={st.sessionTextWrap}>
              <RNText style={st.sessionTitle}>Talk to Lyra</RNText>
              <RNText style={st.sessionSub}>Start a therapy session</RNText>
            </View>
          </View>
          <Pressable
            onPress={() => router.push('/(app)/tracking/lyra/session' as never)}
            style={({ pressed }) => [st.sessionBtn, pressed && { opacity: 0.82 }]}
          >
            <RNText style={st.sessionBtnTxt}>Start Session</RNText>
          </Pressable>
        </View>

        {/* Journal */}
        <View style={st.card}>
          <View style={st.row}>
            <RNText style={st.cardTitle}>Journal</RNText>
            <Pressable onPress={() => router.push('/(app)/tracking/lyra' as never)}>
              <RNText style={st.viewAll}>View All</RNText>
            </Pressable>
          </View>
          <RNText style={st.cardSub}>Capture your thoughts and track your progress over time.</RNText>
          <Pressable
            onPress={() => router.push('/(app)/tracking/lyra' as never)}
            style={({ pressed }) => [st.writeBtn, pressed && { opacity: 0.75 }]}
          >
            <RNText style={st.writeBtnTxt}>Write Entry</RNText>
          </Pressable>
        </View>

        {/* Stats */}
        <View style={st.card}>
          <RNText style={st.cardTitle}>Your Progress</RNText>
          <View style={st.statsRow}>
            <View style={st.statItem}>
              <RNText style={[st.statValue, { color: colors.accent.growth }]}>7</RNText>
              <RNText style={st.statLabel}>Day streak</RNText>
            </View>
            <View style={st.statDivider} />
            <View style={st.statItem}>
              <RNText style={[st.statValue, { color: colors.accent.calm }]}>12</RNText>
              <RNText style={st.statLabel}>Sessions</RNText>
            </View>
            <View style={st.statDivider} />
            <View style={st.statItem}>
              <RNText style={[st.statValue, { color: colors.accent.warm }]}>85%</RNText>
              <RNText style={st.statLabel}>Mood trend</RNText>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const st = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.brand[950] },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 20, paddingBottom: 40 },

  header: { marginTop: 16, marginBottom: 20 },
  welcomeLabel: { fontSize: 15, color: colors.text.secondary },
  welcomeName: { fontSize: 30, color: colors.text.primary, fontWeight: '700', letterSpacing: -0.5, marginTop: 2 },

  card: {
    backgroundColor: colors.surface.secondary,
    borderRadius: 20,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: 'rgba(98,55,201,0.18)',
  },
  cardTitle: { fontSize: 16, fontWeight: '600', color: colors.text.primary, marginBottom: 14 },
  cardSub: { fontSize: 14, color: colors.text.secondary, lineHeight: 20, marginTop: 2 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  viewAll: { fontSize: 13, color: colors.brand[400], fontWeight: '500' },

  // Mood
  moodRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 6 },
  moodPressable: { flex: 1, alignItems: 'center' },
  moodBlob: {
    width: '100%',
    height: 100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  moodImage: {
    width: 72,
    height: 72,
  },
  moodLabel: {
    fontSize: 9,
    color: colors.text.muted,
    marginTop: 7,
    fontWeight: '700',
    letterSpacing: 1.2,
    textAlign: 'center',
  },
  moodLabelSelected: { color: colors.brand[300] },

  // Session
  sessionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  sessionIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(98,55,201,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  sessionTextWrap: { flex: 1 },
  sessionTitle: { fontSize: 16, fontWeight: '600', color: colors.text.primary },
  sessionSub: { fontSize: 13, color: colors.text.secondary, marginTop: 2 },
  sessionBtn: {
    backgroundColor: colors.brand[500],
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  sessionBtnTxt: { color: '#fff', fontSize: 16, fontWeight: '700' },

  // Journal
  writeBtn: {
    alignSelf: 'flex-start',
    marginTop: 12,
    backgroundColor: colors.surface.tertiary,
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: 'rgba(98,55,201,0.25)',
  },
  writeBtnTxt: { color: colors.brand[200], fontSize: 14, fontWeight: '600' },

  // Stats
  statsRow: { flexDirection: 'row', alignItems: 'center' },
  statItem: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 26, fontWeight: '700', letterSpacing: -0.5 },
  statLabel: { fontSize: 12, color: colors.text.muted, marginTop: 3 },
  statDivider: { width: 1, height: 36, backgroundColor: 'rgba(98,55,201,0.18)' },
});

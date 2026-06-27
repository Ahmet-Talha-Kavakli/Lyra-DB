/**
 * Bloom — Logla sayfası.
 *
 * Mimari (2026-05-23):
 * - %100 gerçek Apple component. StyleSheet ile iOS Settings/Form taklidi yok.
 * - `@expo/ui/swift-ui` Form/Section/Picker/Stepper/Button/Text/LabeledContent
 * - Tarih: native UIDatePicker (@react-native-community/datetimepicker)
 * - Pain map: `BloomPainMap` (brand-custom silüet + native UISegmentedControl)
 * - Brand-spesifik tek istisna: Mood emoji bubble grid — Apple eşdeğeri yok
 */

import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text as RNText,
  ScrollView,
  Pressable,
  StyleSheet,
  Modal,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useUser } from '@clerk/expo';
import * as Haptics from 'expo-haptics';
import {
  Host,
  Form,
  Section,
  Picker,
  Stepper,
  Button,
  Text,
  LabeledContent,
  HStack,
  Spacer,
} from '@expo/ui/swift-ui';
import { pickerStyle, tag } from '@expo/ui/swift-ui/modifiers';
import type {
  IPeriodLog, TFlow, TBloomMood,
  IPainEntry,
} from '@ai-therapist/types';
import { colors } from '@/constants/theme';
import { BackToTrackingButton } from '@/components/back-to-tracking-button';
import { fetchLogByDate, upsertLog } from '@/features/bloom/lib/api';
import { useCurrentDate } from '@/features/bloom/hooks/use-current-date';
import { BloomPainMap } from '@/features/bloom/components/bloom-pain-map';

const BLOOM_TINT = '#E8A87C';

// ── Flow ───────────────────────────────────────────────────────────────────
// Native UISegmentedControl içinde (Picker.segmented) — 6 segment
const FLOW_VALUES: TFlow[] = ['none', 'spotting', 'light', 'medium', 'heavy', 'very_heavy'];
const FLOW_LABEL: Record<TFlow, string> = {
  none:       'Yok',
  spotting:   'Leke',
  light:      'Hafif',
  medium:     'Orta',
  heavy:      'Yoğun',
  very_heavy: 'Çok yoğun',
};

// ── Mood ───────────────────────────────────────────────────────────────────
// Brand-custom: emoji bubble grid (Apple eşdeğeri yok)
type MoodTone = 'heavy' | 'light';
const MOOD_OPTIONS: { value: TBloomMood; label: string; emoji: string; tone: MoodTone }[] = [
  { value: 'anxious',    label: 'Kaygılı',  emoji: '😟', tone: 'heavy' },
  { value: 'irritable',  label: 'Sinirli',  emoji: '😤', tone: 'heavy' },
  { value: 'sad',        label: 'Üzgün',    emoji: '😢', tone: 'heavy' },
  { value: 'angry',      label: 'Öfkeli',   emoji: '😠', tone: 'heavy' },
  { value: 'sensitive',  label: 'Hassas',   emoji: '🥹', tone: 'heavy' },
  { value: 'withdrawn',  label: 'Kapanık',  emoji: '🫥', tone: 'heavy' },
  { value: 'calm',       label: 'Sakin',    emoji: '😌', tone: 'light' },
  { value: 'energetic',  label: 'Enerjik',  emoji: '⚡',  tone: 'light' },
  { value: 'motivated',  label: 'Motive',   emoji: '🎯', tone: 'light' },
  { value: 'empowered',  label: 'Güçlü',    emoji: '💪', tone: 'light' },
  { value: 'connected',  label: 'Bağlı',    emoji: '🤝', tone: 'light' },
  { value: 'grateful',   label: 'Minnetli', emoji: '🌿', tone: 'light' },
];

const MOOD_HEAVY_OPTIONS = MOOD_OPTIONS.filter((m) => m.tone === 'heavy');
const MOOD_LIGHT_OPTIONS = MOOD_OPTIONS.filter((m) => m.tone === 'light');
const MOOD_HEAVY_TINT = '#9A7DE4';
const MOOD_LIGHT_TINT = '#82D9A5';

interface MoodBubbleProps {
  opt: typeof MOOD_OPTIONS[number];
  isSelected: boolean;
  onToggle: () => void;
}
function MoodBubble({ opt, isSelected, onToggle }: MoodBubbleProps) {
  const tint = opt.tone === 'heavy' ? MOOD_HEAVY_TINT : MOOD_LIGHT_TINT;
  return (
    <Pressable
      onPress={onToggle}
      style={({ pressed }) => ({
        alignItems: 'center',
        gap: 5,
        opacity: pressed ? 0.75 : 1,
        transform: pressed ? [{ scale: 0.94 }] : undefined,
      })}
      hitSlop={4}
    >
      <View
        style={{
          width: 42,
          height: 42,
          borderRadius: 21,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: isSelected ? tint + '33' : 'rgba(255,255,255,0.04)',
          borderWidth: 1.5,
          borderColor: isSelected ? tint : 'rgba(255,255,255,0.06)',
        }}
      >
        <RNText style={{ fontSize: 20 }}>{opt.emoji}</RNText>
      </View>
      <RNText
        style={{
          fontSize: 11,
          color: isSelected ? tint : colors.text.secondary,
          fontWeight: isSelected ? '700' : '500',
          textAlign: 'center',
          letterSpacing: 0.1,
        }}
        numberOfLines={1}
      >
        {opt.label}
      </RNText>
    </Pressable>
  );
}

// ── Date utils ─────────────────────────────────────────────────────────────
function toIsoDate(d: Date): string {
  return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()))
    .toISOString()
    .slice(0, 10);
}

function formatDateLong(d: Date): string {
  return d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });
}

// ── Component ──────────────────────────────────────────────────────────────
export default function BloomLogScreen() {
  const insets = useSafeAreaInsets();
  const tabBarPad = (insets.bottom || 0) + 70;
  const { user } = useUser();
  const clerkUserId = user?.id ?? null;

  const currentDate = useCurrentDate();
  const [selectedDate, setSelectedDate] = useState<Date>(() => new Date());
  useEffect(() => {
    setSelectedDate(currentDate);
  }, [currentDate]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [draftPickerDate, setDraftPickerDate] = useState<Date>(() => new Date());

  const [existingLog, setExistingLog] = useState<IPeriodLog | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state — Ağrı / Akış / Mood / Enerji / BBT
  const [flow, setFlow] = useState<TFlow | null>(null);
  const [mood, setMood] = useState<TBloomMood[]>([]);
  const [energy, setEnergy] = useState<1 | 2 | 3 | 4 | 5 | null>(null);
  const [bbt, setBbt] = useState<number | null>(null);
  const [pain, setPain] = useState<IPainEntry[]>([]);

  const toggleMood = (m: TBloomMood) => {
    setMood((prev) => (prev.includes(m) ? prev.filter((x) => x !== m) : [...prev, m]));
  };

  // Save status
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  // Dirty
  const existingMood = (existingLog?.payload?.mood ?? []) as TBloomMood[];
  const existingEnergy = (existingLog?.payload?.energy ?? null) as 1 | 2 | 3 | 4 | 5 | null;
  const existingBbt = existingLog?.payload?.bbt ?? null;
  const existingPain = (existingLog?.payload?.pain ?? []) as IPainEntry[];

  const arraysDiffer = <T,>(a: T[], b: T[]) =>
    a.length !== b.length || a.some((x) => !b.includes(x));

  const moodDirty = arraysDiffer(mood, existingMood);

  const painDirty = (() => {
    if (pain.length !== existingPain.length) return true;
    return pain.some((p) => {
      const match = existingPain.find(
        (e) => e.region === p.region && (e.note ?? '') === (p.note ?? ''),
      );
      if (!match) return true;
      return match.intensity !== p.intensity || (match.type ?? null) !== (p.type ?? null);
    });
  })();

  const isDirty =
    flow !== (existingLog?.flow ?? null) ||
    moodDirty ||
    energy !== existingEnergy ||
    bbt !== existingBbt ||
    painDirty;

  const canSave = isDirty && !loading && saveStatus !== 'saving';

  const handleSave = async () => {
    if (!clerkUserId || !canSave) return;
    setSaveStatus('saving');
    try {
      const saved = await upsertLog(
        { clerkUserId },
        {
          logDate: toIsoDate(selectedDate),
          flow,
          payload: {
            ...(existingLog?.payload ?? {}),
            mood,
            ...(energy ? { energy } : {}),
            ...(bbt != null ? { bbt } : {}),
            pain,
          },
        },
      );
      setExistingLog(saved);
      setFlow(saved.flow);
      setMood(((saved.payload?.mood ?? []) as TBloomMood[]) ?? []);
      setEnergy(((saved.payload?.energy ?? null) as 1 | 2 | 3 | 4 | 5 | null) ?? null);
      setBbt(saved.payload?.bbt ?? null);
      setPain(((saved.payload?.pain ?? []) as IPainEntry[]) ?? []);
      setSaveStatus('saved');
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setTimeout(() => setSaveStatus('idle'), 1600);
    } catch (e) {
      setSaveStatus('error');
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setError(e instanceof Error ? e.message : 'Kayıt hatası');
      setTimeout(() => setSaveStatus('idle'), 2000);
    }
  };

  const loadLog = useCallback(
    async (date: Date) => {
      if (!clerkUserId) return;
      setLoading(true);
      setError(null);
      try {
        const log = await fetchLogByDate({ clerkUserId }, toIsoDate(date));
        setExistingLog(log);
        setFlow(log?.flow ?? null);
        setMood(((log?.payload?.mood ?? []) as TBloomMood[]) ?? []);
        setEnergy(((log?.payload?.energy ?? null) as 1 | 2 | 3 | 4 | 5 | null) ?? null);
        setBbt(log?.payload?.bbt ?? null);
        setPain(((log?.payload?.pain ?? []) as IPainEntry[]) ?? []);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Log fetch hatası');
        setExistingLog(null);
      } finally {
        setLoading(false);
      }
    },
    [clerkUserId],
  );

  useEffect(() => {
    void loadLog(selectedDate);
  }, [selectedDate, loadLog]);

  const openPicker = () => {
    setDraftPickerDate(selectedDate);
    setPickerOpen(true);
  };

  const confirmPicker = () => {
    setSelectedDate(draftPickerDate);
    setPickerOpen(false);
  };

  const statusText = loading
    ? 'Yükleniyor…'
    : error
    ? error
    : existingLog
    ? 'Bu tarih için kayıt var — düzenleyebilirsin.'
    : 'Bu tarih için henüz kayıt yok.';

  return (
    <SafeAreaView style={st.root} edges={['top']}>
      <BackToTrackingButton tint={BLOOM_TINT} />

      <ScrollView
        style={st.scroll}
        contentContainerStyle={[st.content, { paddingBottom: tabBarPad + 24 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header — başlık + tarih chip (Apple Button) */}
        <View style={st.headerWrap}>
          <RNText style={st.title}>Logla</RNText>

          <Host matchContents style={st.dateChipHost}>
            <Button
              label={formatDateLong(selectedDate)}
              systemImage="calendar"
              onPress={openPicker}
            />
          </Host>
        </View>

        {/* Apple Form — gerçek SwiftUI grouped Settings */}
        <Host
          matchContents={{ vertical: true }}
          style={st.formHost}
          colorScheme="dark"
        >
          <Form>
            {/* Status */}
            <Section>
              <Text>{statusText}</Text>
            </Section>

            {/* Ağrı — brand-custom silüet, Form'un dışında */}
            {/* Form Section'ı içinde render etmek SwiftUI bridge'de zor;
                pain map'i Form'un dışında ayrı tutuyoruz (aşağıda) */}

            {/* Akış — segmented picker */}
            <Section title="Akış">
              <Picker
                label="Akış"
                selection={flow ?? 'none'}
                onSelectionChange={(v) => setFlow(v as TFlow)}
                modifiers={[pickerStyle('segmented')]}
              >
                {FLOW_VALUES.map((f) => (
                  <Text key={f} modifiers={[tag(f)]}>
                    {FLOW_LABEL[f]}
                  </Text>
                ))}
              </Picker>
              {flow !== null && (
                <Button label="Temizle" role="destructive" onPress={() => setFlow(null)} />
              )}
            </Section>

            {/* Enerji — segmented 1-5 */}
            <Section title="Enerji">
              <Picker
                label="Enerji"
                selection={energy ?? 0}
                onSelectionChange={(v) => setEnergy((v as 0 | 1 | 2 | 3 | 4 | 5) || null)}
                modifiers={[pickerStyle('segmented')]}
              >
                <Text modifiers={[tag(0)]}>–</Text>
                <Text modifiers={[tag(1)]}>1</Text>
                <Text modifiers={[tag(2)]}>2</Text>
                <Text modifiers={[tag(3)]}>3</Text>
                <Text modifiers={[tag(4)]}>4</Text>
                <Text modifiers={[tag(5)]}>5</Text>
              </Picker>
              <LabeledContent label="Düşük">
                <Text>Yüksek</Text>
              </LabeledContent>
            </Section>

            {/* BBT — Stepper */}
            <Section
              title="Vücut sıcaklığı"
              footer={<Text>Sabah uyanır uyanmaz, hareket etmeden ölç</Text>}
            >
              <Stepper
                label={bbt != null ? `${bbt.toFixed(2)} °C` : '— °C'}
                value={bbt ?? 36.5}
                step={0.05}
                min={35}
                max={40}
                onValueChange={(v) => setBbt(+v.toFixed(2))}
              />
              {bbt != null && (
                <Button label="Temizle" role="destructive" onPress={() => setBbt(null)} />
              )}
            </Section>
          </Form>
        </Host>

        {/* Ağrı — brand-custom silüet (Form dışında) */}
        <RNText style={st.brandSectionLabel}>AĞRI</RNText>
        <View style={st.brandCard}>
          <BloomPainMap value={pain} onChange={setPain} />
          {pain.length > 0 && (
            <Host matchContents style={{ marginTop: 12 }}>
              <Button label="Tümünü temizle" role="destructive" onPress={() => setPain([])} />
            </Host>
          )}
        </View>

        {/* Mood — brand-custom emoji bubble grid (Apple eşdeğeri yok) */}
        <RNText style={st.brandSectionLabel}>MOOD</RNText>
        <View style={st.brandCard}>
          <View style={st.moodRow}>
            {MOOD_HEAVY_OPTIONS.map((opt) => (
              <MoodBubble
                key={opt.value}
                opt={opt}
                isSelected={mood.includes(opt.value)}
                onToggle={() => toggleMood(opt.value)}
              />
            ))}
          </View>
          <View style={[st.moodRow, { marginTop: 14 }]}>
            {MOOD_LIGHT_OPTIONS.map((opt) => (
              <MoodBubble
                key={opt.value}
                opt={opt}
                isSelected={mood.includes(opt.value)}
                onToggle={() => toggleMood(opt.value)}
              />
            ))}
          </View>
          {mood.length > 0 && (
            <Host matchContents style={{ marginTop: 12 }}>
              <Button label="Temizle" role="destructive" onPress={() => setMood([])} />
            </Host>
          )}
        </View>

        {/* Save butonu — Apple Button borderedProminent */}
        <Host matchContents style={st.saveHost}>
          <Button
            label={
              saveStatus === 'saving'
                ? 'Kaydediliyor…'
                : saveStatus === 'saved'
                ? 'Kaydedildi ✓'
                : saveStatus === 'error'
                ? 'Tekrar dene'
                : 'Kaydet'
            }
            onPress={canSave ? handleSave : () => {}}
          />
        </Host>
      </ScrollView>

      {/* Native UIDatePicker — wheel mode */}
      <Modal
        visible={pickerOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setPickerOpen(false)}
      >
        <Pressable style={st.modalBackdrop} onPress={() => setPickerOpen(false)} />
        <View style={[st.pickerSheet, { paddingBottom: insets.bottom + 12 }]}>
          <View style={st.pickerHeader}>
            <Host matchContents>
              <Button label="İptal" onPress={() => setPickerOpen(false)} />
            </Host>
            <RNText style={st.pickerHeaderTitle}>Tarih seç</RNText>
            <Host matchContents>
              <Button label="Tamam" onPress={confirmPicker} />
            </Host>
          </View>
          <DateTimePicker
            value={draftPickerDate}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            themeVariant="dark"
            maximumDate={new Date()}
            onChange={(_, d) => d && setDraftPickerDate(d)}
            textColor={colors.text.primary}
            style={st.picker}
          />
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const st = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.brand[950] },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 16, paddingTop: 36 },

  headerWrap: {
    marginTop: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontSize: 30,
    fontWeight: '700',
    color: colors.text.primary,
    letterSpacing: -0.5,
  },
  dateChipHost: {
    minWidth: 160,
  },

  // Apple Form host — yükseklik içeriğe göre büyür
  formHost: {
    minHeight: 600, // SwiftUI Form'a yer açıyoruz; matchContents.vertical onu küçültür
    marginHorizontal: -16, // Form full-width görünsün
    marginBottom: 8,
  },

  // Brand-custom section'lar (mood, pain) — Apple Settings görsel diline
  // mümkün olduğunca yaklaştırıldı ama Apple primitive olmayan bölgeler
  brandSectionLabel: {
    fontSize: 13,
    color: 'rgba(235,235,245,0.60)',
    fontWeight: '400',
    letterSpacing: -0.08,
    marginTop: 24,
    marginBottom: 6,
    marginLeft: 16,
    textTransform: 'uppercase',
  },
  brandCard: {
    backgroundColor: '#1C1C1E',
    borderRadius: 10,
    padding: 16,
    marginBottom: 8,
  },

  moodRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },

  saveHost: {
    marginTop: 24,
    marginHorizontal: 0,
  },

  // Date picker modal
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
  pickerSheet: {
    backgroundColor: '#1C1C1E',
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingHorizontal: 12,
    paddingTop: 10,
  },
  pickerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  pickerHeaderTitle: { fontSize: 15, color: colors.text.primary, fontWeight: '600' },
  picker: { width: '100%' },
});

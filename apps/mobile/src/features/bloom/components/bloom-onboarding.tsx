import { useState } from 'react';
import {
  View,
  Text as RNText,
  Pressable,
  StyleSheet,
  Alert,
  Platform,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/constants/theme';
import { useTranslation } from '@/i18n';
import type { UpsertProfileInput } from '../lib/api';

interface Props {
  initial?: {
    birthDate?: string | null;
    lastPeriodStart?: string | null;
    averageCycleDays?: number | null;
  };
  onSubmit: (input: UpsertProfileInput) => Promise<boolean>;
  onSkip?: () => void;
}

const CYCLE_PRESETS = [25, 26, 27, 28, 29, 30, 31, 32];

const NOW = new Date();
const DEFAULT_BIRTH = new Date(1995, 5, 15);
const MIN_BIRTH = new Date(NOW.getFullYear() - 70, 0, 1);
const MAX_BIRTH = new Date(NOW.getFullYear() - 12, 11, 31);
const MIN_LAST_PERIOD = (() => {
  const d = new Date();
  d.setDate(d.getDate() - 365);
  return d;
})();

export function BloomOnboarding({ initial, onSubmit, onSkip }: Props) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState<0 | 1 | 2>(0);
  const [birthDate, setBirthDate] = useState<Date>(
    initial?.birthDate ? new Date(initial.birthDate) : DEFAULT_BIRTH,
  );
  const [lastPeriodStart, setLastPeriodStart] = useState<Date>(
    initial?.lastPeriodStart ? new Date(initial.lastPeriodStart) : new Date(),
  );
  const [avgCycle, setAvgCycle] = useState<number | null>(
    initial?.averageCycleDays ?? 28,
  );
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    const ok = await onSubmit({
      birthDate: toIso(birthDate),
      lastPeriodStart: toIso(lastPeriodStart),
      averageCycleDays: avgCycle,
    });
    setSaving(false);
    if (!ok) Alert.alert(t('bloom.onboarding.saveError'));
  }

  // NativeTabs tab bar yüksekliği iOS'ta ~50; safe area home indicator ~34.
  // Buton tabbar altında kaybolmasın diye root View'a bottom padding veriyoruz.
  const bottomPad = (insets.bottom || 0) + 70;

  return (
    <View style={[st.root, { paddingBottom: bottomPad }]}>
      <View style={st.header}>
        <RNText style={st.title}>{t('bloom.onboarding.title')}</RNText>
        <RNText style={st.subtitle}>{t('bloom.onboarding.subtitle')}</RNText>
        <View style={st.privacyRow}>
          <Ionicons name="lock-closed" size={14} color={colors.brand[300]} />
          <RNText style={st.privacy}>{t('bloom.onboarding.intro')}</RNText>
        </View>
      </View>

      <View style={st.dots}>
        {[0, 1, 2].map((i) => (
          <View
            key={i}
            style={[st.dot, step >= i && { backgroundColor: colors.brand[400] }]}
          />
        ))}
      </View>

      <View style={st.body}>
        {step === 0 && (
          <>
            <RNText style={st.q}>{t('bloom.onboarding.stepBirth')}</RNText>
            <RNText style={st.hint}>{t('bloom.onboarding.stepBirthHint')}</RNText>
            <View style={st.pickerWrap}>
              <DateTimePicker
                value={birthDate}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                themeVariant="dark"
                minimumDate={MIN_BIRTH}
                maximumDate={MAX_BIRTH}
                onChange={(_, d) => d && setBirthDate(d)}
                textColor={colors.text.primary}
                style={st.picker}
              />
            </View>
          </>
        )}

        {step === 1 && (
          <>
            <RNText style={st.q}>{t('bloom.onboarding.stepLastPeriod')}</RNText>
            <RNText style={st.hint}>{t('bloom.onboarding.stepLastPeriodHint')}</RNText>
            <View style={st.pickerWrap}>
              <DateTimePicker
                value={lastPeriodStart}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                themeVariant="dark"
                minimumDate={MIN_LAST_PERIOD}
                maximumDate={NOW}
                onChange={(_, d) => d && setLastPeriodStart(d)}
                textColor={colors.text.primary}
                style={st.picker}
              />
            </View>
          </>
        )}

        {step === 2 && (
          <>
            <RNText style={st.q}>{t('bloom.onboarding.stepCycleLength')}</RNText>
            <RNText style={st.hint}>{t('bloom.onboarding.stepCycleLengthHint')}</RNText>
            <View style={st.dayGrid}>
              {CYCLE_PRESETS.map((n) => (
                <Pressable
                  key={n}
                  onPress={() => setAvgCycle(n)}
                  style={[
                    st.dayPill,
                    avgCycle === n && {
                      backgroundColor: colors.brand[500],
                      borderColor: colors.brand[500],
                    },
                  ]}
                >
                  <RNText
                    style={[st.dayText, avgCycle === n && { color: '#fff' }]}
                  >
                    {n}
                  </RNText>
                </Pressable>
              ))}
            </View>
            <Pressable
              onPress={() => setAvgCycle(null)}
              style={[
                st.dontKnow,
                avgCycle == null && {
                  borderColor: colors.brand[400],
                  backgroundColor: 'rgba(155,125,228,0.12)',
                },
              ]}
            >
              <RNText style={st.dontKnowText}>
                {t('bloom.onboarding.stepCycleDontKnow')}
              </RNText>
            </Pressable>
          </>
        )}
      </View>

      <View style={st.actions}>
        {step > 0 ? (
          <Pressable
            style={st.backBtn}
            onPress={() => setStep((s) => (s > 0 ? ((s - 1) as 0 | 1 | 2) : s))}
          >
            <RNText style={st.backText}>{t('bloom.onboarding.back')}</RNText>
          </Pressable>
        ) : onSkip ? (
          <Pressable style={st.backBtn} onPress={onSkip}>
            <RNText style={st.backText}>{t('bloom.onboarding.skipForNow')}</RNText>
          </Pressable>
        ) : (
          <View style={st.backBtn} />
        )}

        {step < 2 ? (
          <Pressable
            style={st.nextBtn}
            onPress={() => setStep((s) => ((s + 1) as 0 | 1 | 2))}
          >
            <RNText style={st.nextText}>{t('bloom.onboarding.next')}</RNText>
          </Pressable>
        ) : (
          <Pressable
            disabled={saving}
            style={[st.nextBtn, saving && { opacity: 0.6 }]}
            onPress={handleSave}
          >
            <RNText style={st.nextText}>{t('bloom.onboarding.save')}</RNText>
          </Pressable>
        )}
      </View>
    </View>
  );
}

function toIso(d: Date): string {
  return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()))
    .toISOString()
    .slice(0, 10);
}

const st = StyleSheet.create({
  root: { flex: 1, paddingHorizontal: 20, paddingTop: 12 },
  header: { marginBottom: 14 },
  title: { fontSize: 26, fontWeight: '700', color: colors.text.primary, letterSpacing: -0.4 },
  subtitle: { fontSize: 15, color: colors.text.secondary, marginTop: 4 },
  privacyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: 'rgba(98,55,201,0.12)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(155,125,228,0.25)',
    gap: 8,
  },
  privacy: { fontSize: 12, color: colors.text.secondary, flex: 1, lineHeight: 17 },
  dots: { flexDirection: 'row', gap: 6, marginBottom: 14, marginLeft: 2 },
  dot: { width: 24, height: 4, borderRadius: 2, backgroundColor: 'rgba(168,158,200,0.25)' },
  body: { flex: 1 },
  q: { fontSize: 18, fontWeight: '600', color: colors.text.primary, marginBottom: 4 },
  hint: { fontSize: 13, color: colors.text.muted, marginBottom: 8, lineHeight: 18 },
  pickerWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  picker: {
    width: '100%',
    height: 220,
  },
  dayGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  dayPill: {
    minWidth: 56,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(155,125,228,0.35)',
    backgroundColor: 'rgba(98,55,201,0.10)',
    alignItems: 'center',
  },
  dayText: { fontSize: 15, color: colors.text.primary, fontWeight: '600' },
  dontKnow: {
    marginTop: 18,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(168,158,200,0.25)',
  },
  dontKnowText: { fontSize: 14, color: colors.text.secondary },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 14,
  },
  backBtn: { paddingVertical: 12, paddingHorizontal: 18, minWidth: 80 },
  backText: { fontSize: 15, color: colors.text.secondary, fontWeight: '500' },
  nextBtn: {
    backgroundColor: colors.brand[500],
    paddingVertical: 12,
    paddingHorizontal: 28,
    borderRadius: 12,
  },
  nextText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});

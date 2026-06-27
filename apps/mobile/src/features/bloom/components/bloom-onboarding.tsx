/**
 * Bloom onboarding — 3 step (doğum tarihi → son adet → ortalama döngü).
 *
 * Apple primitives:
 * - DateTimePicker (native UIDatePicker)
 * - @expo/ui Button (next/back/save) — gerçek SwiftUI
 * - @expo/ui Picker (wheel) for cycle length
 */

import { useState } from 'react';
import { View, Text as RNText, StyleSheet, Alert, Platform } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Host, Button, Picker, Text } from '@expo/ui/swift-ui';
import { pickerStyle, tag } from '@expo/ui/swift-ui/modifiers';
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

// 21-45 arası tüm değerler (klinik aralık)
const CYCLE_VALUES = Array.from({ length: 45 - 21 + 1 }, (_, i) => i + 21);

const NOW = new Date();
const DEFAULT_BIRTH = new Date(1995, 5, 15);
const MIN_BIRTH = new Date(NOW.getFullYear() - 70, 0, 1);
const MAX_BIRTH = new Date(NOW.getFullYear() - 12, 11, 31);
const MIN_LAST_PERIOD = (() => {
  const d = new Date();
  d.setDate(d.getDate() - 365);
  return d;
})();

// "Bilmiyorum" = magic value 0 (Picker selection için)
const UNKNOWN_CYCLE = 0;

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
            <View style={st.cyclePickerWrap}>
              <Host
                matchContents
                style={{ alignSelf: 'stretch' }}
                colorScheme="dark"
              >
                <Picker
                  label={t('bloom.onboarding.stepCycleLength')}
                  selection={avgCycle ?? UNKNOWN_CYCLE}
                  onSelectionChange={(v) =>
                    setAvgCycle((v as number) === UNKNOWN_CYCLE ? null : (v as number))
                  }
                  modifiers={[pickerStyle('wheel')]}
                >
                  <Text modifiers={[tag(UNKNOWN_CYCLE)]}>
                    {t('bloom.onboarding.stepCycleDontKnow')}
                  </Text>
                  {CYCLE_VALUES.map((n) => (
                    <Text key={n} modifiers={[tag(n)]}>
                      {`${n} gün`}
                    </Text>
                  ))}
                </Picker>
              </Host>
            </View>
          </>
        )}
      </View>

      <View style={st.actions}>
        <Host matchContents style={st.actionHost}>
          {step > 0 ? (
            <Button
              label={t('bloom.onboarding.back')}
              onPress={() => setStep((s) => (s > 0 ? ((s - 1) as 0 | 1 | 2) : s))}
            />
          ) : onSkip ? (
            <Button
              label={t('bloom.onboarding.skipForNow')}
              onPress={onSkip}
            />
          ) : (
            <Button label=" " onPress={() => {}} />
          )}
        </Host>

        <Host matchContents style={st.actionHost}>
          {step < 2 ? (
            <Button
              label={t('bloom.onboarding.next')}
              onPress={() => setStep((s) => ((s + 1) as 0 | 1 | 2))}
            />
          ) : (
            <Button
              label={saving ? '…' : t('bloom.onboarding.save')}
              onPress={saving ? () => {} : handleSave}
            />
          )}
        </Host>
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
  cyclePickerWrap: {
    flex: 1,
    alignItems: 'stretch',
    justifyContent: 'center',
    minHeight: 220,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 14,
    gap: 12,
  },
  actionHost: {
    minHeight: 44,
    minWidth: 100,
  },
});

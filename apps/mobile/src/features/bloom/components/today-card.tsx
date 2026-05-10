import { View, Text as RNText, Pressable, StyleSheet, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { IBloomToday } from '@ai-therapist/types';
import { colors } from '@/constants/theme';
import { useTranslation } from '@/i18n';
import { phasePresentation, phaseI18nKey, phaseSummaryI18nKey, formatIsoDateShort } from '../lib/phases';

interface Props {
  today: IBloomToday;
  /** Tap → confirm sheet → POST /bloom/log {today, isPeriodStart:true}.
   *  Hidden when today is already a period day (server-driven). */
  onMarkPeriodStartToday?: () => void;
  /** True when today's date is already in `periodStartIso` set (real logged
   *  period day). When true, the CTA is hidden — we don't need to teach what
   *  the user already knows. */
  todayIsLoggedPeriod?: boolean;
}

export function TodayCard({ today, onMarkPeriodStartToday, todayIsLoggedPeriod }: Props) {
  const { t, locale } = useTranslation();
  const presentation = today.phase ? phasePresentation[today.phase] : null;
  const showMarkCta = !!onMarkPeriodStartToday && !todayIsLoggedPeriod;

  return (
    <View style={st.card}>
      {/* Phase header */}
      <View style={st.phaseRow}>
        {today.cycleDay != null && (
          <RNText style={st.dayBadge}>
            {t('bloom.today.dayLabel', { day: today.cycleDay })}
          </RNText>
        )}
        {today.phase && presentation ? (
          <View style={st.phaseBadge}>
            <Ionicons name={presentation.iconFill} size={16} color={presentation.color} />
            <RNText style={[st.phaseName, { color: presentation.color }]}>
              {t(phaseI18nKey(today.phase))}
            </RNText>
          </View>
        ) : (
          <RNText style={st.phaseUnknown}>
            {t('bloom.today.phaseUnknown')}
          </RNText>
        )}
      </View>

      {today.phase && (
        <RNText style={st.phaseSummary}>
          {t(phaseSummaryI18nKey(today.phase))}
        </RNText>
      )}

      {/* Prediction */}
      <View style={st.predBlock}>
        <RNText style={st.predTitle}>{t('bloom.today.predictionTitle')}</RNText>
        {today.predictionWithheld ? (
          <RNText style={st.predWithheld}>
            {t(`bloom.today.predictionWithheld.${today.predictionReason}`)}
          </RNText>
        ) : (
          <RNText style={st.predRange}>
            {t('bloom.today.predictionRange', {
              start: today.nextPeriodStart
                ? formatIsoDateShort(today.nextPeriodStart, locale)
                : '?',
              end: today.nextPeriodEnd
                ? formatIsoDateShort(today.nextPeriodEnd, locale)
                : '?',
            })}
          </RNText>
        )}
      </View>

      {/* "Did your period start today?" CTA — only when today is not yet a
          logged period day. Tapping opens a confirm Alert (iOS native). */}
      {showMarkCta && (
        <Pressable
          style={st.markCta}
          onPress={() => {
            Alert.alert(
              t('bloom.today.markPeriodConfirmTitle'),
              t('bloom.today.markPeriodConfirmBody'),
              [
                { text: t('bloom.today.cancel'), style: 'cancel' },
                {
                  text: t('bloom.today.confirm'),
                  style: 'default',
                  onPress: onMarkPeriodStartToday,
                },
              ],
              { userInterfaceStyle: 'dark' },
            );
          }}
        >
          <Ionicons name="water" size={16} color="#C44A6E" />
          <RNText style={st.markCtaText}>{t('bloom.today.markPeriodTodayCta')}</RNText>
          <Ionicons name="chevron-forward" size={14} color={colors.text.muted} />
        </Pressable>
      )}

      {/* Quick log (placeholder for Adım 2.4) */}
      <Pressable
        style={st.logBtn}
        onPress={() => Alert.alert(t('bloom.today.quickLog'), t('bloom.today.quickLogSoon'))}
      >
        <Ionicons name="add-circle-outline" size={18} color={colors.brand[200]} />
        <RNText style={st.logText}>{t('bloom.today.quickLog')}</RNText>
      </Pressable>
    </View>
  );
}

const st = StyleSheet.create({
  card: {
    backgroundColor: colors.surface.secondary,
    borderRadius: 22,
    padding: 22,
    borderWidth: 1,
    borderColor: 'rgba(98,55,201,0.20)',
  },
  phaseRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  dayBadge: {
    fontSize: 13,
    color: colors.text.secondary,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  phaseBadge: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  phaseName: { fontSize: 15, fontWeight: '700', letterSpacing: -0.2 },
  phaseUnknown: { fontSize: 14, color: colors.text.muted, fontStyle: 'italic' },
  phaseSummary: { fontSize: 15, color: colors.text.primary, lineHeight: 22 },

  predBlock: {
    marginTop: 18,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(168,158,200,0.15)',
  },
  predTitle: {
    fontSize: 11,
    color: colors.text.muted,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  predRange: { fontSize: 16, color: colors.text.primary, fontWeight: '600' },
  predWithheld: { fontSize: 14, color: colors.text.secondary, lineHeight: 19 },

  markCta: {
    marginTop: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(196, 74, 110, 0.35)',
    backgroundColor: 'rgba(196, 74, 110, 0.08)',
  },
  markCtaText: {
    flex: 1,
    fontSize: 14,
    color: colors.text.primary,
    fontWeight: '600',
  },
  logBtn: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.surface.tertiary,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(98,55,201,0.25)',
  },
  logText: { color: colors.brand[200], fontSize: 14, fontWeight: '600' },
});

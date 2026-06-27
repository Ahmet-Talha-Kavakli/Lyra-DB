import { useState, useRef, useEffect } from 'react';
import { View, Text as RNText, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Host, Button } from '@expo/ui/swift-ui';
import { colors } from '@/constants/theme';
import { useTranslation } from '@/i18n';
import { useCycleProfile } from '@/features/bloom/hooks/use-cycle-profile';
import { useToday } from '@/features/bloom/hooks/use-today';
import { useCalendarLogs } from '@/features/bloom/hooks/use-calendar-logs';
import { useCurrentDate } from '@/features/bloom/hooks/use-current-date';
import { BloomOnboarding } from '@/features/bloom/components/bloom-onboarding';
import { TodayCard } from '@/features/bloom/components/today-card';
import { BloomCalendar } from '@/features/bloom/components/bloom-calendar';
import { BloomCalendarModal } from '@/features/bloom/components/bloom-calendar-modal';
import { BloomUndoToast } from '@/features/bloom/components/bloom-undo-toast';
import { BackToTrackingButton } from '@/components/back-to-tracking-button';

export default function BloomScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { profile, loading: profileLoading, save } = useCycleProfile();
  const { today, loading: todayLoading, reload: reloadToday } = useToday(profile);
  const calendarLogs = useCalendarLogs();
  const [skipped, setSkipped] = useState(false);
  const [editing, setEditing] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>(() => new Date());
  const [monthOpen, setMonthOpen] = useState(false);
  const tabBarPad = (insets.bottom || 0) + 70;

  // Toast state — kazara mark/unmark için 5 sn'lik anında undo affordance.
  // `key` her tetiklemede artar → toast component fresh fade-in + timer reset.
  // 4 türlü: start marked/unmarked + end marked/unmarked.
  type ToastKind = 'marked' | 'unmarked' | 'endMarked' | 'endUnmarked' | null;
  const [toast, setToast] = useState<{
    kind: ToastKind;
    date: Date | null;
    key: number;
  }>({ kind: null, date: null, key: 0 });
  const toastSeq = useRef(0);

  const showToast = (kind: Exclude<ToastKind, null>, date: Date) => {
    toastSeq.current += 1;
    setToast({ kind, date, key: toastSeq.current });
  };
  const dismissToast = () => setToast((s) => ({ ...s, kind: null }));

  const handleMarkPeriodStart = async (date: Date) => {
    const ok = await calendarLogs.markPeriodStart(date);
    if (ok) {
      void reloadToday();
      showToast('marked', date);
    }
    return ok;
  };

  const handleUnmarkPeriodStart = async (date: Date) => {
    const ok = await calendarLogs.unmarkPeriodStart(date);
    if (ok) {
      void reloadToday();
      showToast('unmarked', date);
    }
    return ok;
  };

  const handleMarkPeriodEnd = async (date: Date) => {
    const ok = await calendarLogs.markPeriodEnd(date);
    if (ok) {
      void reloadToday();
      showToast('endMarked', date);
    }
    return ok;
  };

  const handleUnmarkPeriodEnd = async (date: Date) => {
    const ok = await calendarLogs.unmarkPeriodEnd(date);
    if (ok) {
      void reloadToday();
      showToast('endUnmarked', date);
    }
    return ok;
  };

  const toastMessage =
    toast.kind === 'marked'
      ? t('bloom.calendar.toast.marked')
      : toast.kind === 'unmarked'
        ? t('bloom.calendar.toast.unmarked')
        : toast.kind === 'endMarked'
          ? t('bloom.calendar.toast.endMarked')
          : toast.kind === 'endUnmarked'
            ? t('bloom.calendar.toast.endUnmarked')
            : null;

  const handleUndo = async () => {
    if (!toast.kind || !toast.date) return;
    // Çift yönlü geri al
    if (toast.kind === 'marked') {
      await calendarLogs.unmarkPeriodStart(toast.date);
    } else if (toast.kind === 'unmarked') {
      await calendarLogs.markPeriodStart(toast.date);
    } else if (toast.kind === 'endMarked') {
      await calendarLogs.unmarkPeriodEnd(toast.date);
    } else if (toast.kind === 'endUnmarked') {
      await calendarLogs.markPeriodEnd(toast.date);
    }
    void reloadToday();
    dismissToast();
  };

  // "Bugün" tarihi — cihazdan okunur, gece yarısı geçince otomatik güncellenir.
  // selectedDate da bugüne hizalanır; kullanıcı manuel tap'le başka güne
  // gidebilir ama bir sonraki gün değişiminde tekrar bugüne döner. Yani
  // "bugün" her zaman sistem gerçeği, biz dondurmuyoruz.
  const currentDate = useCurrentDate();
  const todayIso = currentDate.toISOString().slice(0, 10);

  useEffect(() => {
    setSelectedDate(currentDate);
  }, [currentDate]);
  const todayIsLoggedPeriod =
    calendarLogs.periodStartIso.has(todayIso) || calendarLogs.flowDayIso.has(todayIso);

  if (profileLoading) {
    return (
      <SafeAreaView style={st.root} edges={['top']}>
        <BackToTrackingButton tint="#E8A87C" />
        <View style={st.center}>
          <ActivityIndicator color={colors.brand[300]} />
        </View>
      </SafeAreaView>
    );
  }

  // First-run (no profile) OR user tapped "Edit" → render onboarding flow.
  // In edit mode we pre-fill the existing profile and close on success.
  const showOnboarding = (!profile && !skipped) || editing;
  if (showOnboarding) {
    return (
      <SafeAreaView style={st.root} edges={['top']}>
        <BloomOnboarding
          initial={
            profile
              ? {
                  birthDate: profile.birthDate,
                  lastPeriodStart: profile.lastPeriodStart,
                  averageCycleDays: profile.averageCycleDays,
                }
              : undefined
          }
          onSubmit={async (input) => {
            const ok = await save(input);
            if (ok) {
              setEditing(false);
              void reloadToday();
            }
            return ok;
          }}
          onSkip={editing ? () => setEditing(false) : () => setSkipped(true)}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={st.root} edges={['top']}>
      <BackToTrackingButton tint="#E8A87C" />
      <ScrollView
        style={st.scroll}
        contentContainerStyle={[st.content, { paddingBottom: tabBarPad }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header — Bloom title + Edit setup */}
        <View style={st.headerWrap}>
          <View style={st.header}>
            <RNText style={st.title}>{t('bloom.tab')}</RNText>
            {profile && (
              <Host matchContents>
                <Button
                  label=""
                  systemImage="pencil"
                  onPress={() => setEditing(true)}
                />
              </Host>
            )}
          </View>
        </View>

        {/* Calendar — full-bleed week strip + month modal */}
        {profile && (
          <BloomCalendar
            profile={profile}
            selectedDate={selectedDate}
            onSelectDate={setSelectedDate}
            onOpenMonth={() => setMonthOpen(true)}
            periodStartIso={calendarLogs.periodStartIso}
            periodEndIso={calendarLogs.periodEndIso}
            flowDayIso={calendarLogs.flowDayIso}
            onMarkPeriodStart={handleMarkPeriodStart}
            onUnmarkPeriodStart={handleUnmarkPeriodStart}
            onMarkPeriodEnd={handleMarkPeriodEnd}
            onUnmarkPeriodEnd={handleUnmarkPeriodEnd}
          />
        )}

        {/* Today card — beneath calendar */}
        <View style={st.bodyWrap}>
          {today ? (
            <TodayCard
              today={today}
              todayIsLoggedPeriod={todayIsLoggedPeriod}
              onMarkPeriodStartToday={() => {
                void handleMarkPeriodStart(new Date());
              }}
            />
          ) : (
            <View style={st.emptyCard}>
              <RNText style={st.emptyTitle}>{t('bloom.today.needsOnboarding')}</RNText>
              <RNText style={st.emptySub}>{t('bloom.today.needsOnboardingSub')}</RNText>
            </View>
          )}

          {todayLoading && (
            <View style={{ paddingTop: 12, alignItems: 'center' }}>
              <ActivityIndicator color={colors.brand[300]} />
            </View>
          )}
        </View>
      </ScrollView>

      <BloomCalendarModal
        visible={monthOpen}
        onClose={() => setMonthOpen(false)}
        profile={profile}
        selectedDate={selectedDate}
        onSelectDate={setSelectedDate}
        periodStartIso={calendarLogs.periodStartIso}
        periodEndIso={calendarLogs.periodEndIso}
        flowDayIso={calendarLogs.flowDayIso}
        onMarkPeriodStart={handleMarkPeriodStart}
        onUnmarkPeriodStart={handleUnmarkPeriodStart}
        onMarkPeriodEnd={handleMarkPeriodEnd}
        onUnmarkPeriodEnd={handleUnmarkPeriodEnd}
        toastMessage={toastMessage}
        toastKey={toast.key}
        toastUndoLabel={t('bloom.calendar.toast.undo')}
        onToastUndo={handleUndo}
        onToastDismiss={dismissToast}
      />

      {/* Anasayfa toast — sadece modal kapalıyken görünür (modal kendi toast'ını render ediyor) */}
      {!monthOpen && (
        <BloomUndoToast
          message={toastMessage}
          toastKey={toast.key}
          undoLabel={t('bloom.calendar.toast.undo')}
          onUndo={handleUndo}
          onDismiss={dismissToast}
        />
      )}
    </SafeAreaView>
  );
}

const st = StyleSheet.create({
  root:    { flex: 1, backgroundColor: colors.brand[950] },
  scroll:  { flex: 1 },
  content: {},
  center:  { flex: 1, alignItems: 'center', justifyContent: 'center' },
  headerWrap: { paddingHorizontal: 20, paddingTop: 36 },
  header:  {
    marginTop: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title:   {
    fontSize: 30,
    color: colors.text.primary,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  bodyWrap: {
    paddingHorizontal: 20,
    paddingTop: 14,
  },
  emptyCard: {
    backgroundColor: colors.surface.secondary,
    borderRadius: 20,
    padding: 22,
    borderWidth: 1,
    borderColor: 'rgba(98,55,201,0.20)',
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
  },
  emptySub: {
    fontSize: 14,
    color: colors.text.secondary,
    marginTop: 4,
    lineHeight: 19,
  },
});

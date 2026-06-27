/**
 * BloomCalendar — Bloom anasayfasında üstte yer alan haftalık takvim şeridi.
 * iOS Apple Health / Calendar pattern'inden esinlenmiş, Bloom paletiyle
 * kendi UX dilinde.
 *
 *   - Yatay FlatList horizontal paging — her sayfa 1 hafta
 *   - Day cell: hafta-içi-gün label + gün numarası + altında faz dot'u
 *   - Today: gün numarası çevresinde dashed mor ring
 *   - Selected: solid mor ring
 *   - Period günleri: dot solid fill + altta ince period bar
 *   - Tahmin günleri: dashed dot (kırmızı alarm yok — dürüstlük kuralı)
 *
 * Adım 2A.1 (görsel iskelet) — gerçek log verisi yok, profile'dan türetilir.
 */

import { useCallback, useMemo, useRef, useState, useEffect } from 'react';
import {
  View,
  Text as RNText,
  StyleSheet,
  Pressable,
  FlatList,
  type ListRenderItemInfo,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  Dimensions,
  ActionSheetIOS,
  Alert,
  Platform,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Circle } from 'react-native-svg';
import type { ICycleProfile } from '@ai-therapist/types';
import { colors } from '@/constants/theme';
import { useTranslation, getLocale } from '@/i18n';
import enJson from '@/i18n/en.json';
import trJson from '@/i18n/tr.json';
import { phasePresentation } from '../lib/phases';
import { useCurrentDate } from '../hooks/use-current-date';
import {
  addDays,
  computeWeekCells,
  isoOf,
  shouldWithholdPrediction,
  toUtcMidnight,
  type DayCell,
} from '../lib/calendar-data';

interface Props {
  profile: ICycleProfile | null;
  /** Currently focused date (parent-owned). Defaults to today. */
  selectedDate: Date;
  onSelectDate: (d: Date) => void;
  /** Tapping the "View month" affordance opens the month modal. */
  onOpenMonth: () => void;
  /** Backend-driven period start ISO set (real logged days, "filled" simge). */
  periodStartIso?: Set<string>;
  /** Backend-driven period end ISO set (kullanıcı "regl son günü" işaretledi). */
  periodEndIso?: Set<string>;
  /** Backend-driven any-flow ISO set (kullanıcı bu güne flow girdi). */
  flowDayIso?: Set<string>;
  /** Long-press → "Adetim başladı" handler. */
  onMarkPeriodStart?: (date: Date) => Promise<boolean> | void;
  /** Long-press → "İşareti kaldır" handler (zaten işaretli günler). */
  onUnmarkPeriodStart?: (date: Date) => Promise<boolean> | void;
  /** Long-press → "Adetim bitti" handler. */
  onMarkPeriodEnd?: (date: Date) => Promise<boolean> | void;
  /** Long-press → "Bitiş işaretini kaldır" handler. */
  onUnmarkPeriodEnd?: (date: Date) => Promise<boolean> | void;
}

const SCREEN_W = Dimensions.get('window').width;
// 52 weeks back + current + 52 weeks forward
const WEEKS_BACK = 52;
const WEEKS_FWD = 52;
const TOTAL_WEEKS = WEEKS_BACK + 1 + WEEKS_FWD;
const CENTER_INDEX = WEEKS_BACK;

interface WeekItem {
  index: number;
  weekStart: Date;
}

export function BloomCalendar({
  profile,
  selectedDate,
  onSelectDate,
  onOpenMonth,
  periodStartIso,
  periodEndIso,
  flowDayIso,
  onMarkPeriodStart,
  onUnmarkPeriodStart,
  onMarkPeriodEnd,
  onUnmarkPeriodEnd,
}: Props) {
  const { t } = useTranslation();
  const listRef = useRef<FlatList<WeekItem>>(null);
  const currentDate = useCurrentDate();
  const today = useMemo(() => toUtcMidnight(currentDate), [currentDate]);
  const withheld = useMemo(() => shouldWithholdPrediction(profile), [profile]);

  // iOS Health "Cycle Tracking" pattern: bugün her zaman 4. sütunda (ortada).
  // Anchor = today − 3, hafta = [t-3 .. t+3]. Sayfalar haftalık kayar
  // (her sayfa = 7 gün). Bu yüzden Sun-Sat klasik haftası kullanmıyoruz.
  const initialAnchor = useMemo(() => addDays(today, -3), [today]);
  const weeks: WeekItem[] = useMemo(
    () =>
      Array.from({ length: TOTAL_WEEKS }, (_, i) => ({
        index: i,
        weekStart: addDays(initialAnchor, (i - CENTER_INDEX) * 7),
      })),
    [initialAnchor],
  );

  // Track which week is on screen (for header label)
  const [visibleWeekIndex, setVisibleWeekIndex] = useState<number>(CENTER_INDEX);
  const visibleWeekStart = weeks[visibleWeekIndex]?.weekStart ?? initialAnchor;

  // Header title — visible week'in ortadaki gününün (4. sütun, today-equivalent)
  // ay + yıl bilgisi. Hafta ay sınırını aşıyorsa orta gün baskın.
  const headerTitle = useMemo(() => {
    const arr =
      getLocale() === 'tr'
        ? (trJson as any).bloom.calendar.monthFull
        : (enJson as any).bloom.calendar.monthFull;
    const center = addDays(visibleWeekStart, 3);
    const monthIdx = center.getUTCMonth();
    const year = center.getUTCFullYear();
    return `${arr[monthIdx]} ${year}`;
  }, [visibleWeekStart]);

  // Snap to today on mount
  useEffect(() => {
    const id = setTimeout(() => {
      listRef.current?.scrollToIndex({ index: CENTER_INDEX, animated: false });
    }, 0);
    return () => clearTimeout(id);
  }, []);

  const onMomentumEnd = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const x = e.nativeEvent.contentOffset.x;
    const idx = Math.round(x / SCREEN_W);
    if (idx !== visibleWeekIndex) {
      setVisibleWeekIndex(idx);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    }
  }, [visibleWeekIndex]);

  const handleDayPress = useCallback(
    (cell: DayCell) => {
      Haptics.selectionAsync().catch(() => {});
      onSelectDate(cell.date);
    },
    [onSelectDate],
  );

  const handleDayLongPress = useCallback(
    (cell: DayCell) => {
      if (cell.isFuture) return; // future days can't be period start/end
      const isStartMarked = !!periodStartIso && periodStartIso.has(cell.iso);
      const isEndMarked = !!periodEndIso && periodEndIso.has(cell.iso);

      // 4 durumlu menü — her durum kendi aksiyon listesini oluşturur:
      //   1) Hiçbir şey marked değil          → [Mark start]
      //   2) Sadece start marked              → [Unmark start, Mark end]
      //   3) Sadece end marked                → [Unmark end, Mark start]
      //   4) Hem start hem end marked         → [Unmark start, Unmark end]
      type Action = {
        label: string;
        run: () => void;
        destructive?: boolean;
      };
      const actions: Action[] = [];

      if (isStartMarked && onUnmarkPeriodStart) {
        actions.push({
          label: t('bloom.calendar.actions.unmarkPeriodStart'),
          run: () => void onUnmarkPeriodStart(cell.date),
          destructive: true,
        });
      }
      if (isEndMarked && onUnmarkPeriodEnd) {
        actions.push({
          label: t('bloom.calendar.actions.unmarkPeriodEnd'),
          run: () => void onUnmarkPeriodEnd(cell.date),
          destructive: true,
        });
      }
      if (!isStartMarked && onMarkPeriodStart) {
        actions.push({
          label: t('bloom.calendar.actions.markPeriodStart'),
          run: () => void onMarkPeriodStart(cell.date),
        });
      }
      if (!isEndMarked && onMarkPeriodEnd) {
        actions.push({
          label: t('bloom.calendar.actions.markPeriodEnd'),
          run: () => void onMarkPeriodEnd(cell.date),
        });
      }

      if (actions.length === 0) return;
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});

      const dateLabel = cell.date.toLocaleDateString(getLocale() === 'tr' ? 'tr-TR' : 'en-US', {
        month: 'long',
        day: 'numeric',
      });
      const cancelLabel = t('bloom.calendar.actions.cancel');
      const options = [...actions.map((a) => a.label), cancelLabel];
      const cancelIdx = options.length - 1;
      const destructiveIndexes = actions
        .map((a, i) => (a.destructive ? i : -1))
        .filter((i) => i >= 0);

      if (Platform.OS === 'ios') {
        ActionSheetIOS.showActionSheetWithOptions(
          {
            options,
            cancelButtonIndex: cancelIdx,
            // iOS allows only one destructive button — use the first if multiple
            destructiveButtonIndex: destructiveIndexes[0],
            title: dateLabel,
            userInterfaceStyle: 'dark',
          },
          (idx) => {
            if (idx != null && idx >= 0 && idx < actions.length) {
              actions[idx]!.run();
            }
          },
        );
      } else {
        // Android fallback
        Alert.alert(
          dateLabel,
          undefined,
          [
            ...actions.map((a) => ({
              text: a.label,
              onPress: a.run,
              style: (a.destructive ? 'destructive' : 'default') as 'destructive' | 'default',
            })),
            { text: cancelLabel, style: 'cancel' as const },
          ],
        );
      }
    },
    [
      periodStartIso, periodEndIso,
      onMarkPeriodStart, onUnmarkPeriodStart,
      onMarkPeriodEnd, onUnmarkPeriodEnd,
      t,
    ],
  );

  const renderWeek = useCallback(
    ({ item }: ListRenderItemInfo<WeekItem>) => {
      const cells = computeWeekCells(item.weekStart, {
        profile,
        today,
        predictionWithheld: withheld,
        periodStartIso,
        periodEndIso,
        flowDayIso,
      });
      return (
        <View style={st.week}>
          {cells.map((cell) => (
            <DayCellView
              key={cell.iso}
              cell={cell}
              isSelected={isoOf(selectedDate) === cell.iso}
              onPress={() => handleDayPress(cell)}
              onLongPress={() => handleDayLongPress(cell)}
            />
          ))}
        </View>
      );
    },
    [profile, today, withheld, selectedDate, handleDayPress, handleDayLongPress, periodStartIso, periodEndIso, flowDayIso],
  );

  // Dynamic weekday labels — visible week'in gerçek gün sırasına göre.
  // weekdayShort JSON'u Sun=0..Sat=6 sıralı; visibleWeekStart.getUTCDay()
  // ile rotate ediyoruz. Örn. weekStart Cuma ise: F S S M T W T.
  const weekdayLabels: string[] = useMemo(() => {
    const base: string[] =
      getLocale() === 'tr'
        ? (trJson as any).bloom.calendar.weekdayShort
        : (enJson as any).bloom.calendar.weekdayShort;
    const startDow = visibleWeekStart.getUTCDay();
    return Array.from({ length: 7 }, (_, i) => base[(startDow + i) % 7]);
  }, [visibleWeekStart]);

  return (
    <View style={st.root}>
      {/* Header: month label only — "View month" moved below the strip */}
      <View style={st.header}>
        <RNText style={st.title}>{headerTitle}</RNText>
      </View>

      {/* Weekday labels */}
      <View style={st.weekdays}>
        {weekdayLabels.map((label, i) => (
          <RNText key={i} style={st.weekday}>
            {label}
          </RNText>
        ))}
      </View>

      {/* Horizontal week strip */}
      <FlatList
        ref={listRef}
        data={weeks}
        keyExtractor={(w) => String(w.index)}
        renderItem={renderWeek}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        getItemLayout={(_, index) => ({
          length: SCREEN_W,
          offset: SCREEN_W * index,
          index,
        })}
        initialScrollIndex={CENTER_INDEX}
        onMomentumScrollEnd={onMomentumEnd}
        windowSize={5}
        initialNumToRender={3}
        maxToRenderPerBatch={3}
      />

      {/* Footer — solda 2-satır hint (yalnız ilk kez log yokken),
                    sağda inline "View month ▾" linki */}
      <View style={st.footerRow}>
        <View style={st.hintWrap}>
          {periodStartIso && periodStartIso.size === 0 && (
            <>
              <RNText style={st.hintLine}>{t('bloom.calendar.hintTap')}</RNText>
              <RNText style={st.hintLine}>{t('bloom.calendar.hintHold')}</RNText>
            </>
          )}
        </View>
        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
            onOpenMonth();
          }}
          hitSlop={10}
          style={({ pressed }) => [st.viewMonth, pressed && { opacity: 0.6 }]}
        >
          <RNText style={st.viewMonthText}>{t('bloom.calendar.viewMonth')}</RNText>
          <View style={st.viewMonthChevronWrap}>
            <Ionicons name="chevron-down" size={14} color={colors.brand[300]} />
          </View>
        </Pressable>
      </View>
    </View>
  );
}

// ── DayCellView ─────────────────────────────────────────────────────────────

const CELL_W = SCREEN_W / 7;
const RING_SIZE = 38;
const ICON_SIZE = 14;

/**
 * Doğa motifi tier (Alternatif A):
 *   - period:    solid (filled) icon — "yaşanan adet günü"
 *   - predicted: outline icon, opacity 0.7 — "tahmin"
 *   - phaseOnly: outline icon, opacity 0.45 — "şu an bu fazdasın" hafif iz
 *   - none:      hiçbir şey
 */
type IconTier = 'period' | 'predicted' | 'phaseOnly' | 'none';

function iconTierFor(cell: DayCell): IconTier {
  if (!cell.phase) return 'none';
  if (cell.isPeriod) return 'period';
  if (cell.isPredicted) return 'predicted';
  return 'phaseOnly';
}

function DayCellView({
  cell,
  isSelected,
  onPress,
  onLongPress,
}: {
  cell: DayCell;
  isSelected: boolean;
  onPress: () => void;
  onLongPress?: () => void;
}) {
  const presentation = cell.phase ? phasePresentation[cell.phase] : null;
  const tier = iconTierFor(cell);
  const dim = cell.isFuture ? 0.55 : 1;

  const iconName =
    tier === 'period' ? presentation?.iconFill : presentation?.iconOutline;
  const iconOpacity =
    tier === 'period' ? 1 : tier === 'predicted' ? 0.7 : tier === 'phaseOnly' ? 0.45 : 0;

  return (
    <Pressable onPress={onPress} onLongPress={onLongPress} delayLongPress={350} style={st.cell}>
      <View style={st.numberWrap}>
        {cell.isToday && !isSelected && (
          <Svg width={RING_SIZE} height={RING_SIZE} style={StyleSheet.absoluteFill}>
            <Circle
              cx={RING_SIZE / 2}
              cy={RING_SIZE / 2}
              r={(RING_SIZE - 2) / 2}
              stroke={colors.brand[300]}
              strokeWidth={1.5}
              strokeDasharray="3, 3"
              fill="none"
            />
          </Svg>
        )}
        {isSelected && <View style={st.selectedRing} />}
        <RNText
          style={[
            st.number,
            { opacity: dim },
            cell.isToday && !isSelected && { color: colors.brand[200], fontWeight: '700' },
            isSelected && { color: colors.text.primary, fontWeight: '700' },
          ]}
        >
          {cell.dayOfMonth}
        </RNText>
      </View>

      {/* Phase icon — Bloom doğa motifi (damla / yaprak / parıltı / hilal) */}
      <View style={st.iconRow}>
        {iconName && presentation ? (
          <Ionicons
            name={iconName}
            size={ICON_SIZE}
            color={presentation.color}
            style={{ opacity: iconOpacity }}
          />
        ) : (
          <View style={st.iconPlaceholder} />
        )}
      </View>

      {/* Period bar — yumuşak alt çubuk, sadece period günü */}
      {cell.isPeriod && presentation && (
        <View style={[st.periodBar, { backgroundColor: presentation.color }]} />
      )}
    </Pressable>
  );
}

const st = StyleSheet.create({
  root: {
    paddingTop: 6,
    paddingBottom: 4,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.text.primary,
    letterSpacing: -0.3,
  },
  weekdays: {
    flexDirection: 'row',
    paddingBottom: 4,
  },
  weekday: {
    width: CELL_W,
    textAlign: 'center',
    fontSize: 11,
    color: colors.text.muted,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  week: {
    width: SCREEN_W,
    flexDirection: 'row',
  },
  cell: {
    width: CELL_W,
    alignItems: 'center',
    paddingVertical: 6,
  },
  numberWrap: {
    width: RING_SIZE,
    height: RING_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconRow: {
    height: ICON_SIZE + 2,
    marginTop: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconPlaceholder: {
    width: ICON_SIZE,
    height: ICON_SIZE,
  },
  periodBar: {
    position: 'absolute',
    bottom: 1,
    width: 22,
    height: 2,
    borderRadius: 1,
    opacity: 0.55,
  },
  selectedRing: {
    position: 'absolute',
    width: RING_SIZE,
    height: RING_SIZE,
    borderRadius: RING_SIZE / 2,
    backgroundColor: colors.brand[500],
  },
  number: {
    fontSize: 16,
    color: colors.text.primary,
    fontWeight: '500',
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 6,
    gap: 12,
  },
  hintWrap: {
    flex: 1,
  },
  hintLine: {
    fontSize: 11.5,
    color: colors.text.muted,
    fontStyle: 'italic',
    lineHeight: 15,
  },
  viewMonth: {
    flexShrink: 0,
    flexDirection: 'column', // text üstte, chevron-wrap altta
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 12,
  },
  viewMonthText: {
    fontSize: 13,
    color: colors.brand[300],
    fontWeight: '600',
  },
  viewMonthChevronWrap: {
    width: '100%',          // Pressable iç genişliğini doldur
    alignItems: 'flex-end', // chevron sağa yaslı
    marginTop: 2,
  },
});

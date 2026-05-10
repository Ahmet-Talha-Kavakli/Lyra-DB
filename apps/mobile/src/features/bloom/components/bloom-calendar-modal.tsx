/**
 * BloomCalendarModal — full month grid sheet, opened from "View month" link.
 *
 * iOS native presentation: <Modal presentationStyle="pageSheet"> → otomatik
 * UISheetPresentationController, drag-to-dismiss native gelir. Apple Calendar
 * ay görünümünden esinlenmiş, Bloom paletiyle.
 */

import { useState, useCallback, useMemo, useEffect, useRef, type ComponentProps } from 'react';
import {
  View,
  Text as RNText,
  Modal,
  Pressable,
  StyleSheet,
  Platform,
  ActionSheetIOS,
  Alert,
  Animated,
  PanResponder,
  Dimensions,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Svg, { Circle } from 'react-native-svg';
import type { ICycleProfile } from '@ai-therapist/types';
import { colors } from '@/constants/theme';
import { useTranslation, getLocale } from '@/i18n';
import { phasePresentation } from '../lib/phases';
import { BloomUndoToast } from './bloom-undo-toast';
import {
  computeMonthGrid,
  getMonthStart,
  isoOf,
  shouldWithholdPrediction,
  toUtcMidnight,
  type DayCell,
} from '../lib/calendar-data';
import enJson from '@/i18n/en.json';
import trJson from '@/i18n/tr.json';

interface Props {
  visible: boolean;
  onClose: () => void;
  profile: ICycleProfile | null;
  selectedDate: Date;
  onSelectDate: (d: Date) => void;
  periodStartIso?: Set<string>;
  flowDayIso?: Set<string>;
  onMarkPeriodStart?: (date: Date) => Promise<boolean> | void;
  onUnmarkPeriodStart?: (date: Date) => Promise<boolean> | void;
  /** Toast embedded inside the sheet so users see undo affordance even when
      they marked from the month grid (anasayfa toast'ı sheet altında kalıyor). */
  toastMessage?: string | null;
  toastKey?: string | number;
  toastUndoLabel?: string;
  onToastUndo?: () => void;
  onToastDismiss?: () => void;
}

const SCREEN_H = Dimensions.get('window').height;
const SHEET_HEIGHT_RATIO = 0.65;
const SHEET_HEIGHT = SCREEN_H * SHEET_HEIGHT_RATIO;
const DISMISS_DY = 100;
const DISMISS_VY = 0.6;

export function BloomCalendarModal({
  visible,
  onClose,
  profile,
  selectedDate,
  onSelectDate,
  periodStartIso,
  flowDayIso,
  onMarkPeriodStart,
  onUnmarkPeriodStart,
  toastMessage,
  toastKey,
  toastUndoLabel,
  onToastUndo,
  onToastDismiss,
}: Props) {
  const { t } = useTranslation();
  const today = useMemo(() => toUtcMidnight(new Date()), []);
  const withheld = useMemo(() => shouldWithholdPrediction(profile), [profile]);

  // Browse cursor: which month grid is shown
  const [cursor, setCursor] = useState<Date>(() => getMonthStart(selectedDate));

  // Slide-in/out animation. Modal animationType="none"; we drive translateY ourselves
  // so drag-to-dismiss can take over mid-flight.
  const translateY = useRef(new Animated.Value(SHEET_HEIGHT)).current;

  useEffect(() => {
    if (visible) {
      // Reset to off-screen, then animate up. Bu hot reload sırasında ya da
      // önceki spring'in yarım kaldığı durumda doğru başlangıç pozisyonu
      // garanti eder.
      translateY.setValue(SHEET_HEIGHT);
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
        bounciness: 4,
        speed: 14,
      }).start();
    }
  }, [visible, translateY]);

  const closeWithSlide = useCallback(() => {
    Animated.timing(translateY, {
      toValue: SHEET_HEIGHT,
      duration: 220,
      useNativeDriver: true,
    }).start(() => {
      onClose();
    });
  }, [translateY, onClose]);

  // Handle bar dedicated drag zone — Apple Sheets pattern.
  // Sadece üst dar şerit (handle + biraz hitSlop alan) drag tetikler.
  // Sheet body içeriği (chevron tap, gün tap, long-press) tamamen ayrı.
  const dragPanResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onStartShouldSetPanResponderCapture: () => true,
        onMoveShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponderCapture: () => true,
        onPanResponderGrant: () => {
          translateY.stopAnimation();
        },
        onPanResponderMove: (_, g) => {
          if (g.dy >= 0) translateY.setValue(g.dy);
        },
        onPanResponderRelease: (_, g) => {
          if (g.dy > DISMISS_DY || g.vy > DISMISS_VY) {
            closeWithSlide();
          } else {
            Animated.spring(translateY, {
              toValue: 0,
              useNativeDriver: true,
              bounciness: 4,
              speed: 16,
            }).start();
          }
        },
        onPanResponderTerminationRequest: () => false,
      }),
    [translateY, closeWithSlide],
  );

  const monthName = useMemo(() => {
    const arr =
      getLocale() === 'tr'
        ? (trJson as any).bloom.calendar.monthFull
        : (enJson as any).bloom.calendar.monthFull;
    return `${arr[cursor.getUTCMonth()]} ${cursor.getUTCFullYear()}`;
  }, [cursor]);

  const grid = useMemo(
    () =>
      computeMonthGrid(cursor, {
        profile,
        today,
        predictionWithheld: withheld,
        periodStartIso,
        flowDayIso,
      }),
    [cursor, profile, today, withheld, periodStartIso, flowDayIso],
  );

  const weekdayLabels: string[] = useMemo(
    () =>
      getLocale() === 'tr'
        ? (trJson as any).bloom.calendar.weekdayShort
        : (enJson as any).bloom.calendar.weekdayShort,
    [],
  );

  const goPrevMonth = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setCursor((c) => new Date(Date.UTC(c.getUTCFullYear(), c.getUTCMonth() - 1, 1)));
  }, []);

  const goNextMonth = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setCursor((c) => new Date(Date.UTC(c.getUTCFullYear(), c.getUTCMonth() + 1, 1)));
  }, []);

  const handleDayPress = useCallback(
    (cell: DayCell) => {
      Haptics.selectionAsync().catch(() => {});
      onSelectDate(cell.date);
      // Close modal after a beat so the user sees confirm
      setTimeout(closeWithSlide, 120);
    },
    [onSelectDate, closeWithSlide],
  );

  const handleDayLongPress = useCallback(
    (cell: DayCell) => {
      if (cell.isFuture) return;
      const isMarked = !!periodStartIso && periodStartIso.has(cell.iso);
      if (isMarked && !onUnmarkPeriodStart) return;
      if (!isMarked && !onMarkPeriodStart) return;
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});

      const dateLabel = cell.date.toLocaleDateString(getLocale() === 'tr' ? 'tr-TR' : 'en-US', {
        month: 'long',
        day: 'numeric',
      });
      const actionLabel = isMarked
        ? t('bloom.calendar.actions.unmarkPeriodStart')
        : t('bloom.calendar.actions.markPeriodStart');
      const options = [actionLabel, t('bloom.calendar.actions.cancel')];

      const fire = () => {
        if (isMarked) void onUnmarkPeriodStart?.(cell.date);
        else void onMarkPeriodStart?.(cell.date);
      };

      if (Platform.OS === 'ios') {
        ActionSheetIOS.showActionSheetWithOptions(
          {
            options,
            cancelButtonIndex: 1,
            destructiveButtonIndex: isMarked ? 0 : undefined,
            title: dateLabel,
            userInterfaceStyle: 'dark',
          },
          (idx) => {
            if (idx === 0) fire();
          },
        );
      } else {
        Alert.alert(dateLabel, undefined, [
          { text: actionLabel, onPress: fire, style: isMarked ? 'destructive' : 'default' },
          { text: t('bloom.calendar.actions.cancel'), style: 'cancel' },
        ]);
      }
    },
    [onMarkPeriodStart, onUnmarkPeriodStart, periodStartIso, t],
  );

  return (
    <Modal
      visible={visible}
      onRequestClose={closeWithSlide}
      animationType="none"
      presentationStyle="overFullScreen"
      transparent
    >
      {/* Invisible touch-area — sheet üstüne tap → modal kapanır.
          Görsel olarak backdrop yok (kullanıcı tercihi). */}
      <Pressable style={st.backdrop} onPress={closeWithSlide} />

      {/* Sheet — altta sabit yükseklikte. Drag SADECE üstteki handle zone'unda. */}
      <Animated.View style={[st.sheet, { transform: [{ translateY }] }]}>
        <BlurView tint="dark" intensity={40} style={StyleSheet.absoluteFill} />
        <View style={st.tint} />

        {/* Drag zone — sheet üstünde geniş şeffaf touch alan.
            Handle bar görsel olarak burada; PanResponder bu View'da. */}
        <View {...dragPanResponder.panHandlers} style={st.dragZone}>
          <View style={st.handle} />
        </View>

        {/* Header */}
        <View style={st.header}>
          <Pressable
            onPress={goPrevMonth}
            hitSlop={12}
            style={({ pressed }) => [st.chev, pressed && { opacity: 0.5 }]}
          >
            <Ionicons name="chevron-back" size={20} color={colors.brand[300]} />
          </Pressable>
          <RNText style={st.monthLabel}>{monthName}</RNText>
          <Pressable
            onPress={goNextMonth}
            hitSlop={12}
            style={({ pressed }) => [st.chev, pressed && { opacity: 0.5 }]}
          >
            <Ionicons name="chevron-forward" size={20} color={colors.brand[300]} />
          </Pressable>
        </View>

        {/* Weekday labels */}
        <View style={st.weekdays}>
          {weekdayLabels.map((l, i) => (
            <RNText key={i} style={st.weekday}>
              {l}
            </RNText>
          ))}
        </View>

        {/* Grid */}
        <View style={st.grid}>
          {grid.map((week, ri) => (
            <View key={ri} style={st.row}>
              {week.map((cell) => (
                <MonthDayCell
                  key={cell.iso}
                  cell={cell}
                  isSelected={isoOf(selectedDate) === cell.iso}
                  onPress={() => handleDayPress(cell)}
                  onLongPress={() => handleDayLongPress(cell)}
                />
              ))}
            </View>
          ))}
        </View>

        {/* Legend — A motifi: 4 faz ikonu + today */}
        <View style={st.legend}>
          <Legend
            iconName={phasePresentation.menstrual.iconFill}
            color={phasePresentation.menstrual.color}
            label={t('bloom.calendar.legend.menstrual')}
            filled
          />
          <Legend
            iconName={phasePresentation.follicular.iconFill}
            color={phasePresentation.follicular.color}
            label={t('bloom.calendar.legend.follicular')}
            filled
          />
          <Legend
            iconName={phasePresentation.ovulation.iconFill}
            color={phasePresentation.ovulation.color}
            label={t('bloom.calendar.legend.ovulation')}
            filled
          />
          <Legend
            iconName={phasePresentation.luteal.iconFill}
            color={phasePresentation.luteal.color}
            label={t('bloom.calendar.legend.luteal')}
            filled
          />
        </View>
        <View style={st.legendBottom}>
          <Legend
            color={colors.brand[400]}
            label={t('bloom.calendar.legend.today')}
            ring
          />
        </View>
      </Animated.View>

      {/* Undo toast — Modal root'unda, sheet'in üstünde absolute. Bu sayede
          kullanıcı month grid'ten mark/unmark ettiğinde de görür. */}
      {toastMessage && toastUndoLabel && onToastUndo && onToastDismiss && (
        <BloomUndoToast
          message={toastMessage}
          toastKey={toastKey}
          undoLabel={toastUndoLabel}
          onUndo={onToastUndo}
          onDismiss={onToastDismiss}
        />
      )}
    </Modal>
  );
}

// ── MonthDayCell ─────────────────────────────────────────────────────────────

const RING_SIZE = 36;

const ICON_SIZE = 13;

type IconTier = 'period' | 'predicted' | 'phaseOnly' | 'none';

function iconTierFor(cell: DayCell): IconTier {
  if (!cell.phase || !cell.isCurrentMonth) return 'none';
  if (cell.isPeriod) return 'period';
  if (cell.isPredicted) return 'predicted';
  return 'phaseOnly';
}

function MonthDayCell({
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
  const baseOpacity = !cell.isCurrentMonth ? 0.3 : cell.isFuture ? 0.55 : 1;

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
            { opacity: baseOpacity },
            cell.isToday && !isSelected && { color: colors.brand[200], fontWeight: '700' },
            isSelected && { color: colors.text.primary, fontWeight: '700' },
          ]}
        >
          {cell.dayOfMonth}
        </RNText>
      </View>

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

      {cell.isPeriod && presentation && cell.isCurrentMonth && (
        <View style={[st.periodBar, { backgroundColor: presentation.color }]} />
      )}
    </Pressable>
  );
}

function Legend({
  iconName,
  color,
  label,
  filled,
  ring,
}: {
  iconName?: ComponentProps<typeof Ionicons>['name'];
  color: string;
  label: string;
  filled?: boolean;
  ring?: boolean;
}) {
  return (
    <View style={st.legendItem}>
      {ring ? (
        <Svg width={14} height={14}>
          <Circle cx={7} cy={7} r={6} stroke={color} strokeWidth={1.5} strokeDasharray="2,2" fill="none" />
        </Svg>
      ) : iconName ? (
        <Ionicons
          name={iconName}
          size={12}
          color={color}
          style={{ opacity: filled ? 1 : 0.7 }}
        />
      ) : null}
      <RNText style={st.legendText}>{label}</RNText>
    </View>
  );
}

const st = StyleSheet.create({
  backdrop: {
    // Görsel olarak tamamen saydam — kullanıcı arkadaki Bloom anasayfasını
    // doğal görür. Sadece tap-to-close için tıklama alanı.
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'transparent',
  },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    // SHEET_HEIGHT runtime'da hesaplanır (SCREEN_H * RATIO). translateY
    // initial değeri ile aynı kaynaktan beslenir → hot reload uyumsuzluğu yok.
    height: SHEET_HEIGHT,
    backgroundColor: colors.brand[950],
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
  },
  dragZone: {
    // Geniş touch zone — handle + üst boşluk + biraz alt pay (May yazısının
    // üst yarısı dahil ~44px). Apple HIG min touch target = 44pt.
    width: '100%',
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    // Ölçek için: bg uncomment edip görsel kontrol edebilirsin
    // backgroundColor: 'rgba(255,0,0,0.15)',
  },
  handle: {
    width: 38,
    height: 5,
    borderRadius: 3,
    backgroundColor: 'rgba(168,158,200,0.55)',
  },
  tint: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 10, 26, 0.65)',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingTop: 4,   // dragZone zaten 44px üst boşluk verdi
    paddingBottom: 14,
  },
  monthLabel: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.text.primary,
    letterSpacing: -0.3,
    minWidth: 140,
    textAlign: 'center',
  },
  chev: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  weekdays: {
    flexDirection: 'row',
    paddingHorizontal: 8,
    paddingBottom: 6,
  },
  weekday: {
    flex: 1,
    textAlign: 'center',
    fontSize: 11,
    color: colors.text.muted,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  grid: {
    paddingHorizontal: 8,
  },
  row: {
    flexDirection: 'row',
  },
  cell: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 6,
  },
  numberWrap: {
    width: RING_SIZE,
    height: RING_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedRing: {
    position: 'absolute',
    width: RING_SIZE,
    height: RING_SIZE,
    borderRadius: RING_SIZE / 2,
    backgroundColor: colors.brand[500],
  },
  number: {
    fontSize: 15,
    color: colors.text.primary,
    fontWeight: '500',
  },
  iconRow: {
    height: 14,
    marginTop: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconPlaceholder: {
    width: 13,
    height: 13,
  },
  periodBar: {
    position: 'absolute',
    bottom: 3,
    width: 18,
    height: 2,
    borderRadius: 1,
    opacity: 0.55,
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: 14,
    paddingTop: 18,
    paddingHorizontal: 16,
  },
  legendBottom: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingTop: 8,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendText: {
    fontSize: 12,
    color: colors.text.secondary,
    fontWeight: '600',
  },
});

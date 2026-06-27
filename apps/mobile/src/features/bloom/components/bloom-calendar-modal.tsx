/**
 * BloomCalendarModal — full month grid as a native iOS bottom sheet.
 *
 * @expo/ui BottomSheet (UISheetPresentationController) + SwiftUI Grid +
 * SwiftUI ContextMenu. Sheet shell, drag-to-dismiss, handle bar, blur
 * backdrop hep system native — RN Modal/Animated/PanResponder/BlurView
 * tamamen kaldırıldı. Faz ikonları SF Symbol (Image systemName).
 *
 * Long-press → SwiftUI ContextMenu (sistem-native menü, ActionSheetIOS yerine).
 * Mark/unmark sonrası undo toast: sheet içeriğinin tepesine inline banner
 * (parent toastMessage state'ini sürer; 5s timer içeride).
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { StyleSheet } from 'react-native';
import * as Haptics from 'expo-haptics';
import {
  Host,
  BottomSheet,
  Group,
  VStack,
  HStack,
  ZStack,
  Grid,
  Button,
  Text,
  Image,
  Circle,
  Rectangle,
  Spacer,
  ContextMenu,
} from '@expo/ui/swift-ui';
import {
  font,
  foregroundStyle,
  opacity,
  frame,
  padding,
  cornerRadius,
  buttonStyle,
  background,
  tint,
  ignoreSafeArea,
  presentationDetents,
  presentationDragIndicator,
} from '@expo/ui/swift-ui/modifiers';
import type { ICycleProfile } from '@ai-therapist/types';
import { colors } from '@/constants/theme';
import { useTranslation, getLocale } from '@/i18n';
import { phasePresentation } from '../lib/phases';
import { useCurrentDate } from '../hooks/use-current-date';
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
  periodEndIso?: Set<string>;
  flowDayIso?: Set<string>;
  onMarkPeriodStart?: (date: Date) => Promise<boolean> | void;
  onUnmarkPeriodStart?: (date: Date) => Promise<boolean> | void;
  onMarkPeriodEnd?: (date: Date) => Promise<boolean> | void;
  onUnmarkPeriodEnd?: (date: Date) => Promise<boolean> | void;
  /** Inline banner across the top of the sheet so undo affordance is reachable
      when the user marked from the month grid. Parent owns state & key. */
  toastMessage?: string | null;
  toastKey?: string | number;
  toastUndoLabel?: string;
  onToastUndo?: () => void;
  onToastDismiss?: () => void;
}

const TOAST_VISIBLE_MS = 5000;

export function BloomCalendarModal({
  visible,
  onClose,
  profile,
  selectedDate,
  onSelectDate,
  periodStartIso,
  periodEndIso,
  flowDayIso,
  onMarkPeriodStart,
  onUnmarkPeriodStart,
  onMarkPeriodEnd,
  onUnmarkPeriodEnd,
  toastMessage,
  toastKey,
  toastUndoLabel,
  onToastUndo,
  onToastDismiss,
}: Props) {
  const { t } = useTranslation();
  const currentDate = useCurrentDate();
  const today = useMemo(() => toUtcMidnight(currentDate), [currentDate]);
  const withheld = useMemo(() => shouldWithholdPrediction(profile), [profile]);

  // Browse cursor: which month grid is shown
  const [cursor, setCursor] = useState<Date>(() => getMonthStart(selectedDate));

  // Auto-dismiss inline toast — RN BloomUndoToast'un timer'ı vardı, banner'ı
  // burada kendimiz sürdüğümüz için aynı davranışı koruyoruz.
  useEffect(() => {
    if (!toastMessage || !onToastDismiss) return;
    const timer = setTimeout(() => onToastDismiss(), TOAST_VISIBLE_MS);
    return () => clearTimeout(timer);
  }, [toastMessage, toastKey, onToastDismiss]);

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
        periodEndIso,
        flowDayIso,
      }),
    [cursor, profile, today, withheld, periodStartIso, periodEndIso, flowDayIso],
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
      // Close after a beat so the user sees the confirm before the sheet dismisses
      setTimeout(onClose, 120);
    },
    [onSelectDate, onClose],
  );

  const selectedIso = isoOf(selectedDate);

  return (
    <Host matchContents style={styles.host} colorScheme="dark">
      <BottomSheet
        isPresented={visible}
        onIsPresentedChange={(presented) => {
          if (!presented) onClose();
        }}
      >
        <Group
          modifiers={[
            presentationDetents([{ fraction: 0.7 }, 'large']),
            presentationDragIndicator('visible'),
          ]}
        >
          <VStack
            spacing={12}
            modifiers={[
              padding({ top: 8, bottom: 16 }),
              frame({ maxWidth: Infinity, maxHeight: Infinity }),
              background(colors.brand[950]),
              ignoreSafeArea({ edges: 'all' }),
            ]}
          >
            {/* Inline undo banner — sheet içinde, native HStack */}
            {toastMessage && toastUndoLabel && onToastUndo && (
              <HStack
                spacing={10}
                alignment="center"
                modifiers={[padding({ horizontal: 16, vertical: 4 })]}
              >
                <Image
                  systemName="checkmark.circle.fill"
                  size={18}
                  color={colors.brand[200]}
                />
                <Text modifiers={[font({ size: 14, weight: 'semibold' })]}>
                  {toastMessage}
                </Text>
                <Spacer />
                <Button
                  label={toastUndoLabel}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                    onToastUndo();
                  }}
                  modifiers={[buttonStyle('borderless')]}
                />
              </HStack>
            )}

            {/* Header — < Ay Yıl > */}
            <HStack spacing={8} alignment="center" modifiers={[padding({ horizontal: 16 })]}>
              <Button
                onPress={goPrevMonth}
                modifiers={[buttonStyle('borderless'), tint(colors.brand[300])]}
              >
                <Image systemName="chevron.left" size={20} color={colors.brand[300]} />
              </Button>
              <Spacer />
              <Text
                modifiers={[
                  font({ size: 17, weight: 'bold' }),
                  foregroundStyle(colors.text.primary),
                ]}
              >
                {monthName}
              </Text>
              <Spacer />
              <Button
                onPress={goNextMonth}
                modifiers={[buttonStyle('borderless'), tint(colors.brand[300])]}
              >
                <Image systemName="chevron.right" size={20} color={colors.brand[300]} />
              </Button>
            </HStack>

            {/* Weekday + grid — tek Grid'de hizalama garantili */}
            <Grid
              horizontalSpacing={0}
              verticalSpacing={4}
              modifiers={[padding({ horizontal: 8 })]}
            >
              <Grid.Row>
                {weekdayLabels.map((l, i) => (
                  <Text
                    key={`w-${i}`}
                    modifiers={[
                      font({ size: 11, weight: 'bold' }),
                      foregroundStyle(colors.text.muted),
                    ]}
                  >
                    {l.toUpperCase()}
                  </Text>
                ))}
              </Grid.Row>

              {grid.map((week, ri) => (
                <Grid.Row key={`r-${ri}`}>
                  {week.map((cell) => (
                    <MonthDayCell
                      key={cell.iso}
                      cell={cell}
                      isSelected={selectedIso === cell.iso}
                      onPress={() => handleDayPress(cell)}
                      onMarkPeriodStart={onMarkPeriodStart}
                      onUnmarkPeriodStart={onUnmarkPeriodStart}
                      onMarkPeriodEnd={onMarkPeriodEnd}
                      onUnmarkPeriodEnd={onUnmarkPeriodEnd}
                      periodStartIso={periodStartIso}
                      periodEndIso={periodEndIso}
                      t={t}
                    />
                  ))}
                </Grid.Row>
              ))}
            </Grid>

            {/* Legend — 4 faz + Today, tek satır */}
            <HStack
              spacing={12}
              alignment="center"
              modifiers={[padding({ top: 4, horizontal: 16 })]}
            >
              <LegendItem
                systemName={phasePresentation.menstrual.sfFill}
                color={phasePresentation.menstrual.color}
                label={t('bloom.calendar.legend.menstrual')}
              />
              <LegendItem
                systemName={phasePresentation.follicular.sfFill}
                color={phasePresentation.follicular.color}
                label={t('bloom.calendar.legend.follicular')}
              />
              <LegendItem
                systemName={phasePresentation.ovulation.sfFill}
                color={phasePresentation.ovulation.color}
                label={t('bloom.calendar.legend.ovulation')}
              />
              <LegendItem
                systemName={phasePresentation.luteal.sfFill}
                color={phasePresentation.luteal.color}
                label={t('bloom.calendar.legend.luteal')}
              />
              <HStack spacing={4} alignment="center">
                <Circle
                  modifiers={[
                    frame({ width: 8, height: 8 }),
                    foregroundStyle(colors.brand[200]),
                  ]}
                />
                <Text
                  modifiers={[
                    font({ size: 12, weight: 'semibold' }),
                    foregroundStyle(colors.text.secondary),
                  ]}
                >
                  {t('bloom.calendar.legend.today')}
                </Text>
              </HStack>
            </HStack>
          </VStack>
        </Group>
      </BottomSheet>
    </Host>
  );
}

// ── MonthDayCell ─────────────────────────────────────────────────────────────

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
  onMarkPeriodStart,
  onUnmarkPeriodStart,
  onMarkPeriodEnd,
  onUnmarkPeriodEnd,
  periodStartIso,
  periodEndIso,
  t,
}: {
  cell: DayCell;
  isSelected: boolean;
  onPress: () => void;
  onMarkPeriodStart?: (date: Date) => Promise<boolean> | void;
  onUnmarkPeriodStart?: (date: Date) => Promise<boolean> | void;
  onMarkPeriodEnd?: (date: Date) => Promise<boolean> | void;
  onUnmarkPeriodEnd?: (date: Date) => Promise<boolean> | void;
  periodStartIso?: Set<string>;
  periodEndIso?: Set<string>;
  t: (key: string) => string;
}) {
  const presentation = cell.phase ? phasePresentation[cell.phase] : null;
  const tier = iconTierFor(cell);
  const baseOpacity = !cell.isCurrentMonth ? 0.3 : cell.isFuture ? 0.55 : 1;

  const iconSystemName =
    tier === 'period' ? presentation?.sfFill
    : tier === 'predicted' || tier === 'phaseOnly' ? presentation?.sfOutline
    : undefined;
  const iconOpacity =
    tier === 'period' ? 1 : tier === 'predicted' ? 0.7 : tier === 'phaseOnly' ? 0.45 : 0;

  const numberColor =
    isSelected ? '#FFFFFF'
    : cell.isToday ? colors.brand[200]
    : colors.text.primary;
  const numberWeight: 'bold' | 'regular' =
    cell.isToday || isSelected ? 'bold' : 'regular';

  const isStartMarked = !!periodStartIso && periodStartIso.has(cell.iso);
  const isEndMarked = !!periodEndIso && periodEndIso.has(cell.iso);
  const canMark = !cell.isFuture;

  const dayButton = (
    <Button onPress={onPress} modifiers={[buttonStyle('plain')]}>
      <VStack spacing={2} alignment="center" modifiers={[padding({ vertical: 6 })]}>
        <ZStack alignment="center">
          {isSelected && (
            <Circle
              modifiers={[
                frame({ width: 30, height: 30 }),
                foregroundStyle(colors.brand[500]),
              ]}
            />
          )}
          <Text
            modifiers={[
              font({ size: 15, weight: numberWeight }),
              foregroundStyle(numberColor),
              opacity(baseOpacity),
            ]}
          >
            {String(cell.dayOfMonth)}
          </Text>
        </ZStack>

        {iconSystemName && presentation ? (
          <Image
            systemName={iconSystemName}
            size={11}
            color={presentation.color}
            modifiers={[opacity(iconOpacity)]}
          />
        ) : (
          <Rectangle modifiers={[frame({ width: 11, height: 11 }), opacity(0)]} />
        )}

        {cell.isPeriod && presentation && cell.isCurrentMonth ? (
          <Rectangle
            modifiers={[
              frame({ width: 16, height: 2 }),
              foregroundStyle(presentation.color),
              opacity(0.55),
              cornerRadius(1),
            ]}
          />
        ) : (
          <Rectangle modifiers={[frame({ width: 16, height: 2 }), opacity(0)]} />
        )}
      </VStack>
    </Button>
  );

  if (!canMark) return dayButton;

  return (
    <ContextMenu>
      <ContextMenu.Trigger>{dayButton}</ContextMenu.Trigger>
      <ContextMenu.Items>
        {isStartMarked && onUnmarkPeriodStart ? (
          <Button
            label={t('bloom.calendar.actions.unmarkPeriodStart')}
            systemImage="xmark.circle"
            role="destructive"
            onPress={() => void onUnmarkPeriodStart(cell.date)}
          />
        ) : (
          onMarkPeriodStart && (
            <Button
              label={t('bloom.calendar.actions.markPeriodStart')}
              systemImage="drop.fill"
              onPress={() => void onMarkPeriodStart(cell.date)}
            />
          )
        )}
        {isEndMarked && onUnmarkPeriodEnd ? (
          <Button
            label={t('bloom.calendar.actions.unmarkPeriodEnd')}
            systemImage="xmark.circle"
            role="destructive"
            onPress={() => void onUnmarkPeriodEnd(cell.date)}
          />
        ) : (
          onMarkPeriodEnd && (
            <Button
              label={t('bloom.calendar.actions.markPeriodEnd')}
              systemImage="checkmark.circle"
              onPress={() => void onMarkPeriodEnd(cell.date)}
            />
          )
        )}
      </ContextMenu.Items>
    </ContextMenu>
  );
}

function LegendItem({
  systemName,
  color,
  label,
}: {
  systemName: Parameters<typeof Image>[0]['systemName'];
  color: string;
  label: string;
}) {
  return (
    <HStack spacing={4} alignment="center">
      <Image systemName={systemName} size={12} color={color} />
      <Text
        modifiers={[
          font({ size: 12, weight: 'semibold' }),
          foregroundStyle(colors.text.secondary),
        ]}
      >
        {label}
      </Text>
    </HStack>
  );
}

const styles = StyleSheet.create({
  // Host matchContents pattern (region-mark-sheet ile aynı): RN ağacında yer
  // tutmasın diye 0×0, BottomSheet kendi window'unda native present edilir.
  host: {
    position: 'absolute',
    width: 0,
    height: 0,
  },
});

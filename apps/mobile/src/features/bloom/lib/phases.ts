import type { TCyclePhase } from '@ai-therapist/types';
import type { ComponentProps } from 'react';
import type { Ionicons } from '@expo/vector-icons';
import { colors } from '@/constants/theme';

type IoniconName = ComponentProps<typeof Ionicons>['name'];

/**
 * Phase → presentation tokens. Bloom'un kendi DNA'sı: doğa motifi.
 *   - menstrual:  💧 damla (akış, kanama)
 *   - follicular: 🌱 yaprak (büyüme, yenilenme; Bloom tab ikonuyla aynı dil)
 *   - ovulation:  ✨ parıltı (zirve, sparkle)
 *   - luteal:     🌙 hilal (içe dönüş, gece)
 *
 * Her faz için iki variant: solid (period günü) + outline (predicted / phase-only).
 * Emoji yerine Ionicons (RN system font fallback "?" sorunu — wiki:
 * feedback_lyra_ui_inject_verify).
 */
export const phasePresentation: Record<
  TCyclePhase,
  { color: string; iconFill: IoniconName; iconOutline: IoniconName }
> = {
  menstrual:  { color: '#C44A6E',            iconFill: 'water',    iconOutline: 'water-outline' },
  follicular: { color: colors.accent.growth, iconFill: 'leaf',     iconOutline: 'leaf-outline' },
  ovulation:  { color: colors.accent.warm,   iconFill: 'sparkles', iconOutline: 'sparkles-outline' },
  luteal:     { color: colors.brand[300],    iconFill: 'moon',     iconOutline: 'moon-outline' },
};

export function phaseI18nKey(phase: TCyclePhase): string {
  return `bloom.today.phase.${phase}`;
}

export function phaseSummaryI18nKey(phase: TCyclePhase): string {
  return `bloom.today.phaseSummary.${phase}`;
}

export function formatIsoDateShort(iso: string, locale: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString(locale === 'tr' ? 'tr-TR' : 'en-US', {
      month: 'short',
      day:   'numeric',
    });
  } catch {
    return iso;
  }
}

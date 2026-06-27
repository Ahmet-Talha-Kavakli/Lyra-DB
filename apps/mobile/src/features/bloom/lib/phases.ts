import type { TCyclePhase } from '@ai-therapist/types';
import type { ComponentProps } from 'react';
import type { Ionicons } from '@expo/vector-icons';
import type { SFSymbol } from 'sf-symbols-typescript';
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
 * iconFill/iconOutline = Ionicons (RN tarafı, hâlâ port edilmemiş ekranlar).
 * sfFill/sfOutline = SF Symbol (SwiftUI @expo/ui Image systemName).
 */
export const phasePresentation: Record<
  TCyclePhase,
  {
    color: string;
    iconFill: IoniconName;
    iconOutline: IoniconName;
    sfFill: SFSymbol;
    sfOutline: SFSymbol;
  }
> = {
  menstrual:  {
    color: '#C44A6E',
    iconFill: 'water',    iconOutline: 'water-outline',
    sfFill: 'drop.fill',  sfOutline: 'drop',
  },
  follicular: {
    color: colors.accent.growth,
    iconFill: 'leaf',     iconOutline: 'leaf-outline',
    sfFill: 'leaf.fill',  sfOutline: 'leaf',
  },
  ovulation:  {
    color: colors.accent.warm,
    iconFill: 'sparkles', iconOutline: 'sparkles-outline',
    // sparkles için SF outline variant yok; ikisi de aynı (opacity ile ayırıyoruz).
    sfFill: 'sparkles',   sfOutline: 'sparkles',
  },
  luteal:     {
    color: colors.brand[300],
    iconFill: 'moon',     iconOutline: 'moon-outline',
    sfFill: 'moon.fill',  sfOutline: 'moon',
  },
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

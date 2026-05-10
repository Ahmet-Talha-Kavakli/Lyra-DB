/**
 * Minimal i18n helper for Lyra mobile.
 *
 * - Default English (`en`); switchable to `tr`.
 * - `t('bloom.today.dayLabel', { day: 18 })` resolves nested keys + interpolates `{{var}}`.
 * - Locale comes from device (`expo-localization`) at app start; can be overridden
 *   via `setLocale()` for in-app language toggle (Settings, future).
 *
 * No npm dependency. Bloom-first; other modules can migrate when they need it.
 */
import { useSyncExternalStore } from 'react';
import { NativeModules, Platform } from 'react-native';
import en from './en.json';
import tr from './tr.json';

type Locale = 'en' | 'tr';
type Bundle = typeof en;

const bundles: Record<Locale, Bundle> = { en, tr: tr as Bundle };

let currentLocale: Locale = pickInitial();
const listeners = new Set<() => void>();

function pickInitial(): Locale {
  try {
    const raw =
      Platform.OS === 'ios'
        ? NativeModules.SettingsManager?.settings?.AppleLocale ??
          NativeModules.SettingsManager?.settings?.AppleLanguages?.[0]
        : NativeModules.I18nManager?.localeIdentifier;
    if (typeof raw === 'string' && raw.toLowerCase().startsWith('tr')) return 'tr';
  } catch {
    // ignore — fall through to default
  }
  return 'en';
}

export function getLocale(): Locale {
  return currentLocale;
}

export function setLocale(next: Locale) {
  if (next === currentLocale) return;
  currentLocale = next;
  listeners.forEach((l) => l());
}

function resolve(bundle: any, key: string): string | undefined {
  return key.split('.').reduce((acc: any, part) => (acc == null ? acc : acc[part]), bundle);
}

function interpolate(template: string, vars?: Record<string, string | number>): string {
  if (!vars) return template;
  return template.replace(/\{\{(\w+)\}\}/g, (_, name) =>
    vars[name] != null ? String(vars[name]) : `{{${name}}}`,
  );
}

/** Module-level translator. Useful outside React (services, helpers). */
export function t(key: string, vars?: Record<string, string | number>): string {
  const found =
    resolve(bundles[currentLocale], key) ?? resolve(bundles.en, key) ?? key;
  return typeof found === 'string' ? interpolate(found, vars) : key;
}

/** Hook for components — re-renders on locale change. */
export function useTranslation() {
  const locale = useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => currentLocale,
    () => currentLocale,
  );
  return { t, locale, setLocale };
}

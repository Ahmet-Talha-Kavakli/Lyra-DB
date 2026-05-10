/**
 * Lyra Design Tokens
 * Single source of truth for colors, spacing, and typography
 * Used by both NativeWind (tailwind.config.js) and programmatic styling
 */

export const colors = {
  brand: {
    50: '#F0ECFB',
    100: '#DDD5F6',
    200: '#BBA9ED',
    300: '#9A7DE4',
    400: '#7B55DB',
    500: '#6237C9',
    600: '#4E2CA1',
    700: '#3B2179',
    800: '#271651',
    900: '#140B28',
    950: '#0F0A1A',
  },
  surface: {
    primary: '#1A1128',
    secondary: '#231838',
    tertiary: '#2D1F48',
  },
  accent: {
    warm: '#E8A87C',
    calm: '#7EC8E3',
    growth: '#82D9A5',
    alert: '#E87C7C',
  },
  text: {
    primary: '#F5F3FF',
    secondary: '#A89EC8',
    muted: '#6B5E8A',
  },
  white: '#FFFFFF',
  black: '#000000',
  transparent: 'transparent',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  '2xl': 48,
  '3xl': 64,
} as const;

export const borderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
} as const;

export const fontSize = {
  xs: 12,
  sm: 14,
  base: 16,
  lg: 18,
  xl: 20,
  '2xl': 24,
  '3xl': 30,
  '4xl': 36,
} as const;

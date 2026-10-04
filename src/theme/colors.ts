// src/theme/colors.ts
// Centralized color palette (Harapan Broiler "farm green" brand). Every screen
// imports from here — no raw hex scattered through components.

export const palette = {
  // Brand greens (emerald)
  green900: '#14532D',
  green800: '#166534',
  green700: '#15803D',
  green600: '#16A34A',
  green500: '#22C55E',
  green300: '#6EE7B7',
  green100: '#D1FAE5',
  green50: '#ECFDF5',

  // Neutrals
  white: '#FFFFFF',
  ink900: '#12210F',
  ink700: '#33421F',
  slate700: '#37474F',
  slate500: '#64748B',
  slate400: '#90A4AE',
  slate200: '#E2E8F0',
  slate100: '#EEF2F1',
  cloud: '#F4F7F4',

  // Softer, warmer neutrals for the "soft minimal" surface system.
  surfaceBorder: '#E9EFEA',
  hairline: '#EFF3EF',

  // Status / semantic
  success: '#15803D',
  successBg: '#D1FAE5',
  warning: '#EF6C00',
  warningBg: '#FFF3E0',
  danger: '#D32F2F',
  dangerBg: '#FFEBEE',
  info: '#1976D2',
  infoBg: '#E3F2FD',
} as const;

// Semantic roles consumed by the app + Paper theme.
export const colors = {
  primary: palette.green700,
  primaryDark: palette.green900,
  primaryLight: palette.green500,
  accent: palette.green500,

  background: palette.cloud,
  surface: palette.white,
  surfaceMuted: palette.green50,

  text: palette.ink900,
  textSecondary: palette.slate500,
  textMuted: palette.slate400,
  textInverse: palette.white,

  border: palette.surfaceBorder,
  divider: palette.hairline,

  danger: palette.danger,

  // Header gradient (used across auth + app bars)
  gradientStart: palette.green900,
  gradientMid: palette.green700,
  gradientEnd: palette.green600,
} as const;

export const paymentStatusColors: Record<
  string,
  { bg: string; text: string }
> = {
  Lunas: { bg: palette.successBg, text: palette.success },
  Sebagian: { bg: palette.warningBg, text: palette.warning },
  'Belum Lunas': { bg: palette.dangerBg, text: palette.danger },
};

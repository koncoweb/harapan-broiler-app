// src/theme/typography.ts
// A single, opinionated type scale for the whole app. Instead of ad-hoc
// `fontSize` / `fontWeight` sprinkled through every screen, components pull a
// named style from `type` below. Sizes follow a modular ramp anchored on a 14pt
// body; weights are limited to 400/500/600/700/800 for a clean hierarchy.
import { TextStyle } from 'react-native';

// Raw weights (kept as a const so call sites stay readable).
export const weights = {
  regular: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
  extrabold: '800',
} as const;

// Numeric figures (weights, currency) align best with tabular figures.
const tabular = { fontVariant: ['tabular-nums'] as ('tabular-nums')[] };

// Modular size ramp.
export const sizes = {
  xs: 11,
  sm: 12,
  md: 13,
  base: 14,
  lg: 15,
  xl: 16,
  xxl: 18,
  xxxl: 20,
  display: 22,
  displayLg: 26,
} as const;

// Semantic type roles consumed across screens + Paper theme.
export const type = {
  // App-bar / screen titles (gradient headers).
  screenTitle: {
    fontSize: sizes.display,
    fontWeight: weights.extrabold,
    letterSpacing: 0.2,
    lineHeight: 28,
  } as TextStyle,

  // Section headers ("AKTIVITAS TERAKHIR", "Filter Data", "$ HARGA").
  sectionTitle: {
    fontSize: sizes.xl,
    fontWeight: weights.extrabold,
    letterSpacing: 0.4,
  } as TextStyle,

  // Small uppercase eyebrow / field labels.
  label: {
    fontSize: sizes.sm,
    fontWeight: weights.bold,
    letterSpacing: 0.5,
  } as TextStyle,

  // Card titles (buyer names, list items).
  cardTitle: {
    fontSize: sizes.xl,
    fontWeight: weights.bold,
    letterSpacing: 0.1,
  } as TextStyle,

  // Compact card titles where space is tight.
  cardTitleSm: {
    fontSize: sizes.base,
    fontWeight: weights.bold,
  } as TextStyle,

  // Supporting text under a title.
  subtitle: {
    fontSize: sizes.md,
    fontWeight: weights.regular,
  } as TextStyle,

  // Body copy.
  body: {
    fontSize: sizes.base,
    fontWeight: weights.regular,
  } as TextStyle,

  bodyStrong: {
    fontSize: sizes.base,
    fontWeight: weights.semibold,
  } as TextStyle,

  // Secondary / helper text.
  caption: {
    fontSize: sizes.sm,
    fontWeight: weights.regular,
  } as TextStyle,

  micro: {
    fontSize: sizes.xs,
    fontWeight: weights.medium,
  } as TextStyle,

  // Overline / all-caps kickers.
  overline: {
    fontSize: sizes.xs,
    fontWeight: weights.bold,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  } as TextStyle,

  // Numeric data — prices, weights, totals.
  numericLg: {
    fontSize: sizes.display,
    fontWeight: weights.extrabold,
    ...tabular,
  } as TextStyle,

  numericMd: {
    fontSize: sizes.xl,
    fontWeight: weights.extrabold,
    ...tabular,
  } as TextStyle,

  numericSm: {
    fontSize: sizes.base,
    fontWeight: weights.bold,
    ...tabular,
  } as TextStyle,

  // Button / CTA labels.
  buttonLabel: {
    fontSize: sizes.lg,
    fontWeight: weights.extrabold,
    letterSpacing: 0.5,
  } as TextStyle,
} as const;

// Backwards-compatible alias used by some inline styles.
export const tabularNums = tabular;

// src/theme/layout.ts
// Spacing, radii, and elevation tokens. Following the native-design guidance:
// use CSS `boxShadow` (not legacy elevation), continuous border curve, and a
// consistent 4pt spacing scale.

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 22,
  xxl: 32,
} as const;

export const radius = {
  sm: 12,
  md: 16,
  lg: 22,
  xl: 30,
  pill: 999,
} as const;

// Rounded corners should use a continuous curve for a more native feel.
export const baseCurve = { borderRadius: radius.md, borderCurve: 'continuous' as const };

// Soft, diffuse, layered shadows (RN 0.71+ `boxShadow` string syntax). Tuned for
// the "soft minimal" look: low opacity, wide blur, gentle ambient + key light.
export const shadows = {
  none: 'none',
  card: '0 1px 1px rgba(18, 33, 15, 0.03), 0 4px 14px rgba(18, 33, 15, 0.05), 0 12px 30px rgba(18, 33, 15, 0.05)',
  raised: '0 2px 6px rgba(18, 33, 15, 0.06), 0 14px 36px rgba(18, 33, 15, 0.12)',
  fab: '0 8px 22px rgba(22, 163, 74, 0.34)',
  header: '0 8px 28px rgba(20, 83, 45, 0.22)',
} as const;

// Numeric data (weights, currency) align best with tabular figures.
export const tabularNums = { fontVariant: ['tabular-nums'] as ('tabular-nums')[] };

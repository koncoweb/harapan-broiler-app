// src/theme/paperTheme.ts
// Material Design 3 theme for React Native Paper, derived from our tokens so the
// whole app shares one design language (colors, radii, type scale).
import { MD3LightTheme } from 'react-native-paper';
import { colors, palette } from './colors';
import { radius } from './layout';
import { sizes, weights } from './typography';

// Patch Paper's MD3 typescale so the built-in `variant` props (used by Button,
// TextInput labels, etc.) line up with our own `type` scale.
const base = MD3LightTheme.fonts;
const paperFonts = {
  ...base,
  titleLarge: { ...base.titleLarge, fontSize: sizes.xxxl, fontWeight: weights.extrabold, letterSpacing: 0.2 },
  titleMedium: { ...base.titleMedium, fontSize: sizes.lg, fontWeight: weights.extrabold, letterSpacing: 0.5 },
  bodyLarge: { ...base.bodyLarge, fontSize: sizes.lg, fontWeight: weights.regular },
  bodyMedium: { ...base.bodyMedium, fontSize: sizes.base, fontWeight: weights.regular },
  labelLarge: { ...base.labelLarge, fontSize: sizes.lg, fontWeight: weights.bold, letterSpacing: 0.5 },
};

export const paperTheme = {
  ...MD3LightTheme,
  roundness: radius.md,
  fonts: paperFonts,
  colors: {
    ...MD3LightTheme.colors,
    primary: colors.primary,
    primaryContainer: palette.green100,
    onPrimary: colors.textInverse,
    onPrimaryContainer: colors.primaryDark,
    secondary: colors.accent,
    secondaryContainer: palette.green100,
    background: colors.background,
    surface: colors.surface,
    surfaceVariant: palette.green50,
    onSurface: colors.text,
    onSurfaceVariant: colors.textSecondary,
    elevation: {
      ...MD3LightTheme.colors.elevation,
      level1: colors.surface,
      level2: colors.surface,
      level3: colors.surface,
    },
    outline: colors.border,
    outlineVariant: colors.divider,
    error: colors.danger,
    // Keep the app-bar / scrim text legible on the green header.
    backdrop: 'rgba(0,0,0,0.4)',
  },
};

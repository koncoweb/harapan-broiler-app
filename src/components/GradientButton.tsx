// src/components/GradientButton.tsx
// Prominent gradient CTA with a tactile press. Shared across auth + primary
// actions so the app has one consistent "main button" look.
import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, ViewStyle } from 'react-native';
import { Text } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, radius, shadows } from '../theme';
import { haptic } from '../theme/haptics';

type Props = {
  label: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  icon?: React.ReactNode;
  style?: ViewStyle;
  colors?: readonly [string, string, ...string[]];
};

export default function GradientButton({
  label,
  onPress,
  loading,
  disabled,
  icon,
  style,
  colors: gradientColors,
}: Props) {
  const isDisabled = disabled || loading;
  return (
    <LinearGradient
      colors={(gradientColors ?? [colors.primaryDark, colors.primaryLight]) as [string, string]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 0 }}
      style={[
        styles.base,
        { opacity: isDisabled ? 0.6 : 1, boxShadow: shadows.fab },
        style,
      ]}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        disabled={isDisabled}
        onPressIn={() => haptic.light()}
        onPress={onPress}
        style={({ pressed }) => [styles.pressable, pressed && { transform: [{ scale: 0.99 }] }]}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <>
            {icon}
            <Text
              style={styles.label}
              variant="titleMedium"
              numberOfLines={1}
            >
              {label.toUpperCase()}
            </Text>
          </>
        )}
      </Pressable>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.md,
    borderCurve: 'continuous',
    overflow: 'hidden',
  },
  pressable: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 20,
  },
  label: {
    color: '#fff',
    fontWeight: '800',
    letterSpacing: 0.5,
  },
});

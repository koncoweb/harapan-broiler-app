// src/theme/haptics.ts
// Thin, safe wrappers around expo-haptics for tactile feedback. Silently no-ops
// where unsupported (e.g. web) so call sites stay clean.
import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

const supported = Platform.OS === 'ios' || Platform.OS === 'android';

export const haptic = {
  tap() {
    if (supported) Haptics.selectionAsync().catch(() => {});
  },
  light() {
    if (supported)
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  },
  medium() {
    if (supported)
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
  },
  success() {
    if (supported) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
  },
  error() {
    if (supported) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
  },
};

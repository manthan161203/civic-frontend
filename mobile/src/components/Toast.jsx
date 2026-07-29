import React, { useEffect, useRef } from 'react';
import { View, Text, Animated, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useUiStore } from '../store/uiStore';
import { Colors, Typography, Radius, Spacing, Shadow } from '../theme';
import haptics from '../lib/haptics';

/**
 * Transient messages.
 *
 * Three things were wrong with the previous version:
 *
 *  1. **Pinned at `bottom: 20`**, so on any device with a tab bar it appeared
 *     behind the tabs, and on a gesture-navigation device it sat under the home
 *     indicator. It now clears both.
 *  2. **No icon and no dismiss.** A success and an error were the same shape in
 *     different colours, which is unreadable to anyone with a colour-vision
 *     deficiency and unreadable to everyone in bright sun.
 *  3. **Unbounded.** Every queued toast rendered at once; a form that failed
 *     validation on four fields stacked four overlapping banners.
 */

/** Above this many, the oldest are dropped rather than stacked. */
const MAX_VISIBLE = 3;

/** Tab-bar height plus a gap. Toasts are shown over tabbed screens. */
const TAB_BAR_CLEARANCE = 64;

const VARIANTS = {
  success: { color: Colors.success, icon: 'checkmark-circle' },
  error: { color: Colors.danger, icon: 'alert-circle' },
  warning: { color: Colors.warning, icon: 'warning' },
  info: { color: Colors.info, icon: 'information-circle' },
};

export default function Toast() {
  const { toasts, removeToast } = useUiStore();
  const insets = useSafeAreaInsets();

  // Newest first, capped. Older ones are dropped rather than allowed to stack
  // off the top of the screen.
  const visible = toasts.slice(-MAX_VISIBLE);

  if (visible.length === 0) return null;

  return (
    <View
      pointerEvents="box-none"
      style={[
        styles.container,
        { bottom: insets.bottom + TAB_BAR_CLEARANCE },
      ]}
    >
      {visible.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onDismiss={() => removeToast(toast.id)} />
      ))}
    </View>
  );
}

function ToastItem({ toast, onDismiss }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(12)).current;
  const variant = VARIANTS[toast.type] ?? VARIANTS.info;

  useEffect(() => {
    // A toast is an outcome the user did not directly trigger at this instant,
    // so it gets the notification haptic rather than an impact.
    //
    // This component is the *only* place a toast haptic fires. `notify.*` in
    // src/lib/notify.js deliberately does not, because a helper that buzzed and
    // then queued a toast that also buzzed produced a double pulse that reads as
    // a different, more urgent event than either one alone.
    //
    // `info` stays silent on purpose: neutral news is not worth interrupting a
    // thumb for, and haptics people do not want are haptics people switch off.
    if (toast.type === 'error') haptics.error();
    else if (toast.type === 'success') haptics.success();
    else if (toast.type === 'warning') haptics.warning();

    const animation = Animated.sequence([
      Animated.parallel([
        Animated.timing(opacity, { toValue: 1, duration: 220, useNativeDriver: true }),
        Animated.spring(translateY, { toValue: 0, useNativeDriver: true, speed: 16, bounciness: 4 }),
      ]),
      Animated.delay(Math.max(2000, toast.duration || 3000)),
      Animated.timing(opacity, { toValue: 0, duration: 220, useNativeDriver: true }),
    ]);
    animation.start(({ finished }) => {
      if (finished) onDismiss();
    });

    // Stop the animation if the user dismisses first, or the callback fires
    // against an unmounted component.
    return () => animation.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Animated.View
      style={[styles.toast, { opacity, transform: [{ translateY }] }]}
      accessibilityLiveRegion="polite"
      accessibilityRole="alert"
    >
      <Ionicons name={variant.icon} size={18} color={variant.color} />
      <Text style={styles.text} numberOfLines={3}>
        {toast.message}
      </Text>
      <TouchableOpacity
        onPress={onDismiss}
        hitSlop={10}
        accessibilityRole="button"
        accessibilityLabel="Dismiss"
      >
        <Ionicons name="close" size={16} color={Colors.textLight} />
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: Spacing.md,
    right: Spacing.md,
    zIndex: 9999,
    gap: Spacing.sm,
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    // A light surface with a coloured icon, rather than a saturated block with
    // white text: it stays legible in sunlight and does not rely on hue alone
    // to carry the meaning.
    backgroundColor: Colors.white,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: Radius.md,
    ...Platform.select({ android: { elevation: 6 }, default: Shadow.md }),
  },
  text: {
    flex: 1,
    color: Colors.textPrimary,
    fontSize: Typography.base,
    fontWeight: Typography.medium,
  },
});

/**
 * The failure state, with a way out of it.
 *
 * `(citizen)/map.jsx` was the **only** screen in the app with a retry button.
 * Everywhere else a failed load either raised a blocking `Alert.alert` (87 call
 * sites across 15 files) or was swallowed into `console.warn` and rendered as
 * an empty list — so "the request failed" and "there is nothing here" looked
 * identical, and neither offered a way to try again.
 *
 * This is that map screen's pattern, made shared and taught two things it did
 * not know:
 *
 *  - **Offline is not an error.** If the device has no connection, saying
 *    "something went wrong" is wrong and "Try again" is a lie. It says so, and
 *    offers retry only once connectivity is back.
 *  - **403 is not a malfunction.** A worker opening a task outside their
 *    assignment gets a plain explanation, not a red alarm.
 */

import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Radius, Spacing } from '../theme';
import { toApiError } from '../api/errors';
import { useNetworkStatus } from '../hooks/useNetworkStatus';
import haptics from '../lib/haptics';

/**
 * @param {{ error: unknown, onRetry?: () => void, compact?: boolean,
 *           accent?: string }} props
 */
export default function ErrorState({ error, onRetry, compact = false, accent = Colors.citizen }) {
  const { isOffline } = useNetworkStatus();
  const apiError = toApiError(error);

  const forbidden = apiError.kind === 'forbidden';
  // The transport's own classification, or the radio — either is enough to know
  // that retrying right now cannot work.
  const offline = isOffline || apiError.kind === 'network';

  const { icon, title, message, tone } = forbidden
    ? {
        icon: 'lock-closed-outline',
        title: 'Not available to you',
        message: 'This belongs to someone else, or to another area.',
        tone: Colors.textMuted,
      }
    : offline
      ? {
          icon: 'cloud-offline-outline',
          title: "You're offline",
          message: 'This will load as soon as you have a connection.',
          tone: Colors.warning,
        }
      : {
          icon: 'alert-circle-outline',
          title: 'Could not load this',
          message: apiError.message,
          tone: Colors.danger,
        };

  // Retry is offered only when it could plausibly succeed. A retry button on a
  // 403, or while the radio is down, teaches people the button does nothing.
  const canRetry = Boolean(onRetry) && !forbidden && !offline;

  return (
    <View style={[styles.wrap, compact && styles.wrapCompact]}>
      <Ionicons name={icon} size={compact ? 32 : 44} color={tone} />
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.message}>{message}</Text>

      {canRetry && (
        <TouchableOpacity
          style={[styles.retry, { backgroundColor: accent }]}
          onPress={() => {
            haptics.tap();
            onRetry();
          }}
          accessibilityRole="button"
          accessibilityLabel="Try again"
        >
          <Ionicons name="refresh" size={15} color={Colors.white} />
          <Text style={styles.retryText}>Try again</Text>
        </TouchableOpacity>
      )}

      {/* The header that lets someone quote a failure to whoever runs the
          backend. ApiError carries it from the X-Request-ID response header. */}
      {apiError.requestId && !offline && (
        <Text style={styles.reference}>Reference {apiError.requestId}</Text>
      )}
    </View>
  );
}

/**
 * "Nothing here" — deliberately a different component from the one above, so a
 * screen cannot accidentally present a failure as an empty result.
 *
 * @param {{ icon?: string, title: string, message?: string,
 *           action?: { label: string, onPress: () => void }, accent?: string }} props
 */
export function EmptyState({ icon = 'file-tray-outline', title, message, action, accent = Colors.citizen }) {
  return (
    <View style={styles.wrap}>
      <Ionicons name={icon} size={44} color={Colors.textDisabled} />
      <Text style={styles.title}>{title}</Text>
      {message && <Text style={styles.message}>{message}</Text>}

      {action && (
        <TouchableOpacity
          style={[styles.retry, { backgroundColor: accent }]}
          onPress={() => {
            haptics.tap();
            action.onPress();
          }}
          accessibilityRole="button"
        >
          <Text style={styles.retryText}>{action.label}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing['2xl'],
    paddingVertical: 48,
    gap: Spacing.sm,
  },
  wrapCompact: { flex: 0, paddingVertical: Spacing['2xl'] },
  title: {
    fontSize: Typography.lg,
    fontWeight: Typography.semibold,
    color: Colors.textPrimary,
    marginTop: Spacing.sm,
    textAlign: 'center',
  },
  message: {
    fontSize: Typography.base,
    color: Colors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 300,
  },
  retry: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: Radius.md,
    marginTop: Spacing.md,
    // 44pt minimum touch target — the HIG floor, and Material's 48dp is close
    // enough that one number serves both.
    minHeight: 44,
  },
  retryText: {
    color: Colors.white,
    fontSize: Typography.base,
    fontWeight: Typography.semibold,
  },
  reference: {
    fontSize: Typography.xs,
    color: Colors.textLight,
    marginTop: Spacing.md,
  },
});

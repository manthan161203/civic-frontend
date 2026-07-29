/**
 * Haptic feedback.
 *
 * The app had none. The only tactile signal anywhere was a single
 * `Vibration.vibrate([0, 200, 100, 200])` on the SOS button — a 500 ms buzz
 * pattern, which is a notification, not a haptic. Tapping a tab, upvoting,
 * submitting a report and failing a form all felt identical: like nothing.
 *
 * This wraps `expo-haptics` so call sites express *what happened*, not which
 * engine constant to use. That matters because the mapping is not obvious —
 * `notificationAsync(Success)` and `impactAsync(Light)` are different sensations
 * with different meanings, and picking per call site is how an app ends up
 * feeling arbitrary.
 *
 * ── Rules this encodes ───────────────────────────────────────────────────────
 *
 * - **Selection** for changing what is highlighted: tabs, filter chips, list
 *   pickers. The lightest thing the engine can do.
 * - **Impact** for a committed action: submit, upvote, accept a task.
 * - **Notification** for an outcome the user did not directly cause at that
 *   instant: a save succeeding, a validation error appearing.
 * - **Never on scroll, never on every keystroke, never twice for one action.**
 *   Over-haptics is worse than none — people turn the setting off, and then the
 *   ones that matter are gone too.
 *
 * Every call is fire-and-forget. Haptics are unavailable on some Android
 * hardware and always absent in a simulator, and a rejected promise there must
 * never surface as an error in a submit handler.
 */

import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

/**
 * Android's haptic engine is coarser and some devices have none at all. The
 * calls are still made — Expo degrades gracefully — but this is the flag to
 * flip if user testing says Android feels noisy.
 */
const ENABLED = Platform.OS === 'ios' || Platform.OS === 'android';

/** @param {() => Promise<unknown>} fn */
function fire(fn) {
  if (!ENABLED) return;
  // Deliberately swallowed. A missing vibrator must not fail the action the
  // user actually asked for.
  fn().catch(() => {});
}

export const haptics = {
  /** Highlight moved: tab change, filter chip, picker row. */
  selection: () => fire(() => Haptics.selectionAsync()),

  /** A light, committed tap: upvote, toggle, secondary action. */
  tap: () => fire(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)),

  /** A primary action landing: submit a report, accept a task. */
  press: () => fire(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)),

  /** Something significant and irreversible: resolve, delete, SOS. */
  heavy: () => fire(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)),

  /** An operation completed. Distinct from `press`, which is the button. */
  success: () => fire(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)),

  /** Validation failed, or a request errored. */
  error: () => fire(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)),

  /** A destructive confirmation is being asked for. */
  warning: () => fire(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)),
};

export default haptics;

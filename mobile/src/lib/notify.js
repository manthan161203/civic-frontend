import { Alert } from 'react-native';

import { useUiStore } from '../store/uiStore';
import { getErrorMessage } from '../api/errors';
import haptics from './haptics';

/**
 * Telling the user something happened.
 *
 * The app had 96 `Alert.alert` calls, and the great majority of them were
 * announcements rather than questions: "Success", "Error", "Profile updated".
 * On a phone that is the wrong instrument. A system alert:
 *
 *   - **blocks the app** until it is dismissed, so a failed background refresh
 *     stops whatever the user was doing to demand a tap;
 *   - **stacks**, and on Android a second alert can replace the first before it
 *     has been read;
 *   - **cannot be ignored**, which is exactly what you want for "delete your
 *     account?" and exactly what you do not want for "couldn't refresh".
 *
 * So: `notify.*` for anything the user does not have to answer, and `confirm()`
 * for the handful of questions that genuinely need a modal. Keeping alerts rare
 * is what keeps them meaningful — an app that alerts on every save teaches
 * people to dismiss without reading, which is how the delete-account dialog
 * gets tapped through.
 *
 * Every helper is callable outside React, via `useUiStore.getState()`, because
 * most call sites are inside `catch` blocks in plain async functions rather than
 * in render.
 */

/*
 * No haptics here on purpose. `ToastItem` fires one when it mounts, keyed off
 * the toast's own type, so buzzing here too produced a double pulse that felt
 * like a different and more urgent event than either alone. The component that
 * appears owns the feedback.
 */
const toast = (message, type, duration) => {
  useUiStore.getState().addToast(message, type, duration);
};

export const notify = {
  /** A thing the user asked for, and got. */
  success: (message, duration = 3000) => toast(message, 'success', duration),

  /**
   * Something failed. Longer by default than a success — you need time to read
   * a failure, and there is usually nothing left on screen that explains it.
   */
  error: (message, duration = 5000) => toast(message, 'error', duration),

  /** Worked, but not the way they expected. Queued offline, partial result. */
  warn: (message, duration = 4000) => toast(message, 'warning', duration),

  /** Neutral news. */
  info: (message, duration = 3000) => toast(message, 'info', duration),
};

/**
 * The `catch` block's version of `notify.error`.
 *
 * Unwraps whatever the API layer threw into a sentence, so call sites stop
 * writing `err.response?.data?.detail || 'Failed'` — a chain that was repeated
 * 40-odd times and reliably produced the bare word "Failed" whenever the server
 * answered with something other than `detail`.
 *
 * @param {unknown} error
 * @param {string} fallback what to say when the server gave nothing usable
 */
export function notifyError(error, fallback) {
  notify.error(getErrorMessage(error, fallback));
}

/**
 * A yes/no the user must answer, as a promise.
 *
 * `Alert.alert` is callback-based, which is why every confirmation in this app
 * was written as a nested closure with its own copy of the work to be done. As
 * a promise it reads in the order it happens:
 *
 *     if (!(await confirm({ title: 'Delete?', destructive: true }))) return;
 *     await api.delete(id);
 *
 * @param {{ title: string, message?: string, confirmLabel?: string,
 *           cancelLabel?: string, destructive?: boolean }} options
 * @returns {Promise<boolean>}
 */
export function confirm({
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  destructive = false,
}) {
  return new Promise((resolve) => {
    let settled = false;
    const settle = (value) => {
      // Android fires `onDismiss` *in addition to* the button handler, so
      // without this guard the promise's second resolve would be dropped
      // silently — harmless today, but it hides double-invocation bugs.
      if (settled) return;
      settled = true;
      resolve(value);
    };

    if (destructive) haptics.warning();

    Alert.alert(
      title,
      message,
      [
        { text: cancelLabel, style: 'cancel', onPress: () => settle(false) },
        {
          text: confirmLabel,
          style: destructive ? 'destructive' : 'default',
          onPress: () => settle(true),
        },
      ],
      // Back-button dismissal on Android must mean "no", not "hang forever".
      { cancelable: true, onDismiss: () => settle(false) },
    );
  });
}

export default notify;

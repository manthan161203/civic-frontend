/**
 * Secure token storage.
 *
 * ── Why expo-secure-store rather than react-native-keychain ──────────────────
 *
 * They provide the same guarantee. `expo-secure-store` writes to the **iOS
 * Keychain** (`kSecClassGenericPassword`) and, on **Android**, to
 * SharedPreferences encrypted with an AES key held in the **Android Keystore**.
 * That is precisely what react-native-keychain does; the difference is packaging.
 *
 * Adding react-native-keychain here would cost more than it returns:
 *
 *   - it is not in the Expo Go runtime, so every developer would need a custom
 *     dev client before they could run the app at all;
 *   - `expo-secure-store` is already installed, already listed as a config
 *     plugin, and already holds this app's tokens — swapping means a migration
 *     path for anyone with an existing session;
 *   - two storage mechanisms is worse than one, and the security property is
 *     identical.
 *
 * If you specifically want react-native-keychain — for biometric-gated access,
 * say, which SecureStore exposes more narrowly — that is a real reason and the
 * swap belongs behind this module's interface. Nothing above it would change.
 *
 * ── What this module adds over the raw SDK ───────────────────────────────────
 *
 *   - `WHEN_UNLOCKED_THIS_DEVICE_ONLY`, so tokens never sync to iCloud Keychain
 *     and never restore onto a different handset from a backup;
 *   - a single place that knows the key names;
 *   - honest behaviour on web, which is not a secure platform and should not
 *     pretend otherwise.
 */

import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

/**
 * Web detection.
 *
 * Deliberately `Platform.OS` alone. The previous shim also accepted
 * `typeof window.localStorage !== 'undefined'`, which is a trap: `window` exists
 * on React Native, so any polyfill defining `localStorage` would have silently
 * routed real tokens on a real device into insecure storage.
 */
const IS_WEB = Platform.OS === 'web';

/**
 * iOS Keychain accessibility.
 *
 * `WHEN_UNLOCKED_THIS_DEVICE_ONLY` means the item is readable only while the
 * device is unlocked, and is excluded from encrypted backups and iCloud
 * Keychain — so a restored backup cannot resurrect a live session on another
 * device. The default (`WHEN_UNLOCKED`) does sync, which for an auth token is
 * more sharing than anyone intends.
 */
const NATIVE_OPTIONS = {
  keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
};

let warnedAboutWeb = false;

function webWarnOnce() {
  if (warnedAboutWeb || !__DEV__) return;
  warnedAboutWeb = true;
  console.warn(
    '[secureStorage] Running on web: tokens are held in sessionStorage, which is ' +
      'readable by any script on the origin. There is no browser equivalent of the ' +
      'Keychain. Treat the web build as a development convenience, not a secure client.',
  );
}

/**
 * Web backing store.
 *
 * `sessionStorage`, not `localStorage`: it is cleared when the tab closes, so a
 * token does not outlive the session on a shared machine. Neither is actually
 * secure — see the warning above — but this is the less bad of the two.
 */
const webStore = {
  get(key) {
    try {
      return window.sessionStorage.getItem(key);
    } catch {
      return null;
    }
  },
  set(key, value) {
    try {
      window.sessionStorage.setItem(key, value);
    } catch {
      /* private browsing, quota, disabled storage */
    }
  },
  remove(key) {
    try {
      window.sessionStorage.removeItem(key);
    } catch {
      /* nothing useful to do */
    }
  },
};

/**
 * Read a value. Returns `null` rather than throwing — a missing or unreadable
 * token is the same thing as far as callers are concerned: sign in again.
 *
 * @param {string} key
 * @returns {Promise<string | null>}
 */
export async function getItemAsync(key) {
  if (IS_WEB) {
    webWarnOnce();
    return webStore.get(key);
  }
  try {
    return await SecureStore.getItemAsync(key, NATIVE_OPTIONS);
  } catch (err) {
    // Keychain reads fail on a locked device, or after a restore on iOS where
    // the item is present but undecryptable. Neither is recoverable here.
    console.warn(`[secureStorage] could not read "${key}":`, err?.message ?? err);
    return null;
  }
}

/**
 * Write a value.
 *
 * @param {string} key
 * @param {string} value
 * @returns {Promise<void>}
 */
export async function setItemAsync(key, value) {
  if (IS_WEB) {
    webWarnOnce();
    webStore.set(key, value);
    return;
  }
  await SecureStore.setItemAsync(key, value, NATIVE_OPTIONS);
}

/**
 * Delete a value. Never throws — failing to clear a token must not prevent the
 * rest of a sign-out from happening.
 *
 * @param {string} key
 * @returns {Promise<void>}
 */
export async function deleteItemAsync(key) {
  if (IS_WEB) {
    webStore.remove(key);
    return;
  }
  try {
    await SecureStore.deleteItemAsync(key, NATIVE_OPTIONS);
  } catch (err) {
    console.warn(`[secureStorage] could not delete "${key}":`, err?.message ?? err);
  }
}

/** True when this platform can actually keep a secret. */
export const isSecureStorageAvailable = !IS_WEB;

export default { getItemAsync, setItemAsync, deleteItemAsync, isSecureStorageAvailable };

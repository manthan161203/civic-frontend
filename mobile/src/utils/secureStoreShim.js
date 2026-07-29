/**
 * Historical import path for secure storage.
 *
 * The implementation moved to `@/api/secureStorage`, which pins the iOS
 * Keychain accessibility class, stops treating a `window.localStorage` polyfill
 * as proof of being on the web, and is honest about what the web build can and
 * cannot protect.
 *
 * @deprecated Import from `@/api/secureStorage` instead.
 */

export {
  getItemAsync,
  setItemAsync,
  deleteItemAsync,
  isSecureStorageAvailable,
  default,
} from '@/api/secureStorage';

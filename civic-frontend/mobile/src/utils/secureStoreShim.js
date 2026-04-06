import * as ExpoSecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const isWeb = Platform?.OS === 'web' || (typeof window !== 'undefined' && typeof window.localStorage !== 'undefined');

export async function getItemAsync(key) {
  if (isWeb) {
    try {
      return Promise.resolve(window.localStorage.getItem(key));
    } catch (e) {
      return Promise.resolve(null);
    }
  }
  return ExpoSecureStore.getItemAsync(key);
}

export async function setItemAsync(key, value) {
  if (isWeb) {
    try {
      window.localStorage.setItem(key, value);
      return Promise.resolve();
    } catch (e) {
      return Promise.reject(e);
    }
  }
  return ExpoSecureStore.setItemAsync(key, value);
}

export async function deleteItemAsync(key) {
  if (isWeb) {
    try {
      window.localStorage.removeItem(key);
      return Promise.resolve();
    } catch (e) {
      return Promise.reject(e);
    }
  }
  return ExpoSecureStore.deleteItemAsync(key);
}

export default {
  getItemAsync,
  setItemAsync,
  deleteItemAsync,
};

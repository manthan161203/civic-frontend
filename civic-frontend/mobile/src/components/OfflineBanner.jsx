import { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../api/client';

/**
 * OfflineBanner — attaches to the Axios instance and shows a persistent
 * red bar whenever a request fails with no HTTP response (network error).
 * Automatically hides when connectivity is restored.
 * No additional packages required.
 */
export default function OfflineBanner() {
  const [offline, setOffline] = useState(false);
  const slideAnim = useRef(new Animated.Value(-48)).current;

  useEffect(() => {
    const show = () => {
      setOffline(true);
      Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, speed: 14 }).start();
    };
    const hide = () => {
      Animated.timing(slideAnim, { toValue: -48, duration: 300, useNativeDriver: true }).start(
        () => setOffline(false)
      );
    };

    const resInterceptor = api.interceptors.response.use(
      (response) => {
        if (offline) hide();
        return response;
      },
      (error) => {
        // No response = network error (offline / timeout / DNS failure)
        if (!error.response) {
          show();
        } else if (offline) {
          hide();
        }
        return Promise.reject(error);
      }
    );

    return () => {
      api.interceptors.response.eject(resInterceptor);
    };
  }, [offline]);

  if (!offline) return null;

  return (
    <Animated.View style={[styles.banner, { transform: [{ translateY: slideAnim }] }]}>
      <Ionicons name="cloud-offline-outline" size={16} color="#fff" />
      <Text style={styles.text}>No internet connection</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  banner: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    zIndex: 9999,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#ef4444',
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  text: { color: '#fff', fontSize: 13, fontWeight: '600' },
});

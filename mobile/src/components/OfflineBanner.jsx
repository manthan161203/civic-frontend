/**
 * Connectivity banner.
 *
 * Three states, in priority order:
 *
 *   offline    the device has no usable connection — nothing will succeed
 *   retrying   a request failed transiently and is being retried
 *   slow       a request has been running past SLOW_REQUEST_MS
 *
 * It reads the merged network state from `@/api/networkStatus`, which combines
 * what the OS reports about the radio with what the transport observes about
 * real requests.
 *
 * The previous version registered its own axios response interceptor and
 * inferred "offline" from any response-less error. Three problems with that:
 * it could not tell a dead network from a dead server; it stayed up until the
 * next *successful* request rather than until connectivity returned; and it
 * added a fresh pair of interceptors on every mount, so navigating back and
 * forth quietly stacked them up.
 */

import { useEffect, useRef } from 'react';
import { Text, StyleSheet, Animated, TouchableOpacity, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNetworkStatus } from '../hooks/useNetworkStatus';

const HEIGHT = 34;

const STATES = {
  offline: {
    icon: 'cloud-offline-outline',
    background: '#b91c1c',
    text: "No connection — you're offline",
  },
  retrying: {
    icon: 'refresh-outline',
    background: '#b45309',
    text: 'Connection problem — retrying…',
  },
  slow: {
    icon: 'hourglass-outline',
    background: '#a16207',
    text: 'Slow connection — still working…',
  },
};

/**
 * @param {{ onRetry?: () => void }} props
 *   `onRetry` is optional. Pass it on screens that own a refetch, and the
 *   banner offers a manual retry once the device is back online.
 */
export default function OfflineBanner({ onRetry }) {
  const { isOffline, isSlow, isRetrying } = useNetworkStatus();
  // The banner sat at `top: 0`, i.e. underneath the status bar. SDK 54
  // defaults Android to edge-to-edge, so this was wrong on both platforms.
  const insets = useSafeAreaInsets();

  const key = isOffline ? 'offline' : isRetrying ? 'retrying' : isSlow ? 'slow' : null;
  const visible = key !== null;

  const slide = useRef(new Animated.Value(-HEIGHT)).current;
  const spin = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(slide, {
      toValue: visible ? 0 : -(HEIGHT + insets.top),
      useNativeDriver: true,
      speed: 14,
      bounciness: 4,
    }).start();
  }, [visible, slide, insets.top]);

  // Spin the refresh glyph only while actually retrying, so the animation means
  // something rather than being decoration.
  useEffect(() => {
    if (key !== 'retrying') {
      spin.stopAnimation();
      spin.setValue(0);
      return undefined;
    }
    const loop = Animated.loop(
      Animated.timing(spin, {
        toValue: 1,
        duration: 900,
        useNativeDriver: true,
        isInteraction: false,
      }),
    );
    loop.start();
    return () => loop.stop();
  }, [key, spin]);

  // Keep the last known state during the slide-out, so the banner does not
  // change colour and wording on its way off screen.
  const lastKey = useRef(key);
  if (key) lastKey.current = key;
  const state = STATES[key ?? lastKey.current ?? 'offline'];

  const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  return (
    <Animated.View
      pointerEvents={visible ? 'auto' : 'none'}
      style={[
        styles.banner,
        {
          backgroundColor: state.background,
          transform: [{ translateY: slide }],
          paddingTop: insets.top,
          height: HEIGHT + insets.top,
        },
      ]}
      accessibilityLiveRegion="polite"
      accessibilityRole="alert"
    >
      <Animated.View style={key === 'retrying' ? { transform: [{ rotate }] } : undefined}>
        <Ionicons name={state.icon} size={15} color="#fff" />
      </Animated.View>

      <Text style={styles.text} numberOfLines={1}>
        {state.text}
      </Text>

      {/* Offering "retry" while offline would be a lie — the request cannot
          succeed. It appears only once connectivity is back. */}
      {onRetry && !isOffline && (
        <TouchableOpacity onPress={onRetry} hitSlop={8} style={styles.retry}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  banner: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: HEIGHT,
    zIndex: 1000,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 14,
    ...Platform.select({
      android: { elevation: 4 },
      default: {
        shadowColor: '#000',
        shadowOpacity: 0.15,
        shadowRadius: 3,
        shadowOffset: { width: 0, height: 1 },
      },
    }),
  },
  text: {
    color: '#fff',
    fontSize: 12.5,
    fontWeight: '600',
    flexShrink: 1,
  },
  retry: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.22)',
  },
  retryText: {
    color: '#fff',
    fontSize: 11.5,
    fontWeight: '700',
  },
});

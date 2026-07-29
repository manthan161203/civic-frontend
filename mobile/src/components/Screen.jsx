/**
 * The screen wrapper that makes safe areas real.
 *
 * `react-native-safe-area-context` is a declared dependency of this app and was
 * **imported by nothing**. Two screens imported the deprecated core
 * `SafeAreaView` from `react-native` instead, which is iOS-only and a complete
 * no-op on Android — and Expo SDK 54 turns on Android edge-to-edge by default,
 * so content runs under the status bar and the gesture pill there too.
 *
 * The visible symptoms, all of which this replaces:
 *
 *   - `paddingTop: 60` hardcoded in the OTP and Aadhaar screens, standing in
 *     for a notch whose height nobody measured.
 *   - Toast pinned at `bottom: 20`, so it sat under the tab bar and the home
 *     indicator.
 *   - The offline banner at `top: 0`, under the status bar.
 *   - Tab bars with `paddingBottom: 4` regardless of the device.
 *
 * React Navigation pads its own header and tab bar, but nothing pads custom
 * content — which is most of this app.
 */

import { View, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../theme';

/**
 * @typedef {object} ScreenProps
 * @property {React.ReactNode} children
 * @property {('top'|'bottom'|'left'|'right')[]} [edges=['top','bottom']]
 *   Which sides to inset. Omit `top` on a screen that already has a navigation
 *   header — the header is inset already, and doing it twice leaves a gap.
 * @property {string} [background]
 * @property {object} [style]
 * @property {boolean} [flush=false]
 *   Skip insets entirely. For a full-bleed map or an image behind the status
 *   bar, where the content is *meant* to run under the chrome — the individual
 *   controls on top then take the insets themselves.
 */

/** @param {ScreenProps} props */
export default function Screen({
  children,
  edges = ['top', 'bottom'],
  background = Colors.bg,
  style,
  flush = false,
}) {
  const insets = useSafeAreaInsets();

  const padding = flush
    ? null
    : {
        paddingTop: edges.includes('top') ? insets.top : 0,
        paddingBottom: edges.includes('bottom') ? insets.bottom : 0,
        paddingLeft: edges.includes('left') ? insets.left : 0,
        paddingRight: edges.includes('right') ? insets.right : 0,
      };

  return (
    <View style={[styles.root, { backgroundColor: background }, padding, style]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});

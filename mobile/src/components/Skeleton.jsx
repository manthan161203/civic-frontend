/**
 * Loading placeholders.
 *
 * The app had none. Nine screens replaced their entire contents with
 * `<ActivityIndicator style={{flex:1}}/>` — which wipes the header, the tab
 * context and any list already on screen, so a refresh looked like a navigation
 * event. Four more dropped a spinner into the list area.
 *
 * A skeleton reserves the layout, so nothing jumps when data lands, and it
 * tells the user what shape of thing is coming.
 *
 * Animated with the legacy `Animated` API rather than Reanimated, matching the
 * rest of the app — introducing a second animation system for a shimmer would
 * be the wrong place to start that migration.
 */

import { useEffect, useRef } from 'react';
import { Animated, View, StyleSheet, AccessibilityInfo, Platform } from 'react-native';
import { Colors, Radius, Spacing } from '../theme';

/**
 * @param {{ width?: number|string, height?: number, radius?: number, style?: object }} props
 */
export function SkeletonBlock({ width = '100%', height = 12, radius = 6, style }) {
  const pulse = useRef(new Animated.Value(0.35)).current;

  useEffect(() => {
    let cancelled = false;
    let loop;

    // Respect the OS "reduce motion" setting. A pulsing block is decoration;
    // for someone with vestibular sensitivity it is not.
    AccessibilityInfo.isReduceMotionEnabled().then((reduce) => {
      if (cancelled || reduce) return;
      loop = Animated.loop(
        Animated.sequence([
          Animated.timing(pulse, {
            toValue: 0.75,
            duration: 700,
            useNativeDriver: true,
            isInteraction: false,
          }),
          Animated.timing(pulse, {
            toValue: 0.35,
            duration: 700,
            useNativeDriver: true,
            isInteraction: false,
          }),
        ]),
      );
      loop.start();
    });

    return () => {
      cancelled = true;
      loop?.stop();
    };
  }, [pulse]);

  return (
    <Animated.View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[
        { width, height, borderRadius: radius, backgroundColor: Colors.border, opacity: pulse },
        style,
      ]}
    />
  );
}

/**
 * A placeholder shaped like `IssueCard` — photo block, two lines, a badge row.
 *
 * Matching the real row matters: a generic grey bar that is the wrong height
 * still causes the jump a skeleton exists to prevent.
 */
export function IssueCardSkeleton() {
  return (
    <View style={styles.card}>
      <SkeletonBlock width={72} height={72} radius={Radius.md} />
      <View style={styles.cardBody}>
        <SkeletonBlock width="82%" height={13} />
        <SkeletonBlock width="55%" height={11} style={{ marginTop: 8 }} />
        <View style={styles.badgeRow}>
          <SkeletonBlock width={58} height={18} radius={9} />
          <SkeletonBlock width={44} height={18} radius={9} />
        </View>
      </View>
    </View>
  );
}

/** @param {{ count?: number, label?: string }} props */
export function IssueListSkeleton({ count = 5, label = 'Loading issues' }) {
  return (
    <View
      // Announced once, politely, rather than a dozen elements each saying
      // "loading" — or silence, which is what a bare ActivityIndicator gives a
      // screen-reader user.
      accessible
      accessibilityRole={Platform.OS === 'ios' ? 'text' : 'none'}
      accessibilityLabel={label}
      accessibilityState={{ busy: true }}
    >
      {Array.from({ length: count }, (_, i) => (
        <IssueCardSkeleton key={i} />
      ))}
    </View>
  );
}

/** Stat tiles, for the worker dashboard and the rewards screens. */
export function StatsSkeleton({ count = 4 }) {
  return (
    <View style={styles.statsRow}>
      {Array.from({ length: count }, (_, i) => (
        <View key={i} style={styles.statTile}>
          <SkeletonBlock width="60%" height={9} />
          <SkeletonBlock width="45%" height={20} style={{ marginTop: 8 }} />
        </View>
      ))}
    </View>
  );
}

/** Generic rows, for lists that are not issue cards (notifications, shifts). */
export function ListSkeleton({ count = 6 }) {
  return (
    <View>
      {Array.from({ length: count }, (_, i) => (
        <View key={i} style={styles.row}>
          <SkeletonBlock width={32} height={32} radius={16} />
          <View style={styles.rowBody}>
            <SkeletonBlock width="70%" height={12} />
            <SkeletonBlock width="40%" height={10} style={{ marginTop: 6 }} />
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    gap: Spacing.md,
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    marginHorizontal: Spacing.md,
    marginTop: Spacing.md,
  },
  cardBody: { flex: 1, justifyContent: 'center' },
  badgeRow: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.md },
  statsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.md,
  },
  statTile: {
    flexGrow: 1,
    flexBasis: '45%',
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    padding: Spacing.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
  },
  rowBody: { flex: 1 },
});

export default SkeletonBlock;

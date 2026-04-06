import React from 'react';
import { View, Animated } from 'react-native';

export function MobileCardSkeleton({ count = 3 }) {
  const shimmerAnim = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnim, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(shimmerAnim, {
          toValue: 0,
          duration: 1500,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [shimmerAnim]);

  const opacity = shimmerAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0.6, 1, 0.6],
  });

  return (
    <View className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <Animated.View
          key={i}
          style={{ opacity }}
          className="bg-gray-200 rounded-lg h-24 mb-3"
        />
      ))}
    </View>
  );
}

export function MobileListSkeleton({ count = 5 }) {
  const shimmerAnim = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnim, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(shimmerAnim, {
          toValue: 0,
          duration: 1500,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [shimmerAnim]);

  const opacity = shimmerAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0.6, 1, 0.6],
  });

  return (
    <View className="space-y-2">
      {Array.from({ length: count }).map((_, i) => (
        <Animated.View
          key={i}
          style={{ opacity }}
          className="bg-gray-200 rounded-lg h-16 mb-2"
        />
      ))}
    </View>
  );
}

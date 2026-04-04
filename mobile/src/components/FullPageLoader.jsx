import React, { useEffect, useRef } from 'react';
import {
  View,
  Modal,
  StyleSheet,
  Text,
  Animated,
  ActivityIndicator,
} from 'react-native';
import Svg, { Circle } from 'react-native-svg';

const FullPageLoader = ({ visible = false, message = 'Loading...' }) => {
  const spinValue = useRef(new Animated.Value(0)).current;
  const pulseValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.loop(
        Animated.timing(spinValue, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        })
      ).start();

      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseValue, {
            toValue: 1,
            duration: 750,
            useNativeDriver: true,
          }),
          Animated.timing(pulseValue, {
            toValue: 0,
            duration: 750,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      spinValue.setValue(0);
      pulseValue.setValue(0);
    }
  }, [visible, spinValue, pulseValue]);

  const spin = spinValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const pulseOpacity = pulseValue.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0.3],
  });

  return (
    <Modal visible={visible} transparent statusBarTranslucent>
      <View style={styles.container}>
        <View style={styles.content}>
          {/* Pulsing ring background */}
          <Animated.View
            style={[
              styles.pulseRing,
              {
                opacity: pulseOpacity,
              },
            ]}
          />

          {/* Spinner */}
          <Animated.View
            style={{
              transform: [{ rotate: spin }],
              width: 64,
              height: 64,
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            <Svg width={64} height={64} viewBox="0 0 64 64">
              <Circle
                cx="32"
                cy="32"
                r="28"
                stroke="#2563eb"
                strokeWidth="3"
                fill="none"
                strokeDasharray="20"
                strokeLinecap="round"
              />
            </Svg>
          </Animated.View>

          {/* Message */}
          {message && (
            <View style={styles.messageContainer}>
              <Text style={styles.messageText}>{message}</Text>
              <Text style={styles.subText}>Please wait...</Text>
            </View>
          )}

          {/* Dots animation */}
          <View style={styles.dotsContainer}>
            <View
              style={[
                styles.dot,
                {
                  opacity: 1,
                  transform: [
                    {
                      scale: pulseValue.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.5, 1],
                      }),
                    },
                  ],
                },
              ]}
            />
            <View
              style={[
                styles.dot,
                {
                  opacity: pulseValue.interpolate({
                    inputRange: [0, 0.5, 1],
                    outputRange: [0.3, 1, 0.3],
                  }),
                },
              ]}
            />
            <View
              style={[
                styles.dot,
                {
                  opacity: pulseValue.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.3, 0.5],
                  }),
                },
              ]}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    gap: 16,
    maxWidth: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
  pulseRing: {
    position: 'absolute',
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 2,
    borderColor: '#bfdbfe',
  },
  messageContainer: {
    alignItems: 'center',
    marginTop: 8,
  },
  messageText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    textAlign: 'center',
  },
  subText: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 4,
    textAlign: 'center',
  },
  dotsContainer: {
    flexDirection: 'row',
    gap: 4,
    marginTop: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#60a5fa',
  },
});

export default FullPageLoader;

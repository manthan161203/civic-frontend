import React, { useEffect, useRef } from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  View,
  Animated,
} from 'react-native';
import Svg, { Circle } from 'react-native-svg';

const LoadingButton = ({
  children,
  isLoading = false,
  disabled = false,
  onPress,
  style,
  variant = 'primary',
  size = 'md',
  loadingText = 'Loading...',
  ...props
}) => {
  const spinValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isLoading) {
      Animated.loop(
        Animated.timing(spinValue, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        })
      ).start();
    } else {
      spinValue.setValue(0);
    }
  }, [isLoading, spinValue]);

  const spin = spinValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const variantStyles = {
    primary: {
      button: styles.primaryBtn,
      text: styles.primaryText,
    },
    danger: {
      button: styles.dangerBtn,
      text: styles.dangerText,
    },
    success: {
      button: styles.successBtn,
      text: styles.successText,
    },
    secondary: {
      button: styles.secondaryBtn,
      text: styles.secondaryText,
    },
    outline: {
      button: styles.outlineBtn,
      text: styles.outlineText,
    },
  };

  const sizeStyles = {
    sm: {
      button: styles.smButton,
      text: styles.smText,
    },
    md: {
      button: styles.mdButton,
      text: styles.mdText,
    },
    lg: {
      button: styles.lgButton,
      text: styles.lgText,
    },
  };

  const isDisabled = disabled || isLoading;

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={isDisabled}
      style={[
        styles.base,
        variantStyles[variant].button,
        sizeStyles[size].button,
        isDisabled && styles.disabledButton,
        style,
      ]}
      {...props}
    >
      <View style={styles.content}>
        {isLoading && (
          <Animated.View
            style={{
              transform: [{ rotate: spin }],
              marginRight: 8,
              width: 16,
              height: 16,
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            <Svg width={16} height={16} viewBox="0 0 16 16">
              <Circle
                cx="8"
                cy="8"
                r="6"
                stroke={
                  variant === 'outline' || variant === 'secondary'
                    ? '#374151'
                    : '#ffffff'
                }
                strokeWidth="2"
                fill="none"
                strokeDasharray="20"
                strokeLinecap="round"
              />
            </Svg>
          </Animated.View>
        )}
        <Text
          style={[
            variantStyles[variant].text,
            sizeStyles[size].text,
            isDisabled && styles.disabledText,
          ]}
        >
          {isLoading ? loadingText : children}
        </Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  base: {
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Variants
  primaryBtn: {
    backgroundColor: '#2563eb',
  },
  primaryText: {
    color: '#fff',
    fontWeight: '600',
  },
  dangerBtn: {
    backgroundColor: '#dc2626',
  },
  dangerText: {
    color: '#fff',
    fontWeight: '600',
  },
  successBtn: {
    backgroundColor: '#16a34a',
  },
  successText: {
    color: '#fff',
    fontWeight: '600',
  },
  secondaryBtn: {
    backgroundColor: '#e5e7eb',
  },
  secondaryText: {
    color: '#111827',
    fontWeight: '600',
  },
  outlineBtn: {
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#d1d5db',
  },
  outlineText: {
    color: '#374151',
    fontWeight: '600',
  },
  // Sizes
  smButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  smText: {
    fontSize: 12,
  },
  mdButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  mdText: {
    fontSize: 14,
  },
  lgButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  lgText: {
    fontSize: 16,
  },
  // Disabled
  disabledButton: {
    opacity: 0.6,
  },
  disabledText: {
    opacity: 0.7,
  },
});

export default LoadingButton;

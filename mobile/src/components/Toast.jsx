import React, { useEffect } from 'react';
import { View, Text, Animated, StyleSheet } from 'react-native';
import { useUiStore } from '../store/uiStore';

/**
 * Toast notification component for mobile
 * Displays notifications from uiStore with auto-dismiss
 */
export default function Toast() {
  const { toasts, removeToast } = useUiStore();

  return (
    <View style={styles.container}>
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onDismiss={() => removeToast(toast.id)} />
      ))}
    </View>
  );
}

function ToastItem({ toast, onDismiss }) {
  const opacity = React.useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.timing(opacity, { toValue: 1, duration: 300, useNativeDriver: true }),
      Animated.delay(Math.max(2000, toast.duration || 3000)),
      Animated.timing(opacity, { toValue: 0, duration: 300, useNativeDriver: true }),
    ]).start(onDismiss);
  }, []);

  const bgColor = {
    success: '#10b981',
    error: '#ef4444',
    warning: '#f59e0b',
    info: '#3b82f6',
  }[toast.type] || '#3b82f6';

  return (
    <Animated.View
      style={[
        styles.toast,
        { backgroundColor: bgColor, opacity },
      ]}
    >
      <Text style={styles.text}>{toast.message}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    zIndex: 9999,
  },
  toast: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 8,
    elevation: 5,
  },
  text: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
  },
});

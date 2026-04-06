import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';

/**
 * Reusable Button Component for React Native
 * @example
 * <Button variant="primary" onPress={handlePress}>Submit</Button>
 * <Button variant="danger" isLoading>Delete</Button>
 */
const Button = ({
  children,
  variant = 'primary',
  size = 'md',
  disabled = false,
  isLoading = false,
  onPress,
  style,
}) => {
  const variants = {
    primary: '#007AFF',
    secondary: '#f0f0f0',
    danger: '#FF3B30',
    ghost: 'transparent',
  };

  const sizes = {
    sm: { paddingVertical: 8, paddingHorizontal: 12, fontSize: 12 },
    md: { paddingVertical: 12, paddingHorizontal: 16, fontSize: 14 },
    lg: { paddingVertical: 16, paddingHorizontal: 20, fontSize: 16 },
  };

  const textColor = variant === 'secondary' ? '#000' : '#fff';

  const styles = StyleSheet.create({
    button: {
      backgroundColor: variants[variant],
      borderRadius: 8,
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
      opacity: disabled ? 0.5 : 1,
      ...sizes[size],
    },
    text: {
      color: textColor,
      fontWeight: '600',
      marginRight: isLoading ? 8 : 0,
    },
  });

  return (
    <TouchableOpacity
      style={[styles.button, style]}
      disabled={disabled || isLoading}
      onPress={onPress}
    >
      {isLoading && <ActivityIndicator color={textColor} size="small" />}
      <Text style={styles.text}>{children}</Text>
    </TouchableOpacity>
  );
};

export default Button;

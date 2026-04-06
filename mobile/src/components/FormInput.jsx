import React from 'react';
import {
  View,
  TextInput,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';

/**
 * Reusable Form Input Component for React Native
 * @example
 * <FormInput
 *   label="Phone Number"
 *   value={phone}
 *   onChangeText={setPhone}
 *   error={errors.phone}
 *   placeholder="+91 9876543210"
 * />
 */
const FormInput = ({
  label,
  value,
  onChangeText,
  onBlur,
  error,
  required = false,
  disabled = false,
  placeholder,
  type = 'text',
  multiline = false,
  numberOfLines = 1,
  options = [],
  helpText,
  style,
}) => {
  const styles = StyleSheet.create({
    container: {
      marginVertical: 8,
    },
    label: {
      fontSize: 14,
      fontWeight: '600',
      marginBottom: 6,
      color: '#000',
    },
    required: {
      color: '#FF3B30',
    },
    input: {
      borderWidth: 1,
      borderColor: error ? '#FF3B30' : '#ccc',
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 10,
      fontSize: 14,
      color: '#000',
      backgroundColor: disabled ? '#f0f0f0' : '#fff',
    },
    error: {
      color: '#FF3B30',
      fontSize: 12,
      marginTop: 4,
    },
    help: {
      color: '#666',
      fontSize: 12,
      marginTop: 4,
    },
  });

  return (
    <View style={[styles.container, style]}>
      {label && (
        <Text style={styles.label}>
          {label}
          {required && <Text style={styles.required}> *</Text>}
        </Text>
      )}

      {type === 'select' ? (
        <ScrollView
          horizontal
          style={[styles.input, { paddingVertical: 0 }]}
          scrollEnabled={false}
        >
          {options.map((option) => (
            <TouchableOpacity
              key={option.value}
              onPress={() => onChangeText(option.value)}
              style={{
                paddingHorizontal: 10,
                paddingVertical: 10,
                backgroundColor: value === option.value ? '#007AFF' : '#f0f0f0',
                marginRight: 8,
                borderRadius: 6,
              }}
            >
              <Text
                style={{
                  color: value === option.value ? '#fff' : '#000',
                  fontWeight: value === option.value ? '600' : '400',
                }}
              >
                {option.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      ) : (
        <TextInput
          style={[styles.input, { height: multiline ? numberOfLines * 20 + 10 : 'auto' }]}
          value={value}
          onChangeText={onChangeText}
          onBlur={onBlur}
          placeholder={placeholder}
          editable={!disabled}
          multiline={multiline}
          numberOfLines={numberOfLines}
          keyboardType={type === 'email' ? 'email-address' : type === 'phone' ? 'phone-pad' : 'default'}
        />
      )}

      {error && <Text style={styles.error}>{error}</Text>}
      {helpText && <Text style={styles.help}>{helpText}</Text>}
    </View>
  );
};

export default FormInput;

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle, Rect, Line, Defs, LinearGradient, Stop } from 'react-native-svg';

const CivicLogo = ({ size = 'md', showText = true, darkMode = false }) => {
  const sizes = {
    sm: { icon: 32, text: 14 },
    md: { icon: 48, text: 18 },
    lg: { icon: 64, text: 24 },
    xl: { icon: 96, text: 32 },
  };

  const s = sizes[size];
  const textColor = darkMode ? '#f3f4f6' : '#111827';
  const accentColor = '#2563eb';

  return (
    <View style={styles.container}>
      {/* Logo Icon */}
      <View style={{ width: s.icon, height: s.icon, justifyContent: 'center', alignItems: 'center' }}>
        <Svg width={s.icon} height={s.icon} viewBox="0 0 100 100">
          <Defs>
            <LinearGradient id="civicGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <Stop offset="0%" stopColor="#2563eb" />
              <Stop offset="100%" stopColor="#1d4ed8" />
            </LinearGradient>
          </Defs>

          {/* Outer circle */}
          <Circle cx="50" cy="50" r="48" fill="url(#civicGradient)" opacity="0.1" />

          {/* Left building */}
          <Rect x="22" y="35" width="12" height="30" fill={accentColor} rx="2" />
          {/* Windows left building */}
          <Rect x="24" y="38" width="3" height="3" fill="white" rx="0.5" />
          <Rect x="24" y="44" width="3" height="3" fill="white" rx="0.5" />
          <Rect x="24" y="50" width="3" height="3" fill="white" rx="0.5" />
          <Rect x="30" y="38" width="3" height="3" fill="white" rx="0.5" />
          <Rect x="30" y="44" width="3" height="3" fill="white" rx="0.5" />
          <Rect x="30" y="50" width="3" height="3" fill="white" rx="0.5" />

          {/* Center building */}
          <Rect x="42" y="28" width="16" height="37" fill={accentColor} rx="2" />
          {/* Windows center building */}
          <Rect x="44" y="31" width="3" height="3" fill="white" rx="0.5" />
          <Rect x="44" y="37" width="3" height="3" fill="white" rx="0.5" />
          <Rect x="44" y="43" width="3" height="3" fill="white" rx="0.5" />
          <Rect x="44" y="49" width="3" height="3" fill="white" rx="0.5" />
          <Rect x="50" y="31" width="3" height="3" fill="white" rx="0.5" />
          <Rect x="50" y="37" width="3" height="3" fill="white" rx="0.5" />
          <Rect x="50" y="43" width="3" height="3" fill="white" rx="0.5" />
          <Rect x="50" y="49" width="3" height="3" fill="white" rx="0.5" />

          {/* Right building */}
          <Rect x="66" y="38" width="12" height="27" fill={accentColor} rx="2" />
          {/* Windows right building */}
          <Rect x="68" y="41" width="3" height="3" fill="white" rx="0.5" />
          <Rect x="68" y="47" width="3" height="3" fill="white" rx="0.5" />
          <Rect x="74" y="41" width="3" height="3" fill="white" rx="0.5" />
          <Rect x="74" y="47" width="3" height="3" fill="white" rx="0.5" />

          {/* Civic connection line */}
          <Circle cx="30" cy="68" r="2" fill={accentColor} />
          <Circle cx="50" cy="70" r="2" fill={accentColor} />
          <Circle cx="70" cy="68" r="2" fill={accentColor} />
          <Line x1="30" y1="68" x2="50" y2="70" stroke={accentColor} strokeWidth="1" opacity="0.5" />
          <Line x1="50" y1="70" x2="70" y2="68" stroke={accentColor} strokeWidth="1" opacity="0.5" />
        </Svg>
      </View>

      {/* Logo Text */}
      {showText && (
        <View style={styles.textContainer}>
          <Text
            style={[
              styles.mainText,
              {
                fontSize: s.text,
                color: textColor,
              },
            ]}
          >
            Civic
          </Text>
          <Text style={[styles.subText, { color: accentColor }]}>
            Community Platform
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: 8,
  },
  textContainer: {
    alignItems: 'center',
  },
  mainText: {
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  subText: {
    fontSize: 12,
    fontWeight: '500',
  },
});

export default CivicLogo;

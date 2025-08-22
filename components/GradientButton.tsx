import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, ViewStyle, TextStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Colors from '@/constants/colors';

interface GradientButtonProps {
  title: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  variant?: 'primary' | 'secondary';
  testID?: string;
}

export default function GradientButton({
  title,
  onPress,
  loading = false,
  disabled = false,
  style,
  textStyle,
  variant = 'primary',
  testID,
}: GradientButtonProps) {
  const gradientColors = variant === 'primary' 
    ? [Colors.gradient.start, Colors.gradient.middle] as const
    : [Colors.gradient.middle, Colors.gradient.end] as const;

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      style={[styles.container, style]}
      activeOpacity={0.8}
      testID={testID}
    >
      <LinearGradient
        colors={gradientColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={[styles.gradient, disabled && styles.disabled]}
      >
        {loading ? (
          <ActivityIndicator color={Colors.text.white} />
        ) : (
          <Text style={[styles.text, textStyle]}>{title}</Text>
        )}
      </LinearGradient>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 30,
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  gradient: {
    paddingVertical: 16,
    paddingHorizontal: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabled: {
    opacity: 0.6,
  },
  text: {
    color: Colors.text.white,
    fontSize: 16,
    fontWeight: '600',
  },
});
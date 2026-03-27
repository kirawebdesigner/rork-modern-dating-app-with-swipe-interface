import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Platform,
  Vibration,
} from 'react-native';
import { Shield, Fingerprint, Delete, Lock } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Colors from '@/constants/colors';

const PIN_LENGTH = 4;
const BIOMETRIC_KEY = 'biometric_enabled';
const TWO_FACTOR_KEY = 'two_factor_enabled';
const PIN_CODE_KEY = 'pin_code';

interface LockScreenProps {
  onUnlock: () => void;
}

export default function LockScreen({ onUnlock }: LockScreenProps) {
  const [pin, setPin] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [storedPin, setStoredPin] = useState<string | null>(null);
  const [biometricAvailable, setBiometricAvailable] = useState<boolean>(false);
  const [biometricEnabled, setBiometricEnabled] = useState<boolean>(false);
  const [attempts, setAttempts] = useState<number>(0);
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const dotAnims = useRef(
    Array.from({ length: PIN_LENGTH }, () => new Animated.Value(0))
  ).current;

  useEffect(() => {
    const load = async () => {
      try {
        const [savedPin, bioEnabled] = await Promise.all([
          AsyncStorage.getItem(PIN_CODE_KEY),
          AsyncStorage.getItem(BIOMETRIC_KEY),
        ]);
        setStoredPin(savedPin);
        setBiometricEnabled(bioEnabled === 'true');

        if (Platform.OS !== 'web') {
          try {
            const LocalAuth = await import('expo-local-authentication');
            const compatible = await LocalAuth.hasHardwareAsync();
            const enrolled = await LocalAuth.isEnrolledAsync();
            setBiometricAvailable(compatible && enrolled);

            if (bioEnabled === 'true' && compatible && enrolled) {
              setTimeout(() => attemptBiometric(), 500);
            }
          } catch (e) {
            console.log('[LockScreen] biometric check error', e);
          }
        }
      } catch (e) {
        console.log('[LockScreen] load error', e);
      }
    };
    load();
  }, []);

  const attemptBiometric = useCallback(async () => {
    if (Platform.OS === 'web') return;
    try {
      const LocalAuth = await import('expo-local-authentication');
      const result = await LocalAuth.authenticateAsync({
        promptMessage: 'Verify your identity',
        cancelLabel: 'Use PIN',
        fallbackLabel: 'Use PIN',
        disableDeviceFallback: false,
      });
      if (result.success) {
        console.log('[LockScreen] Biometric auth success');
        onUnlock();
      }
    } catch (e) {
      console.log('[LockScreen] biometric error', e);
    }
  }, [onUnlock]);

  const shake = useCallback(() => {
    if (Platform.OS !== 'web') {
      try { Vibration.vibrate(200); } catch {}
    }
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 15, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -15, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
    ]).start();
  }, [shakeAnim]);

  const animateDot = useCallback((index: number) => {
    Animated.sequence([
      Animated.timing(dotAnims[index], { toValue: 1, duration: 100, useNativeDriver: true }),
      Animated.timing(dotAnims[index], { toValue: 0.8, duration: 80, useNativeDriver: true }),
    ]).start();
  }, [dotAnims]);

  const handlePress = useCallback((digit: string) => {
    if (pin.length >= PIN_LENGTH) return;

    const newPin = pin + digit;
    setPin(newPin);
    setError('');
    animateDot(newPin.length - 1);

    if (newPin.length === PIN_LENGTH) {
      setTimeout(() => {
        if (newPin === storedPin) {
          console.log('[LockScreen] PIN verified');
          onUnlock();
        } else {
          const newAttempts = attempts + 1;
          setAttempts(newAttempts);
          setError(newAttempts >= 5 ? 'Too many attempts' : 'Incorrect PIN');
          shake();
          setPin('');
          dotAnims.forEach(a => a.setValue(0));
        }
      }, 150);
    }
  }, [pin, storedPin, attempts, onUnlock, shake, animateDot, dotAnims]);

  const handleDelete = useCallback(() => {
    if (pin.length === 0) return;
    const newPin = pin.slice(0, -1);
    setPin(newPin);
    dotAnims[newPin.length].setValue(0);
  }, [pin, dotAnims]);

  const renderDots = () => (
    <Animated.View style={[pinStyles.dotsRow, { transform: [{ translateX: shakeAnim }] }]}>
      {Array.from({ length: PIN_LENGTH }).map((_, i) => {
        const scale = dotAnims[i].interpolate({
          inputRange: [0, 1],
          outputRange: [1, 1.3],
        });
        const filled = i < pin.length;
        return (
          <Animated.View
            key={i}
            style={[
              pinStyles.dot,
              filled && pinStyles.dotFilled,
              error ? pinStyles.dotError : null,
              { transform: [{ scale }] },
            ]}
          />
        );
      })}
    </Animated.View>
  );

  const renderKeypad = () => {
    const rows = [
      ['1', '2', '3'],
      ['4', '5', '6'],
      ['7', '8', '9'],
      ['bio', '0', 'del'],
    ];

    return (
      <View style={pinStyles.keypad}>
        {rows.map((row, ri) => (
          <View key={ri} style={pinStyles.keyRow}>
            {row.map((key) => {
              if (key === 'bio') {
                if (biometricAvailable && biometricEnabled) {
                  return (
                    <TouchableOpacity
                      key={key}
                      style={pinStyles.key}
                      onPress={attemptBiometric}
                      activeOpacity={0.6}
                    >
                      <Fingerprint size={26} color={Colors.primary} />
                    </TouchableOpacity>
                  );
                }
                return <View key={key} style={pinStyles.key} />;
              }
              if (key === 'del') {
                return (
                  <TouchableOpacity
                    key={key}
                    style={pinStyles.key}
                    onPress={handleDelete}
                    activeOpacity={0.6}
                  >
                    <Delete size={24} color={Colors.text.primary} />
                  </TouchableOpacity>
                );
              }
              return (
                <TouchableOpacity
                  key={key}
                  style={pinStyles.key}
                  onPress={() => handlePress(key)}
                  activeOpacity={0.6}
                >
                  <Text style={pinStyles.keyText}>{key}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        ))}
      </View>
    );
  };

  return (
    <View style={pinStyles.container}>
      <View style={pinStyles.topSection}>
        <View style={pinStyles.iconWrap}>
          <Lock size={32} color="#FFF" />
        </View>
        <Text style={pinStyles.title}>Enter your PIN</Text>
        <Text style={pinStyles.subtitle}>
          {error || 'Enter your 4-digit security PIN'}
        </Text>
        {renderDots()}
      </View>
      {renderKeypad()}
    </View>
  );
}

const pinStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA',
    justifyContent: 'space-between',
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
  },
  topSection: {
    alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 100 : 80,
  },
  iconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    shadowColor: Colors.primary,
    shadowOpacity: 0.3,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: Colors.text.primary,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.text.secondary,
    marginBottom: 32,
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 20,
  },
  dot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    backgroundColor: 'transparent',
  },
  dotFilled: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  dotError: {
    borderColor: Colors.error,
    backgroundColor: 'transparent',
  },
  keypad: {
    paddingHorizontal: 40,
    gap: 12,
  },
  keyRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  key: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  keyText: {
    fontSize: 28,
    fontWeight: '500' as const,
    color: Colors.text.primary,
  },
});

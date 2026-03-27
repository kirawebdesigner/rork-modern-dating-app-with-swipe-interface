import createContextHook from '@nkzw/create-context-hook';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Appearance, Platform } from 'react-native';
import * as SystemUI from 'expo-system-ui';

export type ThemeScheme = 'light' | 'dark' | 'system';

export interface ThemeColors {
  primary: string;
  primaryDark: string;
  secondary: string;
  gradient: { start: string; middle: string; end: string };
  background: string;
  backgroundSecondary: string;
  text: { primary: string; secondary: string; light: string; white: string };
  border: string;
  success: string;
  error: string;
  warning: string;
  info: string;
  card: string;
  shadow: string;
  overlay: string;
  like: string;
  nope: string;
  superLike: string;
}

const lightColors: ThemeColors = {
  primary: '#E94057',
  primaryDark: '#D32F4C',
  secondary: '#8A2387',
  gradient: { start: '#E94057', middle: '#F27121', end: '#8A2387' },
  background: '#FFFFFF',
  backgroundSecondary: '#F5F5F5',
  text: { primary: '#1A1A1A', secondary: '#666666', light: '#999999', white: '#FFFFFF' },
  border: '#E0E0E0',
  success: '#4CAF50',
  error: '#F44336',
  warning: '#FF9800',
  info: '#2196F3',
  card: '#FFFFFF',
  shadow: 'rgba(0, 0, 0, 0.1)',
  overlay: 'rgba(0, 0, 0, 0.5)',
  like: '#44D362',
  nope: '#E94057',
  superLike: '#3498DB',
};

const darkColors: ThemeColors = {
  primary: '#FF5C7A',
  primaryDark: '#E13C58',
  secondary: '#C471ED',
  gradient: { start: '#FF7E5F', middle: '#F72585', end: '#7209B7' },
  background: '#0B0F1A',
  backgroundSecondary: '#121829',
  text: { primary: '#F5F7FA', secondary: '#C7CEDD', light: '#98A1B3', white: '#FFFFFF' },
  border: '#2A3346',
  success: '#4CAF50',
  error: '#FF6B6B',
  warning: '#FFB020',
  info: '#6EA8FE',
  card: '#0F1629',
  shadow: 'rgba(0, 0, 0, 0.4)',
  overlay: 'rgba(0, 0, 0, 0.6)',
  like: '#44D362',
  nope: '#FF5C7A',
  superLike: '#5AA9FF',
};

interface ThemeContextType {
  colors: ThemeColors;
  resolvedScheme: 'light' | 'dark';
  schemeSetting: ThemeScheme;
  setScheme: (s: ThemeScheme) => Promise<void>;
}

export const [ThemeProvider, useTheme] = createContextHook<ThemeContextType>(() => {
  const [schemeSetting, setSchemeSetting] = useState<ThemeScheme>('system');
  const [system, setSystem] = useState<'light' | 'dark'>(() => (Appearance.getColorScheme?.() === 'dark' ? 'dark' : 'light'));

  useEffect(() => {
    (async () => {
      try {
        const stored = await AsyncStorage.getItem('app_theme_scheme');
        const parsed = (stored as ThemeScheme) || 'system';
        setSchemeSetting(parsed);
      } catch {}
    })();
  }, []);

  useEffect(() => {
    const sub = Appearance.addChangeListener
      ? Appearance.addChangeListener(({ colorScheme }) => {
          const next = colorScheme === 'dark' ? 'dark' : 'light';
          setSystem(next);
        })
      : null;
    return () => {
      if (sub && typeof (sub as unknown as { remove?: () => void }).remove === 'function') {
        (sub as unknown as { remove: () => void }).remove();
      }
    };
  }, []);

  const resolvedScheme: 'light' | 'dark' = schemeSetting === 'system' ? system : (schemeSetting as 'light' | 'dark');

  const colors = useMemo<ThemeColors>(() => (resolvedScheme === 'dark' ? darkColors : lightColors), [resolvedScheme]);

  useEffect(() => {
    if (Platform.OS !== 'web') {
      SystemUI.setBackgroundColorAsync(colors.background).catch(() => {});
    }
  }, [colors.background]);

  const setScheme = useCallback(async (s: ThemeScheme) => {
    await AsyncStorage.setItem('app_theme_scheme', s);
    setSchemeSetting(s);
  }, []);

  return useMemo(() => ({ colors, resolvedScheme, schemeSetting, setScheme }), [colors, resolvedScheme, schemeSetting, setScheme]);
});

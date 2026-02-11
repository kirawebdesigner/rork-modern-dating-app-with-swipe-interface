import { Platform } from 'react-native';
import { Router } from 'expo-router';

export function safeGoBack(router: Router, fallbackRoute: string = '/'): void {
  if (Platform.OS === 'web') {
    if (window.history.length > 1) {
      router.back();
    } else {
      router.replace(fallbackRoute as any);
    }
  } else {
    try {
      if (router.canGoBack()) {
        router.back();
      } else {
        router.replace(fallbackRoute as any);
      }
    } catch {
      router.replace(fallbackRoute as any);
    }
  }
}

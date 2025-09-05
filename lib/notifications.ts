import { Platform } from 'react-native';

export type PushPayload = { title: string; body: string };

export async function registerForPushNotificationsAsync(): Promise<string | null> {
  try {
    if (Platform.OS === 'android') {
      console.log(
        '[Push] Skipping push registration on Android in Expo Go (SDK 53). Use a development build instead.'
      );
      return null;
    }

    const Notifications = await import('expo-notifications');

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') {
      console.log('[Push] Permission not granted');
      return null;
    }

    const tokenResp = await Notifications.getExpoPushTokenAsync();
    const token = tokenResp?.data ?? null;

    if (Platform.OS === 'ios') {
      await Notifications.setNotificationCategoryAsync?.('default', []);
    }

    return token;
  } catch (e) {
    console.log('[Push] register error', e);
    return null;
  }
}

export async function sendPushToUser(userId: string, payload: PushPayload): Promise<void> {
  console.log('[Push] send to', userId, payload.title, payload.body);
}

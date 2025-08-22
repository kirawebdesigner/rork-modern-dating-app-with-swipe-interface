import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

export type PushPayload = { title: string; body: string };

export async function registerForPushNotificationsAsync(): Promise<string | null> {
  try {
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
    const token = (await Notifications.getExpoPushTokenAsync()).data;
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
      });
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

import { Platform } from 'react-native';
import { supabase } from '@/lib/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type PushPayload = { title: string; body: string };

const PUSH_TOKEN_KEY = 'expo_push_token';

export async function registerForPushNotificationsAsync(): Promise<string | null> {
  try {
    if (Platform.OS === 'web') {
      console.log('[Push] Web platform - skipping native push registration');
      return null;
    }

    const Notifications = await import('expo-notifications');

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Default',
        importance: Notifications.AndroidImportance?.MAX ?? 4,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF2D55',
      });
    }

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

    const tokenResp = await Notifications.getExpoPushTokenAsync({
      projectId: process.env.EXPO_PUBLIC_PROJECT_ID,
    });
    const token = tokenResp?.data ?? null;
    console.log('[Push] Got push token:', token);

    if (token) {
      await AsyncStorage.setItem(PUSH_TOKEN_KEY, token);
    }

    return token;
  } catch (e) {
    console.log('[Push] register error', e);
    return null;
  }
}

export async function savePushTokenToServer(userId: string): Promise<void> {
  try {
    const token = await AsyncStorage.getItem(PUSH_TOKEN_KEY);
    if (!token || !userId) return;

    const { error } = await supabase
      .from('profiles')
      .update({ push_token: token })
      .eq('id', userId);

    if (error) {
      console.log('[Push] save token error', error.message);
    } else {
      console.log('[Push] Token saved to server for user', userId);
    }
  } catch (e) {
    console.log('[Push] save token error', e);
  }
}

export async function setupNotificationHandlers(): Promise<() => void> {
  if (Platform.OS === 'web') return () => {};

  try {
    const Notifications = await import('expo-notifications');

    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });

    const responseSubscription = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        const data = response.notification.request.content.data;
        console.log('[Push] Notification tapped:', data);
      },
    );

    const receivedSubscription = Notifications.addNotificationReceivedListener(
      (notification) => {
        console.log('[Push] Notification received:', notification.request.content);
      },
    );

    return () => {
      responseSubscription.remove();
      receivedSubscription.remove();
    };
  } catch (e) {
    console.log('[Push] setup handlers error', e);
    return () => {};
  }
}

export async function sendPushToUser(userId: string, payload: PushPayload): Promise<void> {
  console.log('[Push] send to', userId, payload.title, payload.body);
  try {
    const { data: profile } = await supabase
      .from('profiles')
      .select('push_token')
      .eq('id', userId)
      .maybeSingle();

    const pushToken = (profile as any)?.push_token;
    if (!pushToken) {
      console.log('[Push] No push token for user', userId);
      return;
    }

    await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: pushToken,
        title: payload.title,
        body: payload.body,
        sound: 'default',
      }),
    });
    console.log('[Push] Push sent to', userId);
  } catch (e) {
    console.log('[Push] send error', e);
  }
}

export async function scheduleLocalNotification(
  title: string,
  body: string,
  seconds: number = 1,
): Promise<void> {
  if (Platform.OS === 'web') return;
  try {
    const Notifications = await import('expo-notifications');
    await Notifications.scheduleNotificationAsync({
      content: { title, body, sound: 'default' },
      trigger: { type: 'timeInterval' as any, seconds, repeats: false },
    });
    console.log('[Push] Local notification scheduled:', title);
  } catch (e) {
    console.log('[Push] schedule local error', e);
  }
}

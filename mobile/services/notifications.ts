import { Platform, Alert } from 'react-native';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { notificationsService } from './api';

const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

export const NORMAL_CHANNEL_ID = 'mt5_normal_v2';
export const NEAR_ENTRY_CHANNEL_ID = 'mt5_near_entry_v2';

export const NORMAL_SOUND_NAME = 'normal_notification.wav';
export const NEAR_ENTRY_SOUND_NAME = 'near_entry_alert.wav';

// Prevent auto-import crash in Expo Go by requiring dynamically
let Notifications: typeof import('expo-notifications') | null = null;
if (!isExpoGo) {
  try {
    Notifications = require('expo-notifications');
  } catch (e) {
    Notifications = null;
  }
}

export async function ensureNotificationChannels(): Promise<void> {
  if (isExpoGo || !Notifications || Platform.OS !== 'android') return;

  try {
    // 1. Normal 3-second notification channel (trade open, close, limit filled)
    await Notifications.setNotificationChannelAsync(NORMAL_CHANNEL_ID, {
      name: 'Trade Alerts (Standard)',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 200, 250],
      lightColor: '#00C896',
      sound: NORMAL_SOUND_NAME,
      enableVibrate: true,
      showBadge: true,
    });

    // 2. Urgent 9-second notification channel (price close to entry limit)
    await Notifications.setNotificationChannelAsync(NEAR_ENTRY_CHANNEL_ID, {
      name: 'Price Near Entry Alerts (Urgent)',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 500, 200, 500, 200, 500],
      lightColor: '#FFB800',
      sound: NEAR_ENTRY_SOUND_NAME,
      enableVibrate: true,
      showBadge: true,
    });
  } catch (e) {
    console.warn('Failed to create notification channels:', e);
  }
}

export async function registerForPushNotifications(): Promise<string | null> {
  if (isExpoGo || !Notifications) {
    console.log('Push notifications disabled in Expo Go');
    return null;
  }

  try {
    await ensureNotificationChannels();

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    
    if (finalStatus !== 'granted') {
      return null;
    }

    const projectId =
      Constants?.expoConfig?.extra?.eas?.projectId ??
      (Constants as any)?.easConfig?.projectId ??
      'cbff02c8-90bb-45b9-b6ed-d3230492923d';

    const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
    const token = tokenData.data;

    // Send push token to backend
    if (token) {
      try {
        await notificationsService.registerToken(
          token,
          Platform.OS === 'ios' ? 'ios' : 'android'
        );
      } catch (err) {
        console.warn('Failed to register push token with backend:', err);
      }
    }

    return token;
  } catch (error) {
    console.warn('Failed to get push token:', error);
    return null;
  }
}

export function setupNotificationHandlers(): void {
  if (isExpoGo || !Notifications) {
    console.log('Notification handlers disabled in Expo Go');
    return;
  }

  try {
    ensureNotificationChannels();

    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });

    Notifications.addNotificationReceivedListener(() => {});
    Notifications.addNotificationResponseReceivedListener(() => {});
  } catch (e) {
    console.warn('Failed to setup notification handler:', e);
  }
}

export async function showLocalNotification(title: string, body: string, data?: any): Promise<void> {
  const isNearEntry =
    data?.type === 'PRICE_NEAR_ENTRY' ||
    title?.toLowerCase().includes('near entry');

  const soundName = isNearEntry ? NEAR_ENTRY_SOUND_NAME : NORMAL_SOUND_NAME;
  const channelId = isNearEntry ? NEAR_ENTRY_CHANNEL_ID : NORMAL_CHANNEL_ID;

  if (Notifications) {
    try {
      await ensureNotificationChannels();
      await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data: data || {},
          sound: soundName,
          ...(Platform.OS === 'android' ? { channelId } : {}),
        } as any,
        trigger: Platform.OS === 'android' ? ({ channelId } as any) : null,
      });
      return;
    } catch (e) {
      console.warn('Could not schedule local notification:', e);
    }
  }

  // Fallback in-app alert for Expo Go or active screen
  Alert.alert(title, body);
}

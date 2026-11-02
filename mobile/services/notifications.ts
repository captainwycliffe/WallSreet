import { Platform, Alert } from 'react-native';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { notificationsService } from './api';

export const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

export const NORMAL_CHANNEL_ID = isExpoGo ? 'mt5_normal_expo_v3' : 'mt5_normal_v3';
export const NEAR_ENTRY_CHANNEL_ID = isExpoGo ? 'mt5_near_entry_expo_v3' : 'mt5_near_entry_v3';

export const NORMAL_SOUND_NAME = 'normal_notification.wav';
export const NEAR_ENTRY_SOUND_NAME = 'near_entry_alert.wav';

// IMPORTANT: In Expo SDK 53+, importing the top-level 'expo-notifications' barrel
// executes DevicePushTokenAutoRegistration.fx.js at module load time, which calls
// warnOfExpoGoPushUsage() and throws an Error on Android inside Expo Go!
// By loading the local notification submodules directly, local notifications,
// Android notification channels, permissions, and foreground banners work 100%
// natively in BOTH Expo Go and standalone APK builds.
let scheduleNotificationAsyncFn: any = null;
let setNotificationChannelAsyncFn: any = null;
let setNotificationHandlerFn: any = null;
let getPermissionsAsyncFn: any = null;
let requestPermissionsAsyncFn: any = null;
let addNotificationReceivedListenerFn: any = null;
let addNotificationResponseReceivedListenerFn: any = null;
let AndroidImportanceEnum: any = { MAX: 5, HIGH: 4, DEFAULT: 3 };
let SchedulableTriggerInputTypesEnum: any = { TIME_INTERVAL: 'timeInterval', DATE: 'date' };

try {
  scheduleNotificationAsyncFn = require('expo-notifications/build/scheduleNotificationAsync').scheduleNotificationAsync;
  setNotificationChannelAsyncFn = require('expo-notifications/build/setNotificationChannelAsync').setNotificationChannelAsync;
  setNotificationHandlerFn = require('expo-notifications/build/NotificationsHandler').setNotificationHandler;
  const perms = require('expo-notifications/build/NotificationPermissions');
  getPermissionsAsyncFn = perms.getPermissionsAsync;
  requestPermissionsAsyncFn = perms.requestPermissionsAsync;
  const emitter = require('expo-notifications/build/NotificationsEmitter');
  addNotificationReceivedListenerFn = emitter.addNotificationReceivedListener;
  addNotificationResponseReceivedListenerFn = emitter.addNotificationResponseReceivedListener;
  AndroidImportanceEnum = require('expo-notifications/build/NotificationChannelManager.types').AndroidImportance;
  SchedulableTriggerInputTypesEnum = require('expo-notifications/build/Notifications.types').SchedulableTriggerInputTypes;
} catch (e) {
  console.warn('Failed to load expo-notifications local submodules:', e);
}

export async function ensureNotificationPermissions(): Promise<boolean> {
  if (!getPermissionsAsyncFn || !requestPermissionsAsyncFn) return false;
  try {
    const { status: existingStatus } = await getPermissionsAsyncFn();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await requestPermissionsAsyncFn();
      finalStatus = status;
    }
    return finalStatus === 'granted';
  } catch (e) {
    console.warn('Notification permission check failed:', e);
    return false;
  }
}

export async function ensureNotificationChannels(): Promise<void> {
  if (!setNotificationChannelAsyncFn || Platform.OS !== 'android') return;

  try {
    // Note: In Expo Go, custom .wav files are not compiled into Expo Go's native res/raw/ folder,
    // so passing a custom filename on Android in Expo Go plays silence. Use 'default' in Expo Go
    // and the bundled 3s / 9s .wav files in the standalone APK.
    const normalSound = isExpoGo ? 'default' : NORMAL_SOUND_NAME;
    const nearEntrySound = isExpoGo ? 'default' : NEAR_ENTRY_SOUND_NAME;

    // 1. Normal 3-second notification channel (trade open, close, limit filled)
    await setNotificationChannelAsyncFn(NORMAL_CHANNEL_ID, {
      name: 'Trade Alerts (3s Standard)',
      importance: AndroidImportanceEnum.MAX,
      vibrationPattern: [0, 250, 200, 250],
      lightColor: '#00C896',
      sound: normalSound,
      enableVibrate: true,
      showBadge: true,
    });

    // 2. Urgent 9-second notification channel (price close to entry limit)
    await setNotificationChannelAsyncFn(NEAR_ENTRY_CHANNEL_ID, {
      name: 'Price Near Entry Alerts (9s Urgent)',
      importance: AndroidImportanceEnum.MAX,
      vibrationPattern: [0, 500, 200, 500, 200, 500],
      lightColor: '#FFB800',
      sound: nearEntrySound,
      enableVibrate: true,
      showBadge: true,
    });
  } catch (e) {
    console.warn('Failed to create notification channels:', e);
  }
}

export async function registerForPushNotifications(): Promise<string | null> {
  try {
    await ensureNotificationChannels();
    const granted = await ensureNotificationPermissions();
    if (!granted) {
      return null;
    }

    // Remote FCM push tokens are only supported in standalone APK / development builds (not Expo Go)
    if (isExpoGo) {
      console.log('Running in Expo Go: local OS notifications & WebSocket live alerts enabled (remote FCM push requires APK).');
      return null;
    }

    const { getExpoPushTokenAsync } = require('expo-notifications/build/getExpoPushTokenAsync');

    const projectId =
      Constants?.expoConfig?.extra?.eas?.projectId ??
      (Constants as any)?.easConfig?.projectId ??
      'cbff02c8-90bb-45b9-b6ed-d3230492923d';

    const applicationId =
      Constants?.expoConfig?.android?.package ??
      'com.wallsreet.mt5monitor';

    // Explicitly pass both projectId and applicationId so getExpoPushTokenAsync
    // does not fail if expo-application native module is absent
    const tokenData = await getExpoPushTokenAsync({
      projectId,
      applicationId,
    });
    const token = tokenData?.data;

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
  if (!setNotificationHandlerFn) return;

  try {
    ensureNotificationChannels();

    setNotificationHandlerFn({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
      }),
    });

    if (addNotificationReceivedListenerFn) {
      addNotificationReceivedListenerFn(() => {});
    }
    if (addNotificationResponseReceivedListenerFn) {
      addNotificationResponseReceivedListenerFn(() => {});
    }
  } catch (e) {
    console.warn('Failed to setup notification handler:', e);
  }
}

export async function showLocalNotification(title: string, body: string, data?: any): Promise<void> {
  const isNearEntry =
    data?.type === 'PRICE_NEAR_ENTRY' ||
    title?.toLowerCase().includes('near entry');

  const soundName = isExpoGo ? 'default' : (isNearEntry ? NEAR_ENTRY_SOUND_NAME : NORMAL_SOUND_NAME);
  const channelId = isNearEntry ? NEAR_ENTRY_CHANNEL_ID : NORMAL_CHANNEL_ID;

  if (scheduleNotificationAsyncFn) {
    try {
      await ensureNotificationChannels();
      await ensureNotificationPermissions();
      await scheduleNotificationAsyncFn({
        content: {
          title,
          body,
          data: data || {},
          sound: soundName,
          ...(Platform.OS === 'android' ? { channelId } : {}),
        },
        trigger: Platform.OS === 'android' ? { channelId } : null,
      });
      return;
    } catch (e) {
      console.warn('Channel trigger failed, retrying with null trigger:', e);
      try {
        await scheduleNotificationAsyncFn({
          content: {
            title,
            body,
            data: data || {},
            sound: soundName,
          },
          trigger: null,
        });
        return;
      } catch (err2) {
        console.warn('Could not schedule local notification:', err2);
      }
    }
  }

  // Final fallback in-app alert if OS notifications are blocked
  Alert.alert(title, body);
}

export async function scheduleDelayedLocalNotification(
  title: string,
  body: string,
  seconds: number = 5,
  isNearEntry: boolean = false
): Promise<boolean> {
  if (!scheduleNotificationAsyncFn) return false;
  const soundName = isExpoGo ? 'default' : (isNearEntry ? NEAR_ENTRY_SOUND_NAME : NORMAL_SOUND_NAME);
  const channelId = isNearEntry ? NEAR_ENTRY_CHANNEL_ID : NORMAL_CHANNEL_ID;

  try {
    await ensureNotificationChannels();
    await ensureNotificationPermissions();
    await scheduleNotificationAsyncFn({
      content: {
        title,
        body,
        data: { type: isNearEntry ? 'PRICE_NEAR_ENTRY' : 'TRADE_OPENED', delayedTest: true },
        sound: soundName,
        ...(Platform.OS === 'android' ? { channelId } : {}),
      },
      trigger: {
        type: SchedulableTriggerInputTypesEnum.TIME_INTERVAL,
        seconds,
        repeats: false,
        ...(Platform.OS === 'android' ? { channelId } : {}),
      },
    });
    return true;
  } catch (e) {
    console.warn('Failed to schedule delayed notification:', e);
    return false;
  }
}

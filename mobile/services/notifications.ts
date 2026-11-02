import { Platform, Alert } from 'react-native';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { notificationsService } from './api';

export const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

export const NORMAL_CHANNEL_ID = 'mt5_normal_v3';
export const NEAR_ENTRY_CHANNEL_ID = 'mt5_near_entry_v3';

export const NORMAL_SOUND_NAME = 'normal_notification.wav';
export const NEAR_ENTRY_SOUND_NAME = 'near_entry_alert.wav';

// IMPORTANT: In Expo SDK 53+, importing the top-level 'expo-notifications' barrel
// executes DevicePushTokenAutoRegistration.fx.js at module load time, which calls
// warnOfExpoGoPushUsage() and throws an Error on Android inside Expo Go!
// By loading the local notification submodules directly, local notifications,
// permissions, and foreground banners work 100% natively in BOTH Expo Go and standalone APK builds.
let scheduleNotificationAsyncFn: any = null;
let setNotificationChannelAsyncFn: any = null;
let setNotificationHandlerFn: any = null;
let getPermissionsAsyncFn: any = null;
let requestPermissionsAsyncFn: any = null;
let addNotificationReceivedListenerFn: any = null;
let addNotificationResponseReceivedListenerFn: any = null;
let AndroidImportanceEnum: any = { MAX: 5, HIGH: 4, DEFAULT: 3 };
let SchedulableTriggerInputTypesEnum: any = { TIME_INTERVAL: 'timeInterval', DATE: 'date' };

export async function playCustomSound(isNearEntry: boolean): Promise<void> {
  try {
    const { createAudioPlayer, setAudioModeAsync } = require('expo-audio');
    await setAudioModeAsync({ playsInSilentMode: true });
    const soundAsset = isNearEntry
      ? require('../assets/sounds/near_entry_alert.wav')
      : require('../assets/sounds/normal_notification.wav');
    const player = createAudioPlayer(soundAsset);
    player.play();
  } catch (e) {
    console.warn('Audio playback error:', e);
  }
}

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
  // In Expo Go on Android, NotificationsChannelsProvider is null and throws NullPointerException.
  // Custom notification channels & custom .wav sounds are only supported in standalone APK builds.
  if (isExpoGo || !setNotificationChannelAsyncFn || Platform.OS !== 'android') return;

  try {
    // 1. Normal 3-second notification channel (trade open, close, limit filled)
    await setNotificationChannelAsyncFn(NORMAL_CHANNEL_ID, {
      name: 'Trade Alerts (3s Standard)',
      importance: AndroidImportanceEnum.MAX,
      vibrationPattern: [0, 250, 200, 250],
      lightColor: '#00C896',
      sound: NORMAL_SOUND_NAME,
      enableVibrate: true,
      showBadge: true,
    });

    // 2. Urgent 9-second notification channel (price close to entry limit)
    await setNotificationChannelAsyncFn(NEAR_ENTRY_CHANNEL_ID, {
      name: 'Price Near Entry Alerts (9s Urgent)',
      importance: AndroidImportanceEnum.MAX,
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
  try {
    await ensureNotificationChannels();
    const granted = await ensureNotificationPermissions();
    if (!granted) {
      return null;
    }

    // Remote FCM push tokens are only supported in standalone APK / development builds (not Expo Go)
    if (isExpoGo) {
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
      addNotificationReceivedListenerFn((notification: any) => {
        if (isExpoGo) {
          const type = notification?.request?.content?.data?.type;
          const isNear = type === 'PRICE_NEAR_ENTRY';
          playCustomSound(isNear);
        }
      });
    }
    if (addNotificationResponseReceivedListenerFn) {
      addNotificationResponseReceivedListenerFn(() => {});
    }
  } catch (e) {
    console.warn('Failed to setup notification handler:', e);
  }
}

let lastDisplayedNotifTime = 0;
let lastDisplayedNotifTitle = '';

export async function showLocalNotification(title: string, body: string, data?: any): Promise<void> {
  // Prevent duplicate double-firing within 1.5s if both WS and fallback trigger
  const now = Date.now();
  if (title === lastDisplayedNotifTitle && now - lastDisplayedNotifTime < 1500) {
    return;
  }
  lastDisplayedNotifTime = now;
  lastDisplayedNotifTitle = title;

  const isNearEntry =
    data?.type === 'PRICE_NEAR_ENTRY' ||
    title?.toLowerCase().includes('near entry');

  const soundName = isExpoGo ? 'default' : (isNearEntry ? NEAR_ENTRY_SOUND_NAME : NORMAL_SOUND_NAME);
  const channelId = isNearEntry ? NEAR_ENTRY_CHANNEL_ID : NORMAL_CHANNEL_ID;
  const useAndroidChannel = !isExpoGo && Platform.OS === 'android';

  if (isExpoGo) {
    playCustomSound(isNearEntry);
  }

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
          ...(useAndroidChannel ? { channelId } : {}),
        },
        // In Expo Go on Android, trigger must be null (channel trigger crashes NotificationsChannelsProvider)
        trigger: useAndroidChannel ? { channelId } : null,
      });
      return;
    } catch (e) {
      try {
        await scheduleNotificationAsyncFn({
          content: {
            title,
            body,
            data: data || {},
            sound: 'default',
          },
          trigger: null,
        });
        return;
      } catch (err2) {
        console.warn('Could not schedule local notification:', err2);
      }
    }
  }

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
  const useAndroidChannel = !isExpoGo && Platform.OS === 'android';

  try {
    await ensureNotificationChannels();
    await ensureNotificationPermissions();
    await scheduleNotificationAsyncFn({
      content: {
        title,
        body,
        data: { type: isNearEntry ? 'PRICE_NEAR_ENTRY' : 'TRADE_OPENED', delayedTest: true },
        sound: soundName,
        ...(useAndroidChannel ? { channelId } : {}),
      },
      trigger: {
        type: SchedulableTriggerInputTypesEnum.TIME_INTERVAL,
        seconds,
        repeats: false,
        ...(useAndroidChannel ? { channelId } : {}),
      },
    });
    return true;
  } catch (e) {
    console.warn('Failed to schedule delayed notification:', e);
    return false;
  }
}

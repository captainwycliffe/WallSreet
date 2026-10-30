import { Platform, Alert } from 'react-native';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { notificationsService } from './api';

const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

// Prevent auto-import crash in Expo Go by requiring dynamically
let Notifications: typeof import('expo-notifications') | null = null;
if (!isExpoGo) {
  try {
    Notifications = require('expo-notifications');
  } catch (e) {
    Notifications = null;
  }
}

export async function registerForPushNotifications(): Promise<string | null> {
  if (isExpoGo || !Notifications) {
    console.log('Push notifications disabled in Expo Go');
    return null;
  }

  try {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#00C896',
      });
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    
    if (finalStatus !== 'granted') {
      return null;
    }

    const tokenData = await Notifications.getExpoPushTokenAsync();
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
    console.error('Failed to get push token:', error);
    return null;
  }
}

export function setupNotificationHandlers(): void {
  if (isExpoGo || !Notifications) {
    console.log('Notification handlers disabled in Expo Go');
    return;
  }

  try {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
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
  if (Notifications) {
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data: data || {},
          sound: true,
        },
        trigger: null,
      });
      return;
    } catch (e) {
      console.warn('Could not schedule local notification:', e);
    }
  }

  // Fallback in-app alert for Expo Go or active screen
  Alert.alert(title, body);
}
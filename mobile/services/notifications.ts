import { Platform } from 'react-native';
import Constants, { ExecutionEnvironment } from 'expo-constants';

const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

// Prevent auto-import crash in Expo Go by requiring dynamically
let Notifications: typeof import('expo-notifications') | null = null;
if (!isExpoGo) {
  Notifications = require('expo-notifications');
}

export async function registerForPushNotifications(): Promise<string | null> {
  if (isExpoGo || !Notifications) {
    console.log('Push notifications disabled in Expo Go');
    return null;
  }

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

  try {
    const tokenData = await Notifications.getExpoPushTokenAsync();
    return tokenData.data;
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
}
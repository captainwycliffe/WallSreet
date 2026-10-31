import { Stack, useRouter, useSegments, useRootNavigationState } from 'expo-router';
import { useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuthStore } from '../store/authStore';
import { useFonts, Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold } from '@expo-google-fonts/inter';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { wsService } from '../services/websocket';
import { storage } from '../services/storage';
import { notificationsService } from '../services/api';
import { setupNotificationHandlers, registerForPushNotifications, showLocalNotification } from '../services/notifications';

const queryClient = new QueryClient();

export default function RootLayout() {
  const { user, isAuthenticated, loadUser, isLoading } = useAuthStore();
  const segments = useSegments();
  const router = useRouter();
  const seenNotifIds = useRef<Set<string>>(new Set());
  const initializedHistoryRef = useRef<boolean>(false);

  // SDK 57 / RN 0.86 fix: navigation must not be called before the root
  // navigation container has mounted. useRootNavigationState().key is
  // undefined until the navigator is ready.
  const navigationState = useRootNavigationState();
  const navigationReady = !!navigationState?.key;

  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    loadUser();
  }, []);

  useEffect(() => {
    // Wait until the nav root is mounted, fonts are loaded, and auth is resolved
    if (!navigationReady || isLoading || !fontsLoaded) return;

    const inAuthGroup = segments[0] === '(auth)';

    if (!isAuthenticated && !inAuthGroup) {
      router.replace('/(auth)/login');
    } else if (isAuthenticated && inAuthGroup) {
      router.replace('/(tabs)');
    }
  }, [navigationReady, isAuthenticated, segments, isLoading, fontsLoaded]);

  // Connect WebSocket & Register Push Notifications when authenticated
  useEffect(() => {
    if (!isAuthenticated || !user) {
      wsService.disconnect();
      return;
    }

    setupNotificationHandlers();
    registerForPushNotifications();

    let isMounted = true;
    const connectWs = async () => {
      const token = await storage.getAccessToken();
      if (token && isMounted) {
        wsService.connect(user.id, token);
      }
    };
    connectWs();

    // Sync notification history to surface any alerts fired while backgrounded
    const syncMissedNotifications = async () => {
      try {
        const history = await notificationsService.getHistory();
        if (!Array.isArray(history) || !isMounted) return;

        if (!initializedHistoryRef.current) {
          // On initial boot, mark existing history as seen so old logs don't replay
          history.forEach((item: any) => {
            if (item?.id) seenNotifIds.current.add(String(item.id));
          });
          initializedHistoryRef.current = true;
          return;
        }

        // Surface any newly created notification from the last 5 minutes not yet seen
        const fiveMinsAgo = Date.now() - 5 * 60 * 1000;
        const unseen = history
          .filter((item: any) => {
            if (!item?.id || seenNotifIds.current.has(String(item.id))) return false;
            const sentTime = item.sent_at ? new Date(item.sent_at).getTime() : Date.now();
            return sentTime >= fiveMinsAgo;
          })
          .reverse();

        for (const item of unseen) {
          seenNotifIds.current.add(String(item.id));
          await showLocalNotification(item.title, item.body, {
            ...(item.data || {}),
            type: item.type,
          });
        }
      } catch {
        // Ignore network errors during background poll
      }
    };

    syncMissedNotifications();
    const pollInterval = setInterval(syncMissedNotifications, 12000);

    // Reconnect WS & catch up immediately when app returns from background
    const appStateSub = AppState.addEventListener('change', (nextState: AppStateStatus) => {
      if (nextState === 'active') {
        connectWs();
        syncMissedNotifications();
        queryClient.invalidateQueries({ queryKey: ['trades'] });
        queryClient.invalidateQueries({ queryKey: ['accounts'] });
        queryClient.invalidateQueries({ queryKey: ['pois'] });
      }
    });

    // Listen for push/in-app notification broadcasts over WebSocket
    const unsubNotification = wsService.on('NOTIFICATION', (msg: any) => {
      const notifId = msg?.data?.id;
      if (notifId) {
        if (seenNotifIds.current.has(String(notifId))) return;
        seenNotifIds.current.add(String(notifId));
      }
      const title = msg?.data?.title || 'Notification';
      const body = msg?.data?.body || '';
      showLocalNotification(title, body, msg?.data);
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    });

    // Auto-invalidate React Query queries on real-time events
    const unsubPoiCreated = wsService.on('POI_CREATED', () => {
      queryClient.invalidateQueries({ queryKey: ['pois'] });
    });
    const unsubPoiUpdated = wsService.on('POI_UPDATED', () => {
      queryClient.invalidateQueries({ queryKey: ['pois'] });
    });
    const unsubPoiExpired = wsService.on('POI_EXPIRED', () => {
      queryClient.invalidateQueries({ queryKey: ['pois'] });
    });

    const unsubPosOpened = wsService.on('POSITION_OPENED', () => {
      queryClient.invalidateQueries({ queryKey: ['trades'] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
    });
    const unsubPosUpdated = wsService.on('POSITION_UPDATED', () => {
      queryClient.invalidateQueries({ queryKey: ['trades'] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
    });
    const unsubPosClosed = wsService.on('POSITION_CLOSED', () => {
      queryClient.invalidateQueries({ queryKey: ['trades'] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
    });

    const unsubAccountUpdated = wsService.on('ACCOUNT_UPDATED', () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
    });

    return () => {
      isMounted = false;
      clearInterval(pollInterval);
      appStateSub.remove();
      unsubNotification();
      unsubPoiCreated();
      unsubPoiUpdated();
      unsubPoiExpired();
      unsubPosOpened();
      unsubPosUpdated();
      unsubPosClosed();
      unsubAccountUpdated();
      wsService.disconnect();
    };
  }, [isAuthenticated, user?.id]);

  if (!fontsLoaded || isLoading) {
    return null;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <SafeAreaProvider>
        <GestureHandlerRootView style={{ flex: 1 }}>
          <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#0A0A0F' } }} />
        </GestureHandlerRootView>
      </SafeAreaProvider>
    </QueryClientProvider>
  );
}

import { View, Text, Switch, Alert, ScrollView, StyleSheet, Platform, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState, useEffect, useCallback } from 'react';
import { Header } from '../../../../components/ui/Header';
import { Card } from '../../../../components/ui/Card';
import {
  isExpoGo,
  ensureNotificationPermissions,
  registerForPushNotifications,
  showLocalNotification,
  scheduleDelayedLocalNotification,
  playCustomSound,
} from '../../../../services/notifications';
import { notificationsService, PushTokenRecord } from '../../../../services/api';
import { wsService } from '../../../../services/websocket';

const C = {
  bg: '#0A0A0F',
  green: '#00C896',
  amber: '#FFB800',
  blue: '#3D85FF',
  red: '#FF3D5A',
  white: '#FFFFFF',
  textSecondary: '#8888A8',
  border: '#1F1F2E',
  surface: '#14141F',
};

export default function SettingsScreen() {
  const [pushEnabled, setPushEnabled] = useState(false);
  const [registering, setRegistering] = useState(false);
  const [testingType, setTestingType] = useState<string | null>(null);
  const [osPermGranted, setOsPermGranted] = useState<boolean | null>(null);
  const [wsConnected, setWsConnected] = useState<boolean>(wsService.isConnected());
  const [tokens, setTokens] = useState<PushTokenRecord[]>([]);
  const [lastDiag, setLastDiag] = useState<string | null>(null);

  const refreshDiagnostics = useCallback(async () => {
    try {
      const granted = await ensureNotificationPermissions();
      setOsPermGranted(granted);
      setWsConnected(wsService.isConnected());
      const serverTokens = await notificationsService.getTokens();
      setTokens(serverTokens || []);
      if (granted && (serverTokens?.length > 0 || isExpoGo)) {
        setPushEnabled(true);
      }
    } catch (e) {
      // Ignore network errors during initial check
    }
  }, []);

  useEffect(() => {
    refreshDiagnostics();
    const timer = setInterval(() => {
      setWsConnected(wsService.isConnected());
    }, 3000);
    return () => clearInterval(timer);
  }, [refreshDiagnostics]);

  const handleTogglePush = async (value: boolean) => {
    if (!value) {
      setPushEnabled(false);
      return;
    }
    setRegistering(true);
    try {
      const granted = await ensureNotificationPermissions();
      setOsPermGranted(granted);
      if (!granted) {
        Alert.alert('Permission needed', 'Enable notifications for this app in your device settings to receive alerts.');
        return;
      }
      const token = await registerForPushNotifications();
      if (token) {
        await notificationsService.registerToken(token, Platform.OS === 'ios' ? 'ios' : 'android');
      }
      await refreshDiagnostics();
      setPushEnabled(true);
      if (isExpoGo) {
        Alert.alert(
          'Expo Go Mode Active',
          'OS Notification banners & live WebSocket notifications are now active in Expo Go! Use the test buttons below to verify.'
        );
      }
    } catch (e) {
      Alert.alert('Error', 'Could not enable push notifications. Please try again.');
    } finally {
      setRegistering(false);
    }
  };

  const handleServerTest = async (type: 'TRADE_OPENED' | 'PRICE_NEAR_ENTRY') => {
    setTestingType(type);
    setLastDiag(null);
    try {
      const isNearEntry = type === 'PRICE_NEAR_ENTRY';
      const title = isNearEntry
        ? '⚠️ Price Alert: Near Entry (Test)'
        : '📈 Trade Activated (Test)';
      const body = isNearEntry
        ? 'XAUUSD.m is near your BUY_LIMIT entry! Current: 3021.20 (Entry: 3020.00)'
        : 'XAUUSD.m BUY 0.2 lots opened @ 3020.00';

      // 1. Trigger local OS banner immediately so user sees & hears it right away
      await showLocalNotification(title, body, { type });

      // 2. Also dispatch via backend API (which logs & broadcasts over WS/FCM)
      const res = await notificationsService.sendTest(type);
      await refreshDiagnostics();
      const summary = [
        `OS Banner Displayed: YES`,
        `Server Dispatch: ${res.success ? 'SUCCESS' : 'FAILED'}`,
        `WebSocket Stream: ${wsService.isConnected() ? 'CONNECTED' : 'RECONNECTING'}`,
        `Target Channel: ${res.channel_id}`,
        `APK Sound: ${res.sound}`,
        ...(res.push_errors?.length ? [`Errors: ${res.push_errors.join(', ')}`] : []),
      ].join('\n');
      setLastDiag(summary);
    } catch (e: any) {
      setLastDiag(`Test error: ${e?.message || 'Request failed'}`);
    } finally {
      setTestingType(null);
    }
  };

  const handleDelayedBackgroundTest = async () => {
    setTestingType('DELAYED');
    try {
      const ok = await scheduleDelayedLocalNotification(
        '⚠️ Price Alert: Near Entry (Background Test)',
        'XAUUSD.m is $1.20 from your BUY_LIMIT @ 3020.00! (Delivered while app minimized)',
        5,
        true
      );
      if (ok) {
        setLastDiag('Scheduled OS notification for 5 seconds from now! Press your phone Home button NOW to watch it pop up while minimized.');
      } else {
        Alert.alert('Error', 'Could not schedule background test notification.');
      }
    } finally {
      setTestingType(null);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <Header title="Settings" subtitle="App preferences & notification diagnostics" />
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        <Card style={styles.cardFirst}>
          <View style={styles.row}>
            <View style={styles.rowText}>
              <Text style={styles.rowTitle}>Push & Live Notifications</Text>
              <Text style={styles.rowSubtitle}>
                Get alerted on trade opens, closes, limit orders, and near-entry prices
              </Text>
            </View>
            <Switch
              value={pushEnabled}
              onValueChange={handleTogglePush}
              disabled={registering}
              trackColor={{ true: C.green }}
            />
          </View>
        </Card>

        <Card style={styles.cardSpacing}>
          <Text style={styles.sectionTitle}>Notification Pipeline Status</Text>

          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>Runtime Environment</Text>
            <Text style={[styles.statusValue, { color: isExpoGo ? C.amber : C.green }]}>
              {isExpoGo ? 'Expo Go (WS + Local OS)' : 'Standalone APK (FCM + WS)'}
            </Text>
          </View>

          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>OS Notification Permission</Text>
            <Text style={[styles.statusValue, { color: osPermGranted ? C.green : C.red }]}>
              {osPermGranted === null ? 'Checking...' : osPermGranted ? 'GRANTED' : 'NOT GRANTED'}
            </Text>
          </View>

          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>Live WebSocket Stream</Text>
            <Text style={[styles.statusValue, { color: wsConnected ? C.green : C.red }]}>
              {wsConnected ? 'CONNECTED' : 'DISCONNECTED'}
            </Text>
          </View>

          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>Backend FCM Push Tokens</Text>
            <Text style={[styles.statusValue, { color: tokens.length > 0 ? C.green : C.textSecondary }]}>
              {tokens.length > 0 ? `${tokens.length} Active` : isExpoGo ? '0 (APK Only)' : '0 Registered'}
            </Text>
          </View>

          <View style={styles.divider} />

          <Text style={styles.sectionTitle}>Live Notification Test Suite</Text>
          <Text style={styles.helperText}>
            Test the full notification pipeline in Expo first before building the APK.
          </Text>

          <TouchableOpacity
            style={[styles.testBtn, { borderColor: C.green }]}
            onPress={() => handleServerTest('TRADE_OPENED')}
            disabled={!!testingType}
          >
            {testingType === 'TRADE_OPENED' ? (
              <ActivityIndicator size="small" color={C.green} />
            ) : (
              <Text style={[styles.testBtnText, { color: C.green }]}>
                🔔 Test Normal Notification (3s Sound)
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.testBtn, { borderColor: C.amber }]}
            onPress={() => handleServerTest('PRICE_NEAR_ENTRY')}
            disabled={!!testingType}
          >
            {testingType === 'PRICE_NEAR_ENTRY' ? (
              <ActivityIndicator size="small" color={C.amber} />
            ) : (
              <Text style={[styles.testBtnText, { color: C.amber }]}>
                ⚠️ Test Near-Entry Alert (9s Urgent Sound)
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.testBtn, { borderColor: C.blue }]}
            onPress={handleDelayedBackgroundTest}
            disabled={!!testingType}
          >
            {testingType === 'DELAYED' ? (
              <ActivityIndicator size="small" color={C.blue} />
            ) : (
              <Text style={[styles.testBtnText, { color: C.blue }]}>
                ⏱️ Test Minimized Banner (5s Delay — Press Home)
              </Text>
            )}
          </TouchableOpacity>

          <View style={styles.soundPreviewRow}>
            <TouchableOpacity
              style={[styles.soundBtn, { borderColor: C.green }]}
              onPress={() => playCustomSound(false)}
            >
              <Text style={[styles.soundBtnText, { color: C.green }]}>
                🔊 Play 3s Sound
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.soundBtn, { borderColor: C.amber }]}
              onPress={() => playCustomSound(true)}
            >
              <Text style={[styles.soundBtnText, { color: C.amber }]}>
                🔊 Play 9s Sound
              </Text>
            </TouchableOpacity>
          </View>

          {lastDiag && (
            <View style={styles.diagBox}>
              <Text style={styles.diagText}>{lastDiag}</Text>
            </View>
          )}
        </Card>

        <Card>
          <Text style={styles.versionLabel}>App version</Text>
          <Text style={styles.versionValue}>1.0.0</Text>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: C.bg,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  cardFirst: {
    marginTop: 16,
    marginBottom: 16,
  },
  cardSpacing: {
    marginBottom: 16,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rowText: {
    flex: 1,
    marginRight: 16,
  },
  rowTitle: {
    color: C.white,
    fontWeight: '600',
    fontSize: 15,
  },
  rowSubtitle: {
    color: C.textSecondary,
    fontSize: 12,
    marginTop: 4,
  },
  sectionTitle: {
    color: C.white,
    fontWeight: '600',
    fontSize: 14,
    marginBottom: 10,
  },
  helperText: {
    color: C.textSecondary,
    fontSize: 12,
    marginBottom: 12,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  statusLabel: {
    color: C.textSecondary,
    fontSize: 13,
  },
  statusValue: {
    fontWeight: '600',
    fontSize: 13,
  },
  divider: {
    height: 1,
    backgroundColor: C.border,
    marginVertical: 14,
  },
  testBtn: {
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
    backgroundColor: C.surface,
  },
  testBtnText: {
    fontWeight: '600',
    fontSize: 13,
  },
  soundPreviewRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },
  soundBtn: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: C.surface,
  },
  soundBtnText: {
    fontWeight: '600',
    fontSize: 12,
  },
  diagBox: {
    marginTop: 8,
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#0D0D16',
    borderWidth: 1,
    borderColor: C.border,
  },
  diagText: {
    color: C.white,
    fontSize: 12,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    lineHeight: 18,
  },
  versionLabel: {
    color: C.textSecondary,
    fontSize: 12,
  },
  versionValue: {
    color: C.white,
    fontWeight: '500',
    marginTop: 4,
  },
});

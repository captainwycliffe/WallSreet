import { View, Text, Switch, Alert, ScrollView, StyleSheet, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState, useEffect } from 'react';
import { Header } from '../../../../components/ui/Header';
import { Card } from '../../../../components/ui/Card';
import {
  ensureNotificationPermissions,
  registerForPushNotifications,
} from '../../../../services/notifications';
import { notificationsService } from '../../../../services/api';

const C = {
  bg: '#0A0A0F',
  green: '#00C896',
  white: '#FFFFFF',
  textSecondary: '#8888A8',
};

export default function SettingsScreen() {
  const [pushEnabled, setPushEnabled] = useState(false);
  const [registering, setRegistering] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const granted = await ensureNotificationPermissions();
        const tokens = await notificationsService.getTokens();
        if (granted && tokens && tokens.length > 0) {
          setPushEnabled(true);
        }
      } catch {
        // Ignore initialization check errors
      }
    })();
  }, []);

  const handleTogglePush = async (value: boolean) => {
    if (!value) {
      setPushEnabled(false);
      return;
    }
    setRegistering(true);
    try {
      const granted = await ensureNotificationPermissions();
      if (!granted) {
        Alert.alert(
          'Permission Needed',
          'Please enable notifications for this app in your device settings to receive real-time alerts.'
        );
        return;
      }
      const token = await registerForPushNotifications();
      if (token) {
        await notificationsService.registerToken(
          token,
          Platform.OS === 'ios' ? 'ios' : 'android'
        );
      }
      setPushEnabled(true);
    } catch (e) {
      Alert.alert('Error', 'Could not enable push notifications. Please try again.');
    } finally {
      setRegistering(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <Header title="Settings" subtitle="App preferences" />
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        <Card style={styles.cardFirst}>
          <View style={styles.row}>
            <View style={styles.rowText}>
              <Text style={styles.rowTitle}>Push notifications</Text>
              <Text style={styles.rowSubtitle}>
                Get real-time trade execution, limit order, and near-entry price alerts
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
    fontWeight: '500',
    fontSize: 15,
  },
  rowSubtitle: {
    color: C.textSecondary,
    fontSize: 12,
    marginTop: 4,
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

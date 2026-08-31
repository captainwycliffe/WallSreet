import { View, Text, Switch, Alert, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState } from 'react';
import { Header } from '../../../../components/ui/Header';
import { Card } from '../../../../components/ui/Card';
import { registerForPushNotifications } from '../../../../services/notifications';
import { notificationsService } from '../../../../services/api';
import { Platform } from 'react-native';

export default function SettingsScreen() {
  const [pushEnabled, setPushEnabled] = useState(false);
  const [registering, setRegistering] = useState(false);

  const handleTogglePush = async (value: boolean) => {
    if (!value) {
      setPushEnabled(false);
      return;
    }
    setRegistering(true);
    try {
      // This connects two pieces that existed separately but were never
      // wired together: the local Expo permission/token flow
      // (services/notifications.ts) and the backend registration route
      // (services/api.ts's notificationsService, built in Phase 2).
      const token = await registerForPushNotifications();
      if (!token) {
        Alert.alert('Permission needed', 'Enable notifications for this app in your device settings to receive alerts.');
        return;
      }
      await notificationsService.registerToken(token, Platform.OS === 'ios' ? 'ios' : 'android');
      setPushEnabled(true);
    } catch (e) {
      Alert.alert('Error', 'Could not enable push notifications. Please try again.');
    } finally {
      setRegistering(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-background">
      <Header title="Settings" subtitle="App preferences" />
      <ScrollView className="flex-1 px-4">
        <Card className="mt-4 mb-4">
          <View className="flex-row items-center justify-between">
            <View className="flex-1 mr-4">
              <Text className="text-white font-interMedium">Push notifications</Text>
              <Text className="text-textSecondary text-xs mt-1">
                Get alerted when an EA goes offline or a trade closes
              </Text>
            </View>
            <Switch
              value={pushEnabled}
              onValueChange={handleTogglePush}
              disabled={registering}
              trackColor={{ true: '#00C896' }}
            />
          </View>
        </Card>

        <Card>
          <Text className="text-textSecondary text-xs">App version</Text>
          <Text className="text-white font-interMedium mt-1">1.0.0</Text>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

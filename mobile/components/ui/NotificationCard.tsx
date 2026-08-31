import React from 'react';
import { View, Text } from 'react-native';
import { Bell, CheckCircle2, XCircle } from 'lucide-react-native';
import { Card } from './Card';
import { NotificationRecord } from '../../services/api';

function formatWhen(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

interface NotificationCardProps {
  notification: NotificationRecord;
}

export function NotificationCard({ notification }: NotificationCardProps) {
  return (
    <Card className="mb-3 flex-row items-start">
      <View className="w-9 h-9 bg-surface2 rounded-full items-center justify-center mr-3">
        <Bell size={16} color="#00C896" />
      </View>
      <View className="flex-1">
        <View className="flex-row items-center justify-between">
          <Text className="text-white font-interSemiBold flex-1" numberOfLines={1}>{notification.title}</Text>
          {notification.success ? (
            <CheckCircle2 size={16} color="#00C896" />
          ) : (
            <XCircle size={16} color="#FF4757" />
          )}
        </View>
        <Text className="text-textSecondary text-sm mt-1">{notification.body}</Text>
        <Text className="text-textMuted text-xs mt-2">{formatWhen(notification.sent_at)}</Text>
      </View>
    </Card>
  );
}

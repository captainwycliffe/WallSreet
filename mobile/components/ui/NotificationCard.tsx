import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Bell, CheckCircle2, XCircle } from 'lucide-react-native';
import { Card } from './Card';
import { NotificationRecord } from '../../services/api';

const C = {
  white: '#FFFFFF',
  surface2: '#1C1C28',
  green: '#00C896',
  red: '#FF4757',
  textSecondary: '#8888A8',
  textMuted: '#555577',
};

function formatWhen(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

interface NotificationCardProps {
  notification: NotificationRecord;
}

export function NotificationCard({ notification }: NotificationCardProps) {
  return (
    <Card style={styles.card}>
      <View style={styles.iconCircle}>
        <Bell size={16} color={C.green} />
      </View>
      <View style={styles.content}>
        <View style={styles.titleRow}>
          <Text style={styles.title} numberOfLines={1}>{notification.title}</Text>
          {notification.success ? (
            <CheckCircle2 size={16} color={C.green} />
          ) : (
            <XCircle size={16} color={C.red} />
          )}
        </View>
        <Text style={styles.body}>{notification.body}</Text>
        <Text style={styles.when}>{formatWhen(notification.sent_at)}</Text>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  iconCircle: {
    width: 36,
    height: 36,
    backgroundColor: C.surface2,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  content: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    color: C.white,
    fontWeight: '600',
    flex: 1,
  },
  body: {
    color: C.textSecondary,
    fontSize: 14,
    marginTop: 4,
  },
  when: {
    color: C.textMuted,
    fontSize: 12,
    marginTop: 8,
  },
});

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Cpu } from 'lucide-react-native';
import { Card } from './Card';
import { StatusBadge } from './StatusBadge';
import { EARegistration } from '../../types/account';

const C = {
  white: '#FFFFFF',
  surface2: '#1C1C28',
  border: '#2A2A3A',
  green: '#00C896',
  textSecondary: '#8888A8',
};

function timeAgo(iso?: string): string {
  if (!iso) return 'never';
  const time = new Date(iso).getTime();
  if (isNaN(time)) return 'recently';
  const diffMs = Date.now() - time;
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

interface EAStatusCardProps {
  ea: EARegistration;
  onRevoke?: () => void;
}

export function EAStatusCard({ ea, onRevoke }: EAStatusCardProps) {
  return (
    <Card style={styles.card}>
      <View style={styles.topRow}>
        <View style={styles.leftRow}>
          <View style={styles.iconCircle}>
            <Cpu size={18} color={C.green} />
          </View>
          <View style={styles.nameBlock}>
            <Text style={styles.name} numberOfLines={1}>{ea?.name || 'Expert Advisor'}</Text>
            <Text style={styles.version} numberOfLines={1}>v{ea?.version || '1.0'}</Text>
          </View>
        </View>
        <StatusBadge status={ea?.status} />
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statCol}>
          <Text style={styles.statLabel}>Last heartbeat</Text>
          <Text style={styles.statValue} numberOfLines={1}>{timeAgo(ea?.last_heartbeat)}</Text>
        </View>
        <View style={styles.statCol}>
          <Text style={styles.statLabel}>Connected since</Text>
          <Text style={styles.statValue} numberOfLines={1}>{timeAgo(ea?.connected_since)}</Text>
        </View>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: 12,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  leftRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
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
  nameBlock: {
    flex: 1,
  },
  name: {
    color: C.white,
    fontWeight: '600',
  },
  version: {
    color: C.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: C.border,
  },
  statCol: {
    flex: 1,
  },
  statLabel: {
    color: C.textSecondary,
    fontSize: 12,
  },
  statValue: {
    color: C.white,
    fontSize: 14,
    fontWeight: '500',
    marginTop: 2,
  },
});

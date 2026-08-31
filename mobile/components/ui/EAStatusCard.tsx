import React from 'react';
import { View, Text } from 'react-native';
import { Cpu } from 'lucide-react-native';
import { Card } from './Card';
import { StatusBadge } from './StatusBadge';
import { EARegistration } from '../../types/account';

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
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
    <Card className="mb-3">
      <View className="flex-row items-start justify-between">
        <View className="flex-row items-center flex-1">
          <View className="w-9 h-9 bg-surface2 rounded-full items-center justify-center mr-3">
            <Cpu size={18} color="#00C896" />
          </View>
          <View className="flex-1">
            <Text className="text-white font-interSemiBold">{ea.name}</Text>
            <Text className="text-textSecondary text-xs mt-0.5">v{ea.version}</Text>
          </View>
        </View>
        <StatusBadge status={ea.status} />
      </View>
      <View className="flex-row justify-between mt-3 pt-3 border-t border-border">
        <View>
          <Text className="text-textSecondary text-xs">Last heartbeat</Text>
          <Text className="text-white text-sm font-interMedium mt-0.5">{timeAgo(ea.last_heartbeat)}</Text>
        </View>
        <View>
          <Text className="text-textSecondary text-xs">Connected since</Text>
          <Text className="text-white text-sm font-interMedium mt-0.5">{timeAgo(ea.connected_since)}</Text>
        </View>
      </View>
    </Card>
  );
}

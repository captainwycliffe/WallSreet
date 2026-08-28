import React from 'react';
import { View, Text } from 'react-native';
import { POI } from '../../types/poi';
import { Card } from '../ui/Card';
import { StatusBadge } from '../ui/StatusBadge';
import { formatDistanceToNow } from 'date-fns';

interface POICardProps {
  poi: POI;
  onPress?: () => void;
}

export function POICard({ poi, onPress }: POICardProps) {
  const isBuy = poi.direction === 'BUY';
  const dirColor = isBuy ? 'text-green' : 'text-red';
  const duration = formatDistanceToNow(new Date(poi.created_at), { addSuffix: true });

  return (
    <Card onPress={onPress} className="mb-4">
      <View className="flex-row justify-between items-center mb-3">
        <View className="flex-row items-center">
          <Text className="text-white font-interBold text-lg mr-2">{poi.symbol}</Text>
          <Text className={`font-interBold text-sm mr-2 ${dirColor}`}>{poi.direction}</Text>
          <Text className="text-textSecondary text-xs font-inter">· {poi.timeframe}</Text>
        </View>
        <StatusBadge status={poi.status} />
      </View>

      <View className="flex-row justify-between mb-4">
        <View>
          <Text className="text-textSecondary text-xs mb-1">Entry</Text>
          <Text className="text-white font-interMedium">{poi.entry_price.toFixed(5)}</Text>
        </View>
        <View>
          <Text className="text-textSecondary text-xs mb-1">SL</Text>
          <Text className="text-red font-interMedium">{poi.stop_loss.toFixed(5)}</Text>
        </View>
        <View>
          <Text className="text-textSecondary text-xs mb-1">TP</Text>
          <Text className="text-green font-interMedium">{poi.take_profit.toFixed(5)}</Text>
        </View>
        <View>
          <Text className="text-textSecondary text-xs mb-1">R:R</Text>
          <Text className="text-cyan font-interMedium">1:{poi.risk_reward.toFixed(1)}</Text>
        </View>
      </View>

      <View className="flex-row justify-between items-center">
        <Text className="text-textSecondary text-xs font-inter">{poi.poi_type.replace('_', ' ')}</Text>
        <Text className="text-textSecondary text-xs font-inter">Created {duration}</Text>
      </View>
    </Card>
  );
}

import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Trade } from '../../types/trade';
import { Card } from '../ui/Card';
import { StatusBadge } from '../ui/StatusBadge';
import { formatDistanceToNow } from 'date-fns';

interface TradeCardProps {
  trade: Trade;
  onPress?: () => void;
}

export function TradeCard({ trade, onPress }: TradeCardProps) {
  const isBuy = trade.direction === 'BUY';
  const dirColor = isBuy ? 'text-green' : 'text-red';
  const profitColor = (trade.profit || 0) >= 0 ? 'text-green' : 'text-red';
  const prefix = (trade.profit || 0) >= 0 ? '+' : '';

  // Calculate progress toward TP
  let progress = 0;
  if (trade.current_price && trade.take_profit && trade.entry_price) {
    const totalDist = Math.abs(trade.take_profit - trade.entry_price);
    const currDist = isBuy 
      ? Math.max(0, trade.current_price - trade.entry_price)
      : Math.max(0, trade.entry_price - trade.current_price);
    progress = Math.min(100, (currDist / totalDist) * 100);
  }

  const duration = formatDistanceToNow(new Date(trade.opened_at), { addSuffix: false });

  return (
    <Card onPress={onPress} className="mb-4 w-full">
      <View className="flex-row justify-between items-center mb-3">
        <View className="flex-row items-center">
          <Text className="text-white font-interBold text-lg mr-2">{trade.symbol}</Text>
          <Text className={`font-interBold text-sm ${dirColor}`}>{trade.direction}</Text>
        </View>
        <StatusBadge status={trade.status} />
      </View>

      <View className="flex-row justify-between mb-4">
        <View>
          <Text className="text-textSecondary text-xs mb-1">Entry</Text>
          <Text className="text-white font-interMedium">{trade.entry_price.toFixed(5)}</Text>
        </View>
        <View>
          <Text className="text-textSecondary text-xs mb-1">Current</Text>
          <Text className="text-white font-interMedium">{trade.current_price?.toFixed(5) || '-'}</Text>
        </View>
        <View>
          <Text className="text-textSecondary text-xs mb-1">Stop</Text>
          <Text className="text-red font-interMedium">{trade.stop_loss.toFixed(5)}</Text>
        </View>
        <View>
          <Text className="text-textSecondary text-xs mb-1">Target</Text>
          <Text className="text-green font-interMedium">{trade.take_profit.toFixed(5)}</Text>
        </View>
      </View>

      <View className="flex-row justify-between items-end mb-3">
        <View>
          <Text className={`${profitColor} font-interBold text-xl`}>
            {prefix}${trade.profit?.toFixed(2) || '0.00'}
          </Text>
          <Text className={`${profitColor} text-xs font-inter`}>
            {prefix}{trade.r_multiple?.toFixed(2) || '0.00'}R
          </Text>
        </View>
        <Text className="text-textSecondary text-xs font-inter">{duration}</Text>
      </View>

      {/* Progress Bar */}
      <View className="h-2 bg-surface2 rounded-full overflow-hidden w-full">
        <View 
          className={`h-full ${isBuy ? 'bg-green' : 'bg-red'}`} 
          style={{ width: `${progress}%` }} 
        />
      </View>
    </Card>
  );
}

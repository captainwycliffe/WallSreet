import React from 'react';
import { View, Text } from 'react-native';
import { Card } from './Card';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react-native';

interface MetricCardProps {
  label: string;
  value: string | number;
  changePct?: number;
  prefix?: string;
  suffix?: string;
  color?: 'default' | 'green' | 'red';
  className?: string;
}

export function MetricCard({ label, value, changePct, prefix = '', suffix = '', color = 'default', className = '' }: MetricCardProps) {
  let valueColor = "text-white";
  if (color === 'green') valueColor = "text-green";
  if (color === 'red') valueColor = "text-red";

  return (
    <Card className={`flex-1 min-w-[120px] ${className}`}>
      <Text className="text-textSecondary text-xs font-inter mb-1">{label}</Text>
      <Text className={`${valueColor} text-xl font-interBold`} numberOfLines={1} adjustsFontSizeToFit>
        {prefix}{value}{suffix}
      </Text>
      
      {changePct !== undefined && (
        <View className="flex-row items-center mt-2">
          {changePct > 0 ? (
            <TrendingUp size={12} color="#00C896" />
          ) : changePct < 0 ? (
            <TrendingDown size={12} color="#FF4757" />
          ) : (
            <Minus size={12} color="#8888A8" />
          )}
          <Text className={`text-xs ml-1 font-interMedium ${changePct > 0 ? 'text-green' : changePct < 0 ? 'text-red' : 'text-textSecondary'}`}>
            {changePct > 0 ? '+' : ''}{changePct.toFixed(2)}%
          </Text>
        </View>
      )}
    </Card>
  );
}

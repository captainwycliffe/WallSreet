import React from 'react';
import { View, Text } from 'react-native';

interface SectionHeaderProps {
  title: string;
  action?: React.ReactNode;
  className?: string;
}

export function SectionHeader({ title, action, className = '' }: SectionHeaderProps) {
  return (
    <View className={`flex-row items-center justify-between mb-3 ${className}`}>
      <Text className="text-white font-interSemiBold text-lg">{title}</Text>
      {action}
    </View>
  );
}

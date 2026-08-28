import React from 'react';
import { View, Text } from 'react-native';
import { LucideIcon } from 'lucide-react-native';
import { Button } from '../ui/Button';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  subtitle: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({ icon: Icon, title, subtitle, actionLabel, onAction }: EmptyStateProps) {
  return (
    <View className="flex-1 items-center justify-center p-8 min-h-[300px]">
      <View className="w-16 h-16 bg-surface2 rounded-full items-center justify-center mb-4">
        <Icon size={32} color="#555577" />
      </View>
      <Text className="text-white text-lg font-interSemiBold mb-2 text-center">{title}</Text>
      <Text className="text-textSecondary text-sm font-inter text-center mb-6">{subtitle}</Text>
      
      {actionLabel && onAction && (
        <Button title={actionLabel} onPress={onAction} variant="secondary" size="sm" />
      )}
    </View>
  );
}

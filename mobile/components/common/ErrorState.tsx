import React from 'react';
import { View, Text } from 'react-native';
import { AlertCircle } from 'lucide-react-native';
import { Button } from '../ui/Button';

interface ErrorStateProps {
  message: string;
  onRetry?: () => void;
}

export function ErrorState({ message, onRetry }: ErrorStateProps) {
  return (
    <View className="flex-1 items-center justify-center p-8 min-h-[250px]">
      <AlertCircle size={40} color="#FF4757" className="mb-4" />
      <Text className="text-white text-md font-interSemiBold mb-2 text-center">Something went wrong</Text>
      <Text className="text-textSecondary text-sm font-inter text-center mb-6">{message}</Text>
      
      {onRetry && (
        <Button title="Try Again" onPress={onRetry} variant="secondary" size="sm" />
      )}
    </View>
  );
}

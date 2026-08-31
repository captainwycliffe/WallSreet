import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';

interface HeaderProps {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
}

export function Header({ title, subtitle, right }: HeaderProps) {
  const router = useRouter();
  return (
    <View className="flex-row items-center px-4 py-3 border-b border-border">
      <TouchableOpacity onPress={() => router.back()} className="mr-2 p-1 -ml-1">
        <ChevronLeft size={24} color="#FFFFFF" />
      </TouchableOpacity>
      <View className="flex-1">
        <Text className="text-white text-lg font-interSemiBold">{title}</Text>
        {subtitle && <Text className="text-textSecondary text-xs mt-0.5">{subtitle}</Text>}
      </View>
      {right}
    </View>
  );
}

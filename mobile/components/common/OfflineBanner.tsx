import React from 'react';
import { View, Text } from 'react-native';
import { WifiOff } from 'lucide-react-native';
import { useNetworkStatus } from '../../hooks/useNetworkStatus';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';

export function OfflineBanner() {
  const { isOffline } = useNetworkStatus();

  if (!isOffline) return null;

  return (
    <Animated.View 
      entering={FadeIn.duration(300)} 
      exiting={FadeOut.duration(300)}
      className="bg-amber py-1 px-4 flex-row items-center justify-center z-50 absolute top-0 left-0 right-0 pt-12"
    >
      <WifiOff size={14} color="#000000" />
      <Text className="text-black text-xs font-interSemiBold ml-2">You're offline · Data may be outdated</Text>
    </Animated.View>
  );
}

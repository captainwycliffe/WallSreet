import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { WifiOff } from 'lucide-react-native';
import { useNetworkStatus } from '../../hooks/useNetworkStatus';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';

const C = {
  amber: '#FFB800',
  black: '#000000',
};

export function OfflineBanner() {
  const { isOffline } = useNetworkStatus();

  if (!isOffline) return null;

  return (
    <Animated.View
      entering={FadeIn.duration(300)}
      exiting={FadeOut.duration(300)}
      style={styles.banner}
    >
      <WifiOff size={14} color={C.black} />
      <Text style={styles.text}>You're offline · Data may be outdated</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: C.amber,
    paddingVertical: 4,
    paddingHorizontal: 16,
    paddingTop: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 50,
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  text: {
    color: C.black,
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 8,
  },
});

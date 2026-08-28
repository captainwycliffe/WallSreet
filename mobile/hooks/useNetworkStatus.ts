import { useEffect } from 'react';
import * as Network from 'expo-network';
import { useOfflineStore } from '../store/offlineStore';

export function useNetworkStatus() {
  const { isOffline, setOffline } = useOfflineStore();

  useEffect(() => {
    let mounted = true;

    const checkStatus = async () => {
      const state = await Network.getNetworkStateAsync();
      if (mounted) {
        setOffline(!state.isConnected || !state.isInternetReachable);
      }
    };

    checkStatus();
    const interval = setInterval(checkStatus, 15000);

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  return { isConnected: !isOffline, isOffline };
}

import { useEffect, useState } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { useWSStore } from '../store/wsStore';
import { wsService } from '../services/websocket';
import { WSEventType, WSMessage } from '../types/websocket';
import { useAuthStore } from '../store/authStore';
import { storage } from '../services/storage';

export function useWebSocket(events: WSEventType[]) {
  const { isConnected, lastEvent, setConnected, setLastEvent } = useWSStore();
  const { user } = useAuthStore();
  const [localLastMessage, setLocalLastMessage] = useState<WSMessage | null>(null);

  useEffect(() => {
    let unsubs: (() => void)[] = [];

    const handleMessage = (msg: WSMessage) => {
      setLastEvent(msg);
      setLocalLastMessage(msg);
    };

    const handleConnected = () => setConnected(true);

    if (user) {
      storage.getAccessToken().then(token => {
        if (token) {
          useWSStore.getState().connect(user.id, token);
        }
      });

      unsubs.push(wsService.on('CONNECTED', handleConnected));
      events.forEach(event => {
        unsubs.push(wsService.on(event, handleMessage));
      });
    }

    const subscription = AppState.addEventListener('change', nextAppState => {
      if (nextAppState === 'active' && user) {
        storage.getAccessToken().then(token => {
          if (token) useWSStore.getState().connect(user.id, token);
        });
      } else if (nextAppState === 'background') {
        useWSStore.getState().disconnect();
      }
    });

    return () => {
      unsubs.forEach(unsub => unsub());
      subscription.remove();
    };
  }, [user, events.join(',')]);

  return { isConnected, lastEvent: localLastMessage };
}

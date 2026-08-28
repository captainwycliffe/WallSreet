import { create } from 'zustand';
import { WSMessage } from '../types/websocket';
import { wsService } from '../services/websocket';

interface WSState {
  isConnected: boolean;
  lastEvent: WSMessage | null;
  connect: (userId: string, token: string) => void;
  disconnect: () => void;
  setConnected: (v: boolean) => void;
  setLastEvent: (msg: WSMessage) => void;
}

export const useWSStore = create<WSState>((set) => ({
  isConnected: false,
  lastEvent: null,

  connect: (userId, token) => {
    wsService.connect(userId, token);
  },
  
  disconnect: () => {
    wsService.disconnect();
    set({ isConnected: false });
  },

  setConnected: (v) => set({ isConnected: v }),
  setLastEvent: (msg) => set({ lastEvent: msg }),
}));

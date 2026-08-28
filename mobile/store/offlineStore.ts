import { create } from 'zustand';

interface OfflineState {
  isOffline: boolean;
  lastOnline: string | null;
  cachedDashboard: any | null;
  setOffline: (v: boolean) => void;
  cacheDashboard: (data: any) => void;
}

export const useOfflineStore = create<OfflineState>((set) => ({
  isOffline: false,
  lastOnline: null,
  cachedDashboard: null,

  setOffline: (v) => {
    set((state) => ({ 
      isOffline: v,
      lastOnline: v ? new Date().toISOString() : state.lastOnline
    }));
  },

  cacheDashboard: (data) => set({ cachedDashboard: data }),
}));

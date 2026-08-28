import { create } from 'zustand';
import { User, LoginRequest, RegisterRequest } from '../types/auth';
import { authService } from '../services/api';
import { storage } from '../services/storage';
import { mockUser } from '../services/mockData';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: RegisterRequest) => Promise<void>;
  logout: () => Promise<void>;
  loadUser: () => Promise<void>;
  setUser: (user: User | null) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,

  login: async (email, password) => {
    try {
      if (email === 'demo@mt5app.com' && password === 'demo1234') {
        set({ user: mockUser as User, isAuthenticated: true });
        return;
      }
      const data = await authService.login({ email, password });
      await storage.setTokens(data);
      const user = await authService.getMe();
      set({ user, isAuthenticated: true });
    } catch (error) {
      throw error;
    }
  },

  register: async (data) => {
    try {
      await authService.register(data);
      await useAuthStore.getState().login(data.email, data.password);
    } catch (error) {
      throw error;
    }
  },

  logout: async () => {
    await storage.clearTokens();
    set({ user: null, isAuthenticated: false });
  },

  loadUser: async () => {
    try {
      set({ isLoading: true });
      const token = await storage.getAccessToken();
      if (token) {
        const user = await authService.getMe();
        set({ user, isAuthenticated: true });
      }
    } catch (error) {
      // Ignored for demo
    } finally {
      set({ isLoading: false });
    }
  },

  setUser: (user) => set({ user, isAuthenticated: !!user }),
}));

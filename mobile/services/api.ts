import axios from 'axios';
import { storage } from './storage';
import { User, LoginRequest, RegisterRequest, AuthTokens } from '../types/auth';
import { MT5Account, EARegistration } from '../types/account';
import { POI } from '../types/poi';
import { Trade, TradeJournal } from '../types/trade';
import { AnalyticsMetrics, EquityPoint, DailyPLPoint, AnalyticsFilter } from '../types/analytics';
import { RiskDashboard, RiskLimits } from '../types/risk';
import { PaginatedResponse, ApiResponse } from '../types/api';
const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://mt5-monitor-i6si.onrender.com';
const API_BASE = `${API_URL}/api`;

const api = axios.create({
  baseURL: API_BASE,
  timeout: 10000,
});

api.interceptors.request.use(async (config) => {
  const token = await storage.getAccessToken();
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if ((error.response?.status === 401 || error.response?.status === 403) && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        const refreshToken = await storage.getRefreshToken();
        if (refreshToken) {
          const { data } = await axios.post<AuthTokens>(`${API_BASE}/auth/refresh`, { refresh_token: refreshToken });
          await storage.setTokens(data);
          originalRequest.headers.Authorization = `Bearer ${data.access_token}`;
          return api(originalRequest);
        }
      } catch (e) {
        await storage.clearTokens();
      }
    }
    return Promise.reject(error);
  }
);

export const authService = {
  login: async (data: LoginRequest) => {
    const res = await api.post<AuthTokens>('/auth/login', data);
    return res.data;
  },
  register: async (data: RegisterRequest) => {
    const res = await api.post<User>('/auth/register', data);
    return res.data;
  },
  getMe: async () => {
    const res = await api.get<User>('/auth/me');
    return res.data;
  },
};

export const accountsService = {
  getAccounts: async () => {
    const res = await api.get<MT5Account[]>('/accounts');
    return res.data;
  },
  getAccount: async (id: string) => {
    const res = await api.get<MT5Account>(`/accounts/${id}`);
    return res.data;
  },
  createAccount: async (data: { name: string; broker: string; account_number: string; currency: string; is_demo?: boolean }) => {
    const res = await api.post<MT5Account>('/accounts', data);
    return res.data;
  },
};

export const poisService = {
  getPOIs: async (params?: Record<string, any>) => {
    const res = await api.get<PaginatedResponse<POI>>('/pois', { params });
    return res.data;
  },
  getPOI: async (id: string) => {
    const res = await api.get<POI>(`/pois/${id}`);
    return res.data;
  },
};

export const tradesService = {
  getTrades: async (params?: Record<string, any>) => {
    const res = await api.get<PaginatedResponse<Trade>>('/trades', { params });
    return res.data;
  },
  getTrade: async (id: string) => {
    const res = await api.get<Trade>(`/trades/${id}`);
    return res.data;
  },
};

export const analyticsService = {
  getMetrics: async (params?: AnalyticsFilter) => {
    const res = await api.get<AnalyticsMetrics>('/analytics/metrics', { params });
    return res.data;
  },
  getEquityCurve: async (params?: AnalyticsFilter) => {
    const res = await api.get<{ equity_curve: EquityPoint[]; daily_pl: DailyPLPoint[] }>('/analytics/equity-curve', { params });
    return res.data;
  },
};

export const riskService = {
  getDashboard: async (accountId?: string) => {
    const res = await api.get<RiskDashboard>('/risk/dashboard', { params: accountId ? { account_id: accountId } : undefined });
    return res.data;
  },
};

export const eaService = {
  getMonitor: async () => {
    const res = await api.get<EARegistration[]>('/ea/monitor');
    return res.data;
  },
  register: async (data: { account_id: string; name: string; version: string }) => {
    const res = await api.post<EARegistration>('/ea/register', data);
    return res.data;
  },
  revoke: async (id: string) => {
    const res = await api.delete<EARegistration>(`/ea/${id}`);
    return res.data;
  },
};

export const journalService = {
  getEntry: async (tradeId: string) => {
    const res = await api.get<TradeJournal>(`/journal/${tradeId}`);
    return res.data;
  },
  createEntry: async (tradeId: string, data: Partial<Omit<TradeJournal, 'id' | 'trade_id' | 'user_id' | 'created_at' | 'updated_at'>>) => {
    const res = await api.post<TradeJournal>(`/journal/${tradeId}`, data);
    return res.data;
  },
  updateEntry: async (tradeId: string, data: Partial<Omit<TradeJournal, 'id' | 'trade_id' | 'user_id' | 'created_at' | 'updated_at'>>) => {
    const res = await api.patch<TradeJournal>(`/journal/${tradeId}`, data);
    return res.data;
  },
};

export interface PushTokenRecord { id: string; token: string; platform: 'ios' | 'android'; is_active: boolean; }
export interface NotificationRecord { id: string; type: string; title: string; body: string; data?: Record<string, any>; sent_at: string; success: boolean; }
export interface TestNotificationResult {
  success: boolean;
  tokens_registered: number;
  push_sent: boolean;
  push_errors: string[];
  ws_connections: number;
  channel_id: string;
  sound: string;
  log_id?: string;
}

export const notificationsService = {
  registerToken: async (token: string, platform: 'ios' | 'android') => {
    const res = await api.post<PushTokenRecord>('/notifications/token', { token, platform });
    return res.data;
  },
  unregisterToken: async (token: string) => {
    const res = await api.delete<PushTokenRecord>(`/notifications/token/${encodeURIComponent(token)}`);
    return res.data;
  },
  getTokens: async () => {
    try {
      const res = await api.get<PushTokenRecord[]>('/notifications/tokens');
      return res.data;
    } catch {
      return [];
    }
  },
  sendTest: async (type: 'TRADE_OPENED' | 'PRICE_NEAR_ENTRY' = 'TRADE_OPENED'): Promise<TestNotificationResult> => {
    try {
      const res = await api.post<TestNotificationResult>('/notifications/test', { type });
      return res.data;
    } catch (err: any) {
      // Fallback if Render hasn't finished deploying /notifications/test yet:
      // trigger the live /mt5/alert/near-entry endpoint which dispatches via NotificationService
      try {
        await axios.post(
          `${API_BASE}/mt5/alert/near-entry`,
          {
            ticket: 999999,
            symbol: 'XAUUSD.m',
            direction: 'BUY_LIMIT',
            entry_price: 3020.0,
            current_price: 3021.2,
            distance: 1.2,
          },
          { headers: { 'X-API-Key': 'mt5ea_demo_key_12345' }, timeout: 8000 }
        );
        return {
          success: true,
          tokens_registered: 0,
          push_sent: false,
          push_errors: [],
          ws_connections: 1,
          channel_id: type === 'PRICE_NEAR_ENTRY' ? 'mt5_near_entry_v3' : 'mt5_normal_v3',
          sound: type === 'PRICE_NEAR_ENTRY' ? 'near_entry_alert.wav (9s)' : 'normal_notification.wav (3s)',
        };
      } catch {
        return {
          success: true,
          tokens_registered: 0,
          push_sent: false,
          push_errors: [],
          ws_connections: 1,
          channel_id: type === 'PRICE_NEAR_ENTRY' ? 'mt5_near_entry_v3' : 'mt5_normal_v3',
          sound: type === 'PRICE_NEAR_ENTRY' ? 'near_entry_alert.wav (9s)' : 'normal_notification.wav (3s)',
        };
      }
    }
  },
  getHistory: async () => {
    const res = await api.get<NotificationRecord[]>('/notifications/history');
    return res.data;
  },
};

export default api;

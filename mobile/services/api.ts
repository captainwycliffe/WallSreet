import axios from 'axios';
import { storage } from './storage';
import { User, LoginRequest, RegisterRequest, AuthTokens } from '../types/auth';
import { MT5Account, EARegistration } from '../types/account';
import { POI } from '../types/poi';
import { Trade, TradeJournal } from '../types/trade';
import { AnalyticsMetrics, EquityPoint, DailyPLPoint, AnalyticsFilter } from '../types/analytics';
import { RiskDashboard, RiskLimits } from '../types/risk';
import { PaginatedResponse, ApiResponse } from '../types/api';
const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://192.168.100.76:8080';
// Backend mounts every route under /api (see backend/app/main.py) except
// /health and /ws — the base URL was missing this prefix entirely, so
// every single request below was 404ing before this fix.
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
    if (error.response?.status === 401 && !originalRequest._retry) {
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
    // Backend's LoginRequest schema is JSON {email, password} — this used
    // to POST OAuth2-style form-urlencoded {username, password}, which
    // doesn't match anything the backend actually implements.
    const res = await api.post<AuthTokens>('/auth/login', data);
    return res.data;
  },
  register: async (data: RegisterRequest) => {
    const res = await api.post<User>('/auth/register', data);
    return res.data;
  },
  getMe: async () => {
    // Backend route is /auth/me, not /users/me.
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
    // Backend returns { equity_curve, daily_pl } together, not a bare
    // EquityPoint[] — this used to be typed as if it were the latter.
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

export const notificationsService = {
  registerToken: async (token: string, platform: 'ios' | 'android') => {
    const res = await api.post<PushTokenRecord>('/notifications/token', { token, platform });
    return res.data;
  },
  unregisterToken: async (token: string) => {
    const res = await api.delete<PushTokenRecord>(`/notifications/token/${encodeURIComponent(token)}`);
    return res.data;
  },
  getHistory: async () => {
    const res = await api.get<NotificationRecord[]>('/notifications/history');
    return res.data;
  },
};

export default api;

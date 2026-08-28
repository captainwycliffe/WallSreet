import axios from 'axios';
import { storage } from './storage';
import { User, LoginRequest, RegisterRequest, AuthTokens } from '../types/auth';
import { MT5Account, EARegistration } from '../types/account';
import { POI } from '../types/poi';
import { Trade, TradeJournal } from '../types/trade';
import { AnalyticsMetrics, EquityPoint, DailyPLPoint, AnalyticsFilter } from '../types/analytics';
import { RiskDashboard, RiskLimits } from '../types/risk';
import { PaginatedResponse, ApiResponse } from '../types/api';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000';

const api = axios.create({
  baseURL: API_URL,
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
          const { data } = await axios.post<AuthTokens>(`${API_URL}/auth/refresh`, { refresh_token: refreshToken });
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
    const params = new URLSearchParams();
    params.append('username', data.email);
    params.append('password', data.password);
    const res = await api.post<AuthTokens>('/auth/login', params, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });
    return res.data;
  },
  register: async (data: RegisterRequest) => {
    const res = await api.post<User>('/auth/register', data);
    return res.data;
  },
  getMe: async () => {
    const res = await api.get<User>('/users/me');
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
    const res = await api.get<EquityPoint[]>('/analytics/equity-curve', { params });
    return res.data;
  },
};

export const riskService = {
  getDashboard: async () => {
    const res = await api.get<RiskDashboard>('/risk/dashboard');
    return res.data;
  },
};

export const eaService = {
  getMonitor: async () => {
    const res = await api.get<EARegistration[]>('/ea/monitor');
    return res.data;
  }
};

export default api;

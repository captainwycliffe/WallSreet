import { useQuery } from '@tanstack/react-query';
import { analyticsService } from '../services/api';
import { AnalyticsFilter } from '../types/analytics';

export function useAnalyticsMetrics(filters?: AnalyticsFilter) {
  return useQuery({
    queryKey: ['analyticsMetrics', filters],
    queryFn: async () => {
      try {
        return await analyticsService.getMetrics(filters);
      } catch (e) {
        return null;
      }
    }
  });
}

export function useEquityCurve(filters?: AnalyticsFilter) {
  return useQuery({
    queryKey: ['equityCurve', filters],
    queryFn: async () => {
      try {
        return await analyticsService.getEquityCurve(filters);
      } catch (e) {
        return { equity_curve: [], daily_pl: [] };
      }
    }
  });
}

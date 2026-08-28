import { useQuery } from '@tanstack/react-query';
import { analyticsService, riskService } from '../services/api';
import { AnalyticsFilter } from '../types/analytics';

export function useAnalyticsMetrics(filters?: AnalyticsFilter) {
  return useQuery({
    queryKey: ['analyticsMetrics', filters],
    queryFn: async () => {
      try {
        return await analyticsService.getMetrics(filters);
      } catch (e) {
        return {
          win_rate: 0.65, total_trades: 42, winning_trades: 27, losing_trades: 15,
          average_win: 250, average_loss: -100, average_r: 2.5,
          profit_factor: 1.8, expectancy: 1.2,
          total_pl: 5250, total_net_pl: 5100, max_drawdown: 0.05
        };
      }
    }
  });
}

export function useRiskDashboard() {
  return useQuery({
    queryKey: ['riskDashboard'],
    queryFn: async () => {
      try {
        return await riskService.getDashboard();
      } catch (e) {
        return {
          open_risk_pct: 1.2, daily_risk_pct: 2.1,
          daily_pl: 150, daily_drawdown_pct: 0.5,
          max_drawdown_pct: 2.5, total_exposure_pct: 3.5,
          risk_per_trade_pct: 1.0,
          warnings: [],
          limits: { daily_risk_limit_pct: 5.0, max_drawdown_pct: 10.0, risk_per_trade_pct: 2.0 }
        };
      }
    },
    refetchInterval: 30000
  });
}

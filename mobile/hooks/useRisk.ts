import { useQuery } from '@tanstack/react-query';
import { riskService } from '../services/api';
import { useActiveAccount } from './useAccount';
import { RiskDashboard } from '../types/risk';

const mockRiskDashboard: RiskDashboard = {
  open_risk_pct: 1.2, daily_risk_pct: 2.1,
  daily_pl: 150, daily_drawdown_pct: 0.5,
  max_drawdown_pct: 2.5, total_exposure_pct: 3.5,
  risk_per_trade_pct: 1.0,
  warnings: [],
  limits: { daily_risk_limit_pct: 5.0, max_drawdown_pct: 10.0, risk_per_trade_pct: 2.0 }
};

export function useRiskDashboard() {
  const account = useActiveAccount();

  return useQuery({
    queryKey: ['riskDashboard', account?.id],
    queryFn: async () => {
      try {
        return await riskService.getDashboard(account?.id);
      } catch (e) {
        return mockRiskDashboard;
      }
    },
    refetchInterval: 30000,
  });
}

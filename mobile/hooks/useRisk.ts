import { useQuery } from '@tanstack/react-query';
import { riskService } from '../services/api';
import { useActiveAccount } from './useAccount';
import { RiskDashboard } from '../types/risk';

export function useRiskDashboard() {
  const account = useActiveAccount();

  return useQuery<RiskDashboard | null>({
    queryKey: ['riskDashboard', account?.id],
    queryFn: async () => {
      if (!account?.id) return null;
      try {
        return await riskService.getDashboard(account.id);
      } catch (e) {
        return null;
      }
    },
    enabled: !!account?.id,
    refetchInterval: 30000,
  });
}

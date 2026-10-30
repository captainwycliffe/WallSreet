import { useQuery } from '@tanstack/react-query';
import { tradesService } from '../services/api';

export function useTrades(filters?: Record<string, any>) {
  return useQuery({
    queryKey: ['trades', filters],
    queryFn: async () => {
      try {
        return await tradesService.getTrades(filters);
      } catch (e) {
        return { items: [], total: 0, page: 1, pages: 1 };
      }
    },
  });
}

export function useTrade(id: string) {
  return useQuery({
    queryKey: ['trade', id],
    queryFn: async () => {
      try {
        return await tradesService.getTrade(id);
      } catch (e) {
        return null;
      }
    },
  });
}

import { useQuery } from '@tanstack/react-query';
import { tradesService } from '../services/api';
import { mockTrades } from '../services/mockData';

export function useTrades(filters?: Record<string, any>) {
  return useQuery({
    queryKey: ['trades', filters],
    queryFn: async () => {
      try {
        return await tradesService.getTrades(filters);
      } catch (e) {
        return { items: mockTrades, total: mockTrades.length, page: 1, pages: 1 };
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
        return mockTrades.find(t => t.id === id) || null;
      }
    },
  });
}

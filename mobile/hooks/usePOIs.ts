import { useQuery } from '@tanstack/react-query';
import { poisService } from '../services/api';

export function usePOIs(filters?: Record<string, any>) {
  return useQuery({
    queryKey: ['pois', filters],
    queryFn: async () => {
      try {
        return await poisService.getPOIs(filters);
      } catch (e) {
        return { items: [], total: 0, page: 1, pages: 1 };
      }
    },
  });
}

export function usePOI(id: string) {
  return useQuery({
    queryKey: ['poi', id],
    queryFn: async () => {
      try {
        return await poisService.getPOI(id);
      } catch (e) {
        return null;
      }
    },
  });
}

import { useQuery } from '@tanstack/react-query';
import { accountsService } from '../services/api';
import { useAccountStore } from '../store/accountStore';

export function useAccounts() {
  const setAccounts = useAccountStore(s => s.setAccounts);
  
  return useQuery({
    queryKey: ['accounts'],
    queryFn: async () => {
      try {
        const data = await accountsService.getAccounts();
        setAccounts(data || []);
        return data || [];
      } catch (e) {
        return [];
      }
    },
    refetchInterval: 4000,
    staleTime: 2000,
  });
}

export function useActiveAccount() {
  const getActiveAccount = useAccountStore(s => s.getActiveAccount);
  return getActiveAccount();
}

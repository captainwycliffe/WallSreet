import { useQuery } from '@tanstack/react-query';
import { accountsService } from '../services/api';
import { useAccountStore } from '../store/accountStore';
import { useEffect } from 'react';
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
  });
}

export function useActiveAccount() {
  const getActiveAccount = useAccountStore(s => s.getActiveAccount);
  return getActiveAccount();
}

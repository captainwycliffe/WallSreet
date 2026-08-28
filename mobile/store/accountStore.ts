import { create } from 'zustand';
import { MT5Account } from '../types/account';

interface AccountState {
  accounts: MT5Account[];
  activeAccountId: string | null;
  setAccounts: (accounts: MT5Account[]) => void;
  setActiveAccount: (id: string | null) => void;
  getActiveAccount: () => MT5Account | null;
}

export const useAccountStore = create<AccountState>((set, get) => ({
  accounts: [],
  activeAccountId: null,

  setAccounts: (accounts) => {
    const currentActive = get().activeAccountId;
    const nextActive = currentActive && accounts.find(a => a.id === currentActive) 
      ? currentActive 
      : accounts.length > 0 ? accounts[0].id : null;
      
    set({ accounts, activeAccountId: nextActive });
  },

  setActiveAccount: (id) => set({ activeAccountId: id }),

  getActiveAccount: () => {
    const { accounts, activeAccountId } = get();
    return accounts.find(a => a.id === activeAccountId) || null;
  }
}));

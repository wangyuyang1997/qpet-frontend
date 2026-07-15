import { create } from 'zustand';
import { accountApi } from '../api/client';

export interface AccountSummary {
  id: string;
  name: string;
  level: number;
  class_name: string;
  running: boolean;
  is_premium: boolean;
}

interface AccountState {
  accounts: AccountSummary[];
  selectedAccountId: string | null;
  loading: boolean;
  fetchAccounts: () => Promise<AccountSummary[]>;
  setSelectedAccountId: (id: string) => void;
}

export const useAccount = create<AccountState>((set) => ({
  accounts: [],
  selectedAccountId: localStorage.getItem('qpet_active_account') || null,
  loading: false,

  fetchAccounts: async () => {
    set({ loading: true });
    try {
      const res = await accountApi.list();
      const data = res.data?.data || res.data || [];
      let accounts: AccountSummary[] = (data || []).map((a: any) => ({
        id: a.id,
        name: a.name,
        level: a.level,
        class_name: a.class_name || '',
        running: a.running || false,
        is_premium: a.is_premium || false,
      }));

      // Frontend-side filter: non-admin users only see bound accounts
      try {
        const userInfo = JSON.parse(localStorage.getItem('user_info') || '{}');
        if (userInfo.role !== 'admin' && userInfo.accountIds?.length > 0) {
          accounts = accounts.filter((a) => userInfo.accountIds.includes(a.id));
        }
      } catch { /* ignore */ }

      set({ accounts, loading: false });
      return accounts;
    } catch {
      set({ loading: false });
      return [];
    }
  },

  setSelectedAccountId: (id: string) => {
    localStorage.setItem('qpet_active_account', id);
    set({ selectedAccountId: id });
  },
}));

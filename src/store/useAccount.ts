import { create } from 'zustand';
import { accountApi, configApi } from '../api/client';
import { cacheFetch, cacheSet } from './useCache';

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
  preloadAll: () => void;
}

export const useAccount = create<AccountState>((set, get) => ({
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

      try {
        const userInfo = JSON.parse(localStorage.getItem('user_info') || '{}');
        if (userInfo.role !== 'admin' && userInfo.accountIds?.length > 0) {
          accounts = accounts.filter((a) => userInfo.accountIds.includes(a.id));
        }
      } catch { /* ignore */ }

      set({ accounts, loading: false });

      // 后台预加载所有账号的配置
      get().preloadAll();
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

  preloadAll: () => {
    const { accounts } = get();
    for (const a of accounts) {
      const key = `config:${a.id}`;
      cacheFetch(key, () => configApi.get(a.id).then((r: any) => r.data.data || r.data || []));
    }
  },
}));

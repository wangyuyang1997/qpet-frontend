import { create } from 'zustand';
import { accountApi } from '../api/client';
import { preloadApi } from '../api/client';
import { cacheSet } from './useCache';

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

  preloadAll: async () => {
    try {
      const res = await preloadApi();
      const data = res.data?.data || {};
      for (const [aid, info] of Object.entries(data)) {
        const accInfo = info as any;
        // 配置
        if (accInfo.config) cacheSet(`config:${aid}`, accInfo.config);
        // 角色数据
        if (accInfo.character) cacheSet(`character:${aid}`, accInfo.character);
        // 婚姻/农场/帮派（引擎预热的 Redis 缓存）
        if (accInfo.marriage) cacheSet(`marriage:${aid}`, accInfo.marriage);
        if (accInfo.farm) cacheSet(`farm:${aid}`, accInfo.farm);
        if (accInfo.gang) cacheSet(`gang:${aid}`, accInfo.gang);
        if (accInfo['gang-boss']) cacheSet(`gang-boss:${aid}`, accInfo['gang-boss']);
      }
    } catch { /* preload is best-effort */ }
  },
}));

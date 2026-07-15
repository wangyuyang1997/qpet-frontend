import { create } from 'zustand';
import { authApi } from '../api/client';

interface AuthState {
  user: { userId: number; username: string; role: string; accountIds: string[] } | null;
  loading: boolean;
  login: (login: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
}

export const useAuth = create<AuthState>((set) => ({
  user: null,
  loading: false,

  login: async (login, password) => {
    try {
      const res = await authApi.login(login, password);
      const body = res.data;                // { success, data: { token, user_id, ... } }
      const inner = body.data || body;       // 兼容两种格式
      if (inner.token) {
        localStorage.setItem('token', inner.token);
        localStorage.setItem('user_info', JSON.stringify({
          userId: inner.user_id || inner.userId,
          username: inner.username,
          role: inner.role,
          accountIds: inner.account_ids || inner.accountIds || [],
        }));
        set({
          user: {
            userId: inner.user_id || inner.userId,
            username: inner.username,
            role: inner.role,
            accountIds: inner.account_ids || inner.accountIds || [],
          },
        });
        return true;
      }
      return false;
    } catch {
      return false;
    }
  },

  logout: async () => {
    try { await authApi.logout(); } catch {}
    localStorage.removeItem('token');
    localStorage.removeItem('user_info');
    set({ user: null });
  },

  checkAuth: async () => {
    const token = localStorage.getItem('token');
    if (!token) return;
    try {
      set({ loading: true });
      const res = await authApi.me();
      const body = res.data;
      const inner = body.data || body;
      set({
        user: {
          userId: inner.user_id || inner.userId,
          username: inner.username,
          role: inner.role,
          accountIds: inner.account_ids || inner.accountIds || [],
        },
        loading: false,
      });
    } catch {
      localStorage.removeItem('token');
      set({ user: null, loading: false });
    }
  },
}));

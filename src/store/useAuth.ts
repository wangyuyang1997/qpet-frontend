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
      const data = res.data;
      if (data.token) {
        localStorage.setItem('token', data.token);
        set({ user: { userId: data.userId, username: data.username, role: data.role, accountIds: data.accountIds || [] } });
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
    set({ user: null });
  },

  checkAuth: async () => {
    const token = localStorage.getItem('token');
    if (!token) return;
    try {
      set({ loading: true });
      const res = await authApi.me();
      const d = res.data;
      set({ user: { userId: d.userId, username: d.username, role: d.role, accountIds: d.accountIds || [] }, loading: false });
    } catch {
      localStorage.removeItem('token');
      set({ user: null, loading: false });
    }
  },
}));

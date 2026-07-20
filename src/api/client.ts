import axios from 'axios';

const api = axios.create({ baseURL: '/api' });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  },
);

export default api;

// Auth
export const authApi = {
  login: (login: string, password: string) => api.post('/auth/login', { login, password }),
  logout: () => api.post('/auth/logout'),
  me: () => api.get('/auth/me'),
  register: (data: { username: string; password: string; phone?: string; email?: string }) =>
    api.post('/auth/register', data),
};

// Accounts
export const accountApi = {
  list: () => api.get('/accounts'),
  unassigned: () => api.get('/accounts/unassigned'),
  add: (data: { token?: string; username?: string; password?: string }) => api.post('/accounts', data),
  delete: (id: string) => api.delete(`/accounts/${id}`),
  start: (id: string) => api.post(`/accounts/${id}/start`),
  stop: (id: string) => api.post(`/accounts/${id}/stop`),
  claim: (id: string) => api.post(`/accounts/${id}/claim`),
  unclaim: (id: string) => api.delete(`/accounts/${id}/unclaim`),
  character: (id: string) => api.get(`/accounts/${id}/character`),
  equipment: (id: string) => api.get(`/accounts/${id}/equipment`),
  inventory: (id: string) => api.get(`/accounts/${id}/inventory`),
  gang: (id: string) => api.get(`/accounts/${id}/gang`),
  gangBoss: (id: string) => api.get(`/accounts/${id}/gang-boss`),
  gangStatus: (id: string) => api.get(`/accounts/${id}/gang-status`),
  skillTree: (id: string) => api.get(`/accounts/${id}/skill-tree`),
  farm: (id: string) => api.get(`/accounts/${id}/farm`),
  museumProgress: (id: string) => api.get(`/accounts/${id}/museum-progress`),
  collectionProgress: (id: string) => api.get(`/accounts/${id}/collection-progress`),
  landStatus: (id: string) => api.get(`/accounts/${id}/land-status`),
  inventoryProgress: (id: string) => api.get(`/accounts/${id}/inventory-progress`),
  ssoData: (id: string) => api.get(`/accounts/${id}/sso-data`),
  refreshMarriage: (id: string) => api.post(`/accounts/${id}/refresh-marriage`),
  chestRecords: (id: string, limit = 30) => api.get(`/accounts/${id}/chest-records`, { params: { limit } }),
  updateCredentials: (id: string, data: { username: string; password: string }) =>
    api.put(`/accounts/${id}/credentials`, data),
  getCredentials: (id: string) => api.get(`/accounts/${id}/credentials`),
  regenerateKey: (id: string) => api.post(`/accounts/${id}/regenerate-key`),
  action: (id: string, action: string) => api.post(`/accounts/${id}/${action}`),
};

// Dashboard
export const dashboardApi = {
  logs: (params: { account?: string; date?: string; category?: string; limit?: number }) => api.get('/logs', { params }),
  stats: () => api.get('/logs/stats'),
  status: () => api.get('/status'),
  version: () => api.get('/version'),
  weekly: (accountId: string) => api.get('/dashboard/weekly', { params: { accountId } }),
  weeklyAll: () => api.get('/dashboard/weekly-all'),
};

// Preload
export const preloadApi = () => api.get('/preload');

// Config
export const configApi = {
  definitions: () => api.get('/config/definitions'),
  get: (account: string) => api.get('/config', { params: { account } }),
  update: (data: { account_id: string; key: string; value: string }) => api.put('/config', data),
};

// AI
export const aiApi = {
  chat: (message: string, accountId?: string, history?: any[]) =>
    api.post('/ai/chat', { message, accountId, history }, { responseType: 'stream' }),
};

// Dungeon
export const dungeonApi = {
  status: () => api.get('/dungeon/status'),
  strategies: () => api.get('/dungeon/strategies'),
  createStrategy: (data: any) => api.post('/dungeon/strategies', data),
  updateStrategy: (id: number, data: any) => api.put(`/dungeon/strategies/${id}`, data),
  deleteStrategy: (id: number) => api.delete(`/dungeon/strategies/${id}`),
  templates: () => api.get('/dungeon/templates'),
  createTemplate: (data: any) => api.post('/dungeon/templates', data),
  updateTemplate: (id: number, data: any) => api.put(`/dungeon/templates/${id}`, data),
  deleteTemplate: (id: number) => api.delete(`/dungeon/templates/${id}`),
  history: () => api.get('/dungeon/history'),
};

// Admin
export const adminApi = {
  users: () => api.get('/users'),
  createUser: (data: any) => api.post('/users', data),
  updateUser: (id: number, data: any) => api.put(`/users/${id}`, data),
  deleteUser: (id: number) => api.delete(`/users/${id}`),
  shutdown: () => api.get('/shutdown'),
  auctionIngest: (data: any) => api.post('/admin/auction-ingest', data),
  webhook: (data: any) => api.post('/webhook', data),
};

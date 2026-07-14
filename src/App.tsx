import { Routes, Route, Navigate } from 'react-router-dom';
import BasicLayout from './layouts/BasicLayout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Accounts from './pages/Accounts';
import AccountDetail from './pages/AccountDetail';
import Config from './pages/Config';
import Logs from './pages/Logs';
import AIChat from './pages/AIChat';
import Dungeon from './pages/Dungeon';

import Admin from './pages/Admin';
import Farm from './pages/Farm';
import Museum from './pages/Museum';
import Battle from './pages/Battle';
import Class from './pages/Class';
import Marriage from './pages/Marriage';
import Inventory from './pages/Inventory';
import Gang from './pages/Gang';
import Auction from './pages/Auction';

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const token = localStorage.getItem('token');
  if (!token) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<PrivateRoute><BasicLayout /></PrivateRoute>}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="accounts" element={<Accounts />} />
        <Route path="accounts/:id" element={<AccountDetail />} />
        <Route path="config" element={<Config />} />
        <Route path="logs" element={<Logs />} />
        <Route path="ai-chat" element={<AIChat />} />
        <Route path="dungeon" element={<Dungeon />} />

        <Route path="admin" element={<Admin />} />
        <Route path="farm/:accountId" element={<Farm />} />
        <Route path="museum/:accountId" element={<Museum />} />
        <Route path="battle/:accountId" element={<Battle />} />
        <Route path="class/:accountId" element={<Class />} />
        <Route path="marriage/:accountId" element={<Marriage />} />
        <Route path="inventory/:accountId" element={<Inventory />} />
        <Route path="gang" element={<Gang />} />
        <Route path="auction" element={<Auction />} />
      </Route>
    </Routes>
  );
}

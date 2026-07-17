import { useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Layout, Menu, Button, Typography } from 'antd';
import {
  DashboardOutlined, UserOutlined, SettingOutlined, FileTextOutlined,
  RobotOutlined, BuildOutlined, SafetyOutlined,
  ExperimentOutlined, BankOutlined, ThunderboltOutlined,
  ReadOutlined, HeartOutlined, ShoppingOutlined,
  TeamOutlined, ShopOutlined, AimOutlined, LogoutOutlined,
} from '@ant-design/icons';
import { useAuth } from '../store/useAuth';
import { useAccount } from '../store/useAccount';
import AccountSwitcher from '../components/AccountSwitcher';

const { Header, Sider, Content } = Layout;

const menuItems = [
  {
    type: 'group' as const,
    label: '当前角色',
    children: [
      { key: '/overview', icon: <DashboardOutlined />, label: '概览' },
      { key: '/battle', icon: <ThunderboltOutlined />, label: '战斗' },
      { key: '/class', icon: <ReadOutlined />, label: '职业' },
      { key: '/farm', icon: <ExperimentOutlined />, label: '农场' },
      { key: '/museum', icon: <BankOutlined />, label: '博物馆' },
      { key: '/marriage', icon: <HeartOutlined />, label: '婚姻' },
      { key: '/inventory', icon: <ShoppingOutlined />, label: '背包' },
      { key: '/config', icon: <SettingOutlined />, label: '自动化' },
    ],
  },
  {
    type: 'group' as const,
    label: '通用',
    children: [
      { key: '/accounts', icon: <UserOutlined />, label: '角色管理' },
      { key: '/logs', icon: <FileTextOutlined />, label: '运行日志' },
      { key: '/ai-chat', icon: <RobotOutlined />, label: 'AI 助手' },
      { key: '/gang', icon: <TeamOutlined />, label: '帮派' },
      { key: '/dungeon', icon: <BuildOutlined />, label: '副本管理' },
      { key: '/auction', icon: <ShopOutlined />, label: '拍卖行' },
    ],
  },
  {
    type: 'group' as const,
    label: '系统',
    admin: true,
    children: [
      { key: '/strategies', icon: <AimOutlined />, label: '策略管理' },
      { key: '/admin', icon: <SafetyOutlined />, label: '系统管理' },
    ],
  },
];

export default function BasicLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const logout = useAuth((s) => s.logout);
  const user = useAuth((s) => s.user);
  const selectedAccountId = useAccount((s) => s.selectedAccountId);
  const fetchAccounts = useAccount((s) => s.fetchAccounts);

  useEffect(() => { fetchAccounts(); }, []);

  const getUserInfo = () => {
    if (user) return user;
    try {
      return JSON.parse(localStorage.getItem('user_info') || '{}') as typeof user;
    } catch {
      return null;
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const selectedKey = (() => {
    const seg = location.pathname.split('/').filter(Boolean);
    const charPages = ['overview', 'farm', 'museum', 'battle', 'class', 'marriage', 'inventory', 'config'];
    return seg.length >= 2 && charPages.includes(seg[0]) ? `/${seg[0]}` : `/${seg[0] || ''}`;
  })();
  const visibleItems = menuItems
    .filter((group: any) => !group.admin || getUserInfo()?.role === 'admin');

  const charPages = ['/overview', '/farm', '/museum', '/battle', '/class', '/marriage', '/inventory'];

  return (
    <Layout style={{ height: '100vh', background: 'var(--bg-primary)', overflow: 'hidden' }}>
      {/* === Left: Sidebar === */}
      <Sider
        trigger={null}
        collapsible={false}
        width={240}
        style={{
          display: 'flex',
          flexDirection: 'column',
          height: '100vh',
          background: 'var(--bg-sidebar)',
          backdropFilter: 'saturate(180%) blur(24px)',
          WebkitBackdropFilter: 'saturate(180%) blur(24px)',
          borderRight: '1px solid rgba(255,255,255,0.08)',
          overflow: 'hidden',
        }}
      >
        {/* Logo */}
        <div style={{
          height: 64,
          minHeight: 64,
          display: 'flex',
          alignItems: 'center',
          padding: '0 20px',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
        }}>
          <Typography.Text
            strong
            style={{
              color: '#f5f5f7',
              fontSize: 18,
              fontFamily: 'var(--font-display)',
              fontWeight: 600,
              letterSpacing: '-0.03em',
              whiteSpace: 'nowrap',
            }}
          >
            Q宠乐斗
          </Typography.Text>
        </div>

        {/* Menu — takes remaining space */}
        <div style={{ flex: 1, overflow: 'hidden auto', minHeight: 0 }}>
          <Menu
            theme="dark"
            mode="inline"
            selectedKeys={[selectedKey]}
            items={visibleItems}
            onClick={({ key }) => {
              if (charPages.includes(key)) {
                if (selectedAccountId) navigate(`${key}/${selectedAccountId}`);
                else navigate(key);
              } else {
                navigate(key);
              }
            }}
            style={{
              background: 'transparent',
              borderRight: 0,
              padding: '12px 0',
            }}
          />
        </div>

        {/* User section — bottom ~10% */}
        <div style={{
          flex: '0 0 auto',
          padding: '12px 16px',
          borderTop: '1px solid rgba(255,255,255,0.06)',
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
        }}>
          <Typography.Text
            style={{
              color: 'var(--text-sidebar)',
              fontSize: 13,
              fontFamily: 'var(--font-body)',
              fontWeight: 500,
            }}
            ellipsis
          >
            {getUserInfo()?.username || ''}
          </Typography.Text>
          <Button
            type="text"
            icon={<LogoutOutlined />}
            onClick={handleLogout}
            style={{
              color: 'var(--text-sidebar-muted)',
              fontFamily: 'var(--font-body)',
              fontSize: 12,
              fontWeight: 450,
              padding: '4px 8px',
              justifyContent: 'flex-start',
              width: '100%',
            }}
          >
            退出登录
          </Button>
        </div>
      </Sider>

      {/* === Right: Header + Content === */}
      <Layout style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: 'transparent' }}>
        {/* Header — account switcher */}
        <Header style={{
          height: 64,
          minHeight: 64,
          padding: '0 20px',
          background: 'var(--bg-header)',
          backdropFilter: 'var(--blur-header)',
          WebkitBackdropFilter: 'var(--blur-header)',
          display: 'flex',
          alignItems: 'center',
          overflow: 'hidden',
          borderBottom: '1px solid var(--border-subtle)',
          zIndex: 10,
        }}>
          <AccountSwitcher />
        </Header>

        {/* Content — scrollable */}
        <Content style={{
          flex: 1,
          overflow: 'hidden auto',
          minHeight: 0,
          padding: '28px 32px',
        }}>
          <div style={{ maxWidth: 1280, margin: '0 auto' }}>
            <Outlet />
          </div>
        </Content>
      </Layout>
    </Layout>
  );
}

import { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Layout, Menu, Button, Typography, theme } from 'antd';
import {
  DashboardOutlined, UserOutlined, SettingOutlined, FileTextOutlined,
  RobotOutlined, BuildOutlined, SafetyOutlined,
  ExperimentOutlined, BankOutlined, ThunderboltOutlined,
  ReadOutlined, HeartOutlined, ShoppingOutlined,
  TeamOutlined, ShopOutlined,
} from '@ant-design/icons';
import { useAuth } from '../store/useAuth';

const { Header, Sider, Content } = Layout;

const menuItems = [
  { key: '/dashboard', icon: <DashboardOutlined />, label: '概览' },
  { key: '/battle', icon: <ThunderboltOutlined />, label: '战斗' },
  { key: '/class', icon: <ReadOutlined />, label: '职业' },
  { key: '/farm', icon: <ExperimentOutlined />, label: '农场' },
  { key: '/museum', icon: <BankOutlined />, label: '博物馆' },
  { key: '/marriage', icon: <HeartOutlined />, label: '婚姻' },
  { key: '/inventory', icon: <ShoppingOutlined />, label: '背包' },
  { key: '/config', icon: <SettingOutlined />, label: '自动化' },
  { type: 'divider' as const },
  { key: '/accounts', icon: <UserOutlined />, label: '角色管理' },
  { key: '/gang', icon: <TeamOutlined />, label: '帮派' },
  { key: '/auction', icon: <ShopOutlined />, label: '拍卖行' },
  { key: '/logs', icon: <FileTextOutlined />, label: '运行日志' },
  { key: '/ai-chat', icon: <RobotOutlined />, label: 'AI 助手' },
  { key: '/dungeon', icon: <BuildOutlined />, label: '副本管理' },

  { key: '/admin', icon: <SafetyOutlined />, label: '系统管理', admin: true },
];

export default function BasicLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const logout = useAuth((s) => s.logout);
  const user = useAuth((s) => s.user);
  const { token: { colorBgContainer } } = theme.useToken();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const selectedKey = (() => {
    const seg = location.pathname.split('/').filter(Boolean);
    const charPages = ['farm', 'museum', 'battle', 'class', 'marriage', 'inventory'];
    return seg.length >= 2 && charPages.includes(seg[0]) ? `/${seg[0]}` : `/${seg[0] || ''}`;
  })();
  const visibleItems = menuItems.filter((m) => !m.admin || user?.role === 'admin');

  return (
    <Layout style={{ minHeight: '100vh', background: 'var(--bg-primary)' }}>
      {/* Frosted glass sidebar */}
      <Sider
        trigger={null}
        collapsible
        collapsed={collapsed}
        width={220}
        style={{
          background: 'var(--bg-sidebar)',
          backdropFilter: 'saturate(180%) blur(24px)',
          WebkitBackdropFilter: 'saturate(180%) blur(24px)',
          borderRight: '1px solid rgba(255,255,255,0.08)',
        }}
      >
        {/* Logo area */}
        <div style={{
          height: 64,
          display: 'flex',
          alignItems: 'center',
          justifyContent: collapsed ? 'center' : 'flex-start',
          padding: collapsed ? 0 : '0 20px',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
        }}>
          <Typography.Text
            strong
            style={{
              color: '#f5f5f7',
              fontSize: collapsed ? 16 : 18,
              fontFamily: 'var(--font-display)',
              fontWeight: 600,
              letterSpacing: '-0.03em',
              whiteSpace: 'nowrap',
            }}
          >
            {collapsed ? 'Q' : 'Q宠乐斗'}
          </Typography.Text>
        </div>

        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[selectedKey]}
          items={visibleItems}
          onClick={({ key }) => {
            const charPages = ['/farm', '/museum', '/battle', '/class', '/marriage', '/inventory'];
            if (charPages.includes(key)) {
              const firstId = user?.accountIds?.[0];
              if (firstId) navigate(`${key}/${firstId}`);
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
      </Sider>

      <Layout style={{ background: 'transparent' }}>
        {/* Frosted header */}
        <Header style={{
          padding: '0 28px',
          background: 'var(--bg-header)',
          backdropFilter: 'var(--blur-header)',
          WebkitBackdropFilter: 'var(--blur-header)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          height: 64,
          borderBottom: '1px solid var(--border-subtle)',
          position: 'sticky',
          top: 0,
          zIndex: 10,
        }}>
          <Typography.Text style={{
            fontSize: 13,
            color: 'var(--text-tertiary)',
            fontFamily: 'var(--font-body)',
            fontWeight: 500,
          }}>
            {user?.username ? `${user.username}` : ''}
          </Typography.Text>
          <Button
            type="text"
            onClick={handleLogout}
            style={{
              color: 'var(--text-secondary)',
              fontFamily: 'var(--font-body)',
              fontSize: 13,
              fontWeight: 450,
            }}
          >
            退出登录
          </Button>
        </Header>

        {/* Content */}
        <Content style={{
          margin: 0,
          padding: '28px 32px',
          minHeight: 280,
        }}>
          <div style={{ maxWidth: 1280, margin: '0 auto' }}>
            <Outlet />
          </div>
        </Content>
      </Layout>
    </Layout>
  );
}

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Form, Input, Button, Typography, message } from 'antd';
import { useAuth } from '../../store/useAuth';

export default function Login() {
  const [loading, setLoading] = useState(false);
  const login = useAuth((s) => s.login);
  const navigate = useNavigate();

  const onFinish = async (values: { username: string; password: string }) => {
    setLoading(true);
    const ok = await login(values.username, values.password);
    setLoading(false);
    if (ok) {
      navigate('/dashboard');
    } else {
      message.error('用户名或密码错误');
    }
  };

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      height: '100vh',
      background: 'var(--bg-primary)',
      flexDirection: 'column',
      gap: 32,
    }}>
      {/* Logo */}
      <div style={{ textAlign: 'center' }}>
        <Typography.Text style={{
          fontFamily: 'var(--font-display)',
          fontSize: 42,
          fontWeight: 700,
          letterSpacing: '-0.04em',
          color: 'var(--text-primary)',
          display: 'block',
        }}>
          Q宠乐斗
        </Typography.Text>
        <Typography.Text style={{
          fontFamily: 'var(--font-body)',
          fontSize: 16,
          fontWeight: 450,
          color: 'var(--text-secondary)',
          letterSpacing: '-0.02em',
        }}>
          Dashboard
        </Typography.Text>
      </div>

      {/* Login Card */}
      <div style={{
        width: 380,
        padding: '40px 36px 32px',
        borderRadius: 'var(--radius-xl)',
        background: 'var(--bg-card)',
        backdropFilter: 'var(--blur-glass)',
        WebkitBackdropFilter: 'var(--blur-glass)',
        boxShadow: 'var(--shadow-lg)',
      }}>
        <Form onFinish={onFinish} size="large" layout="vertical">
          <Form.Item
            name="username"
            label={<span style={{ fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)' }}>账号</span>}
            rules={[{ required: true, message: '请输入用户名' }]}
          >
            <Input
              placeholder="手机号 / 邮箱 / 用户名"
              style={{ height: 44, borderRadius: 'var(--radius-sm)', fontSize: 15 }}
            />
          </Form.Item>
          <Form.Item
            name="password"
            label={<span style={{ fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)' }}>密码</span>}
            rules={[{ required: true, message: '请输入密码' }]}
          >
            <Input.Password
              placeholder="密码"
              style={{ height: 44, borderRadius: 'var(--radius-sm)', fontSize: 15 }}
            />
          </Form.Item>
          <Form.Item style={{ marginBottom: 0, marginTop: 24 }}>
            <Button
              type="primary"
              htmlType="submit"
              loading={loading}
              block
              style={{
                height: 44,
                borderRadius: 'var(--radius-sm)',
                fontSize: 16,
                fontFamily: 'var(--font-display)',
                fontWeight: 600,
                letterSpacing: '-0.02em',
              }}
            >
              登录
            </Button>
          </Form.Item>
        </Form>
      </div>
    </div>
  );
}

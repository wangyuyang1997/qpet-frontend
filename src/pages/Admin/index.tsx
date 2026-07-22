import { useEffect, useState } from 'react';
import { Table, Button, Modal, Form, Input, Space, Popconfirm, message, Tabs, Typography, Spin } from 'antd';
import { PlusOutlined, PoweroffOutlined, UploadOutlined, ApiOutlined } from '@ant-design/icons';
import { adminApi } from '../../api/client';
import { useAuth } from '../../store/useAuth';

export default function Admin() {
  const authUser = useAuth((s) => s.user);
  const authLoading = useAuth((s) => s.loading);
  // 兜底：store 为空时从 localStorage 读取（checkAuth 未被调用）
  const user = authUser || (() => { try { return JSON.parse(localStorage.getItem('user_info') || 'null'); } catch { return null; } })();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [uOpen, setUOpen] = useState(false);
  const [form] = Form.useForm();
  const [editU, setEditU] = useState<any>(null);
  const [auctionOpen, setAuctionOpen] = useState(false);
  const [wsOpen, setWsOpen] = useState(false);
  const [aForm] = Form.useForm();
  const [wForm] = Form.useForm();

  useEffect(() => { refresh(); }, []);

  const refresh = async () => {
    setLoading(true);
    const r = await adminApi.users().catch(() => ({ data: { data: [] } }));
    setUsers(r.data.data || r.data || []);
    setLoading(false);
  };

  const saveUser = async (v: any) => {
    if (editU) await adminApi.updateUser(editU.id, v);
    else await adminApi.createUser(v);
    message.success('已保存'); setUOpen(false); setEditU(null); form.resetFields(); refresh();
  };

  if (!user) {
    return <Spin size="large" style={{ display: 'block', margin: '120px auto' }} />;
  }
  if (user.role !== 'admin') {
    return (
      <div style={{ textAlign: 'center', padding: '80px 0' }}>
        <Typography.Text style={{ fontSize: 15, color: 'var(--text-tertiary)' }}>无访问权限</Typography.Text>
      </div>
    );
  }

  const uCols = [
    { title: '', dataIndex: 'id', width: 50, render: (v: number) => <span style={{ fontSize: 12, color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}>#{v}</span> },
    { title: '', dataIndex: 'username', render: (v: string) => <span style={{ fontWeight: 600, fontFamily: 'var(--font-display)' }}>{v}</span> },
    { title: '', dataIndex: 'role', width: 80, render: (v: string) => <span style={{ fontSize: 12, color: v === 'admin' ? 'var(--red)' : 'var(--text-secondary)' }}>{v}</span> },
    { title: '', dataIndex: 'created_at', width: 140, render: (v: string) => <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>{v || '-'}</span> },
    { title: '', key: 'op', width: 100, render: (_: any, r: any) => (
      <Space size={4}>
        <Button size="small" type="text" onClick={() => { setEditU(r); form.setFieldsValue(r); setUOpen(true); }}>编辑</Button>
        <Popconfirm title="删除？" onConfirm={() => adminApi.deleteUser(r.id).then(refresh)}><Button size="small" type="text" danger>删除</Button></Popconfirm>
      </Space>
    )},
  ];

  return (
    <div>
      <h3 style={{ marginBottom: 24 }}>系统管理</h3>
      <Tabs defaultActiveKey="users">
        <Tabs.TabPane tab="用户管理" key="users">
          <Button icon={<PlusOutlined />} style={{ marginBottom: 16 }} onClick={() => { setEditU(null); form.resetFields(); setUOpen(true); }}>新建用户</Button>
          <div style={{ borderRadius: 'var(--radius-lg)', background: 'var(--bg-card)', backdropFilter: 'var(--blur-glass)', WebkitBackdropFilter: 'var(--blur-glass)', boxShadow: 'var(--shadow-sm)', overflow: 'hidden' }}>
            <Table rowKey="id" dataSource={users} columns={uCols} loading={loading} size="middle" showHeader={false} />
          </div>
        </Tabs.TabPane>
        <Tabs.TabPane tab="操作" key="operations">
          <div style={{ display: 'grid', gap: 16 }}>
            <div style={{ borderRadius: 'var(--radius-lg)', background: 'var(--bg-card)', backdropFilter: 'var(--blur-glass)', WebkitBackdropFilter: 'var(--blur-glass)', boxShadow: 'var(--shadow-sm)', padding: '20px 24px' }}>
              <Typography.Text strong style={{ fontSize: 14, display: 'block', marginBottom: 12 }}>服务控制</Typography.Text>
              <Popconfirm title="确认关停所有服务？" onConfirm={() => adminApi.shutdown().then(() => message.success('已发送关停信号'))}>
                <Button danger icon={<PoweroffOutlined />}>优雅关停</Button>
              </Popconfirm>
            </div>
            <div style={{ borderRadius: 'var(--radius-lg)', background: 'var(--bg-card)', backdropFilter: 'var(--blur-glass)', WebkitBackdropFilter: 'var(--blur-glass)', boxShadow: 'var(--shadow-sm)', padding: '20px 24px' }}>
              <Typography.Text strong style={{ fontSize: 14, display: 'block', marginBottom: 12 }}>拍卖数据注入</Typography.Text>
              <Button icon={<UploadOutlined />} onClick={() => setAuctionOpen(true)}>注入拍卖数据</Button>
            </div>
            <div style={{ borderRadius: 'var(--radius-lg)', background: 'var(--bg-card)', backdropFilter: 'var(--blur-glass)', WebkitBackdropFilter: 'var(--blur-glass)', boxShadow: 'var(--shadow-sm)', padding: '20px 24px' }}>
              <Typography.Text strong style={{ fontSize: 14, display: 'block', marginBottom: 12 }}>Webhook</Typography.Text>
              <Button icon={<ApiOutlined />} onClick={() => setWsOpen(true)}>触发 Webhook</Button>
            </div>
          </div>
        </Tabs.TabPane>
      </Tabs>

      <Modal open={uOpen} title={editU ? '编辑用户' : '新建用户'} onCancel={() => { setUOpen(false); setEditU(null); }} onOk={() => form.submit()} width={400}>
        <Form form={form} onFinish={saveUser} layout="vertical">
          <Form.Item name="username" label="用户名" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="password" label="密码"><Input.Password placeholder="留空不修改" /></Form.Item>
          <Form.Item name="role" label="角色"><Input placeholder="user / admin" /></Form.Item>
        </Form>
      </Modal>

      <Modal open={auctionOpen} title="注入拍卖数据" onCancel={() => setAuctionOpen(false)} onOk={() => aForm.submit()} width={500}>
        <Form form={aForm} onFinish={(v) => adminApi.auctionIngest(v).then(() => { message.success('已注入'); setAuctionOpen(false); })} layout="vertical">
          <Form.Item name="data" label="拍卖数据 JSON"><Input.TextArea rows={8} /></Form.Item>
        </Form>
      </Modal>

      <Modal open={wsOpen} title="触发 Webhook" onCancel={() => setWsOpen(false)} onOk={() => wForm.submit()} width={500}>
        <Form form={wForm} onFinish={(v) => adminApi.webhook(v).then(() => { message.success('已触发'); setWsOpen(false); })} layout="vertical">
          <Form.Item name="payload" label="Payload JSON"><Input.TextArea rows={8} /></Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

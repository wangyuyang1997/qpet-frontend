import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Table, Button, Modal, Form, Input, Space, message, Popconfirm, Typography } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { accountApi } from '../../api/client';

export default function Accounts() {
  const [accounts, setAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [form] = Form.useForm();
  const navigate = useNavigate();

  const refresh = async () => {
    const res = await accountApi.list();
    setAccounts(res.data.accounts || res.data || []);
    setLoading(false);
  };

  useEffect(() => { refresh(); }, []);

  const handleAdd = async (v: any) => {
    try { await accountApi.add(v); message.success('已添加'); setAddOpen(false); form.resetFields(); refresh(); }
    catch { message.error('添加失败'); }
  };

  const handleStart = async (id: string) => { await accountApi.start(id); refresh(); };
  const handleStop = async (id: string) => { await accountApi.stop(id); refresh(); };
  const handleDelete = async (id: string) => { await accountApi.delete(id); refresh(); };

  const columns = [
    {
      title: '昵称', dataIndex: 'name', key: 'name', width: 140,
      render: (_: any, r: any) => (
        <a onClick={() => navigate(`/accounts/${r.id}`)} style={{ fontFamily: 'var(--font-display)', fontWeight: 600, color: 'var(--accent)' }}>
          {r.name || r.id?.slice(0, 8)}
        </a>
      ),
    },
    { title: '等级', dataIndex: 'level', key: 'level', width: 70, sorter: (a: any, b: any) => a.level - b.level },
    { title: '职业', dataIndex: 'class_name', key: 'class_name', width: 90, render: (v: string) => v || '-' },
    {
      title: '状态', dataIndex: 'running', key: 'running', width: 90,
      render: (v: any) => (
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: v ? 'var(--green)' : 'var(--text-tertiary)', display: 'inline-block' }} />
          <span style={{ fontSize: 13, color: v ? 'var(--text-primary)' : 'var(--text-tertiary)' }}>{v ? '运行中' : '已停止'}</span>
        </span>
      ),
    },
    {
      title: '', key: 'actions', width: 160,
      render: (_: any, r: any) => (
        <Space size={4}>
          {r.running
            ? <Button size="small" type="text" onClick={() => handleStop(r.id)} style={{ color: 'var(--orange)', fontWeight: 500 }}>停止</Button>
            : <Button size="small" type="text" onClick={() => handleStart(r.id)} style={{ color: 'var(--accent)', fontWeight: 500 }}>启动</Button>
          }
          <Popconfirm title="确认删除？" onConfirm={() => handleDelete(r.id)}>
            <Button size="small" type="text" danger>删除</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <>
      <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ margin: 0 }}>账号管理</h3>
        <Button icon={<PlusOutlined />} onClick={() => setAddOpen(true)}>添加账号</Button>
      </div>

      <Card bodyStyle={{ padding: '0 8px' }} style={{ background: 'var(--bg-card)' }}>
        <Table rowKey="id" dataSource={accounts} columns={columns} loading={loading} size="middle" showHeader={false} />
      </Card>

      <Modal open={addOpen} title="添加账号" onCancel={() => setAddOpen(false)} onOk={() => form.submit()} width={400}>
        <Form form={form} onFinish={handleAdd} layout="vertical">
          <Form.Item name="username" label="用户名"><Input placeholder="游戏账号" /></Form.Item>
          <Form.Item name="password" label="密码"><Input.Password placeholder="游戏密码" /></Form.Item>
          <Form.Item name="token" label="或直接输入 Token"><Input placeholder="已有的游戏 Token" /></Form.Item>
        </Form>
      </Modal>
    </>
  );
}

// Inline card wrapper
function Card({ children, bodyStyle, style }: any) {
  return (
    <div style={{
      borderRadius: 'var(--radius-lg)',
      background: style?.background || 'var(--bg-card)',
      backdropFilter: 'var(--blur-glass)',
      WebkitBackdropFilter: 'var(--blur-glass)',
      boxShadow: 'var(--shadow-sm)',
      ...style,
    }}>
      <div style={bodyStyle}>{children}</div>
    </div>
  );
}

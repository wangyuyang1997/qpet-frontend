import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Table, Button, Modal, Form, Input, Space, message, Popconfirm, Typography } from 'antd';
import { PlusOutlined, KeyOutlined, SafetyOutlined } from '@ant-design/icons';
import { accountApi } from '../../api/client';

export default function Accounts() {
  const [accounts, setAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [credOpen, setCredOpen] = useState(false);
  const [credAccount, setCredAccount] = useState<any>(null);
  const [credLoading, setCredLoading] = useState(false);
  const [form] = Form.useForm();
  const [credForm] = Form.useForm();
  const navigate = useNavigate();

  const refresh = async () => {
    const res = await accountApi.list();
    setAccounts(res.data?.data || res.data || []);
    setLoading(false);
  };

  useEffect(() => { refresh(); }, []);

  const handleAdd = async (v: any) => {
    try { await accountApi.add(v); message.success('已添加'); setAddOpen(false); form.resetFields(); refresh(); }
    catch { message.error('添加失败'); }
  };

  const handleDelete = async (id: string) => { await accountApi.delete(id); refresh(); };

  const handleOpenCred = async (acc: any) => {
    setCredAccount(acc);
    setCredOpen(true);
    setCredLoading(true);
    try {
      const res = await accountApi.getCredentials(acc.id);
      const d = res.data?.data || res.data || {};
      credForm.setFieldsValue({ username: d.username || '', password: '' });
    } catch { credForm.setFieldsValue({ username: '', password: '' }); }
    setCredLoading(false);
  };

  const handleSaveCred = async () => {
    const v = credForm.getFieldsValue();
    try {
      await accountApi.updateCredentials(credAccount.id, v);
      message.success('账密已保存');
      setCredOpen(false);
    } catch { message.error('保存失败'); }
  };

  const handleRegenKey = async (id: string) => {
    try {
      const res = await accountApi.regenerateKey(id);
      const ok = res.data?.success;
      if (ok) message.success(res.data?.message || 'ECDSA 密钥已重新生成');
      else message.error(res.data?.message || '密钥生成失败');
    } catch { message.error('请求失败'); }
  };

  const columns = [
    {
      title: '昵称', dataIndex: 'name', key: 'name', width: 140,
      render: (_: any, r: any) => (
        <a onClick={() => navigate(`/accounts/${r.id}`)} style={{ fontFamily: 'var(--font-display)', fontWeight: 600, color: 'var(--accent)' }}>
          {r.name || r.id?.slice(0, 8)}
        </a>
      ),
    },
    { title: '等级', dataIndex: 'level', key: 'level', width: 70, sorter: (a: any, b: any) => (a.level || 0) - (b.level || 0) },
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
      title: '', key: 'actions', width: 200,
      render: (_: any, r: any) => (
        <Space size={4}>
          <Button size="small" type="text" icon={<SafetyOutlined />}
            onClick={() => handleOpenCred(r)} style={{ fontWeight: 500 }}>账密</Button>
          <Button size="small" type="text" icon={<KeyOutlined />}
            onClick={() => handleRegenKey(r.id)} style={{ fontWeight: 500 }}>密钥</Button>
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
        <Typography.Text style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 700 }}>
          角色管理
        </Typography.Text>
        <Button icon={<PlusOutlined />} onClick={() => setAddOpen(true)}>添加账号</Button>
      </div>

      <Card bodyStyle={{ padding: '0 8px' }} style={{ background: 'var(--bg-card)' }}>
        <Table rowKey="id" dataSource={accounts} columns={columns} loading={loading} size="middle" showHeader={false} />
      </Card>

      {/* 添加账号 */}
      <Modal open={addOpen} title="添加账号" onCancel={() => setAddOpen(false)} onOk={() => form.submit()} width={400}>
        <Form form={form} onFinish={handleAdd} layout="vertical">
          <Form.Item name="username" label="用户名"><Input placeholder="游戏账号" /></Form.Item>
          <Form.Item name="password" label="密码"><Input.Password placeholder="游戏密码" /></Form.Item>
          <Form.Item name="token" label="或直接输入 Token"><Input placeholder="已有的游戏 Token" /></Form.Item>
        </Form>
      </Modal>

      {/* 设置账密 */}
      <Modal open={credOpen} title={`设置账密 — ${credAccount?.name || credAccount?.id || ''}`}
        onCancel={() => setCredOpen(false)} onOk={handleSaveCred} width={400}
        confirmLoading={credLoading}>
        <Form form={credForm} layout="vertical">
          <Form.Item name="username" label="用户名"><Input placeholder="游戏账号" /></Form.Item>
          <Form.Item name="password" label="密码"><Input.Password placeholder="输入新密码（留空不修改）" /></Form.Item>
        </Form>
      </Modal>
    </>
  );
}

function Card({ children, bodyStyle, style }: any) {
  return (
    <div style={{
      borderRadius: 'var(--radius-lg)', background: style?.background || 'var(--bg-card)',
      backdropFilter: 'var(--blur-glass)', WebkitBackdropFilter: 'var(--blur-glass)',
      boxShadow: 'var(--shadow-sm)', ...style,
    }}>
      <div style={bodyStyle}>{children}</div>
    </div>
  );
}

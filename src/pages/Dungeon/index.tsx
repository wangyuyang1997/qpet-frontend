import { useEffect, useState } from 'react';
import { Tabs, Table, Button, Modal, Form, Input, InputNumber, Select, Popconfirm, message, Space, Typography } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { dungeonApi } from '../../api/client';

export default function Dungeon() {
  const [strategies, setStrategies] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [sOpen, setSOpen] = useState(false);
  const [tOpen, setTOpen] = useState(false);
  const [sForm] = Form.useForm();
  const [tForm] = Form.useForm();
  const [editS, setEditS] = useState<any>(null);
  const [editT, setEditT] = useState<any>(null);

  const refresh = async () => {
    setLoading(true);
    const [s, t, h] = await Promise.all([
      dungeonApi.strategies().catch(() => ({ data: { data: [] } })),
      dungeonApi.templates().catch(() => ({ data: { data: [] } })),
      dungeonApi.history().catch(() => ({ data: { data: [] } })),
    ]);
    setStrategies(s.data.data || s.data || []);
    setTemplates(t.data.data || t.data || []);
    setHistory(h.data.data || h.data || []);
    setLoading(false);
  };

  useEffect(() => { refresh(); }, []);

  const saveStrategy = async (v: any) => {
    if (editS) await dungeonApi.updateStrategy(editS.id, v);
    else await dungeonApi.createStrategy(v);
    message.success('已保存'); setSOpen(false); setEditS(null); refresh();
  };

  const saveTemplate = async (v: any) => {
    if (editT) await dungeonApi.updateTemplate(editT.id, v);
    else await dungeonApi.createTemplate(v);
    message.success('已保存'); setTOpen(false); setEditT(null); refresh();
  };

  const sCols = [
    { title: '名称', dataIndex: 'name', render: (v: string) => <span style={{ fontWeight: 500 }}>{v}</span> },
    { title: '副本', dataIndex: 'dungeon', render: (v: string) => <span style={{ color: 'var(--text-secondary)' }}>{v || '-'}</span> },
    { title: '', dataIndex: 'enabled', width: 60, render: (v: boolean) => <span style={{ color: v ? 'var(--green)' : 'var(--text-tertiary)', fontSize: 12 }}>{v ? '启用' : '停用'}</span> },
    { title: '', key: 'op', width: 120, render: (_: any, r: any) => (
      <Space size={4}>
        <Button size="small" type="text" onClick={() => { setEditS(r); sForm.setFieldsValue(r); setSOpen(true); }}>编辑</Button>
        <Popconfirm title="删除？" onConfirm={() => dungeonApi.deleteStrategy(r.id).then(refresh)}><Button size="small" type="text" danger>删除</Button></Popconfirm>
      </Space>
    )},
  ];

  const tCols = [
    { title: '名称', dataIndex: 'name', render: (v: string) => <span style={{ fontWeight: 500 }}>{v}</span> },
    { title: '说明', dataIndex: 'description', render: (v: string) => <span style={{ color: 'var(--text-secondary)' }}>{v || '-'}</span> },
    { title: '', key: 'op', width: 120, render: (_: any, r: any) => (
      <Space size={4}>
        <Button size="small" type="text" onClick={() => { setEditT(r); tForm.setFieldsValue(r); setTOpen(true); }}>编辑</Button>
        <Popconfirm title="删除？" onConfirm={() => dungeonApi.deleteTemplate(r.id).then(refresh)}><Button size="small" type="text" danger>删除</Button></Popconfirm>
      </Space>
    )},
  ];

  const hCols = [
    { title: '时间', dataIndex: 'created_at', width: 160, render: (v: string) => <span style={{ fontSize: 12, color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}>{v || '-'}</span> },
    { title: '副本', dataIndex: 'dungeon', render: (v: string) => <span style={{ fontWeight: 500 }}>{v || '-'}</span> },
    { title: '', dataIndex: 'result', width: 60, render: (v: string) => <span style={{ color: v === 'win' ? 'var(--green)' : 'var(--red)', fontSize: 12 }}>{v}</span> },
    { title: '奖励', dataIndex: 'rewards', render: (v: string) => v || '-' },
  ];

  return (
    <div>
      <h3 style={{ marginBottom: 24 }}>副本管理</h3>
      <Tabs defaultActiveKey="strategies">
        <Tabs.TabPane tab="策略" key="strategies">
          <Button icon={<PlusOutlined />} style={{ marginBottom: 16 }} onClick={() => { setEditS(null); sForm.resetFields(); setSOpen(true); }}>新建策略</Button>
          <div style={{ borderRadius: 'var(--radius-lg)', background: 'var(--bg-card)', backdropFilter: 'var(--blur-glass)', WebkitBackdropFilter: 'var(--blur-glass)', boxShadow: 'var(--shadow-sm)', overflow: 'hidden' }}>
            <Table rowKey="id" dataSource={strategies} columns={sCols} loading={loading} size="middle" showHeader={false} />
          </div>
        </Tabs.TabPane>
        <Tabs.TabPane tab="模板" key="templates">
          <Button icon={<PlusOutlined />} style={{ marginBottom: 16 }} onClick={() => { setEditT(null); tForm.resetFields(); setTOpen(true); }}>新建模板</Button>
          <div style={{ borderRadius: 'var(--radius-lg)', background: 'var(--bg-card)', backdropFilter: 'var(--blur-glass)', WebkitBackdropFilter: 'var(--blur-glass)', boxShadow: 'var(--shadow-sm)', overflow: 'hidden' }}>
            <Table rowKey="id" dataSource={templates} columns={tCols} loading={loading} size="middle" showHeader={false} />
          </div>
        </Tabs.TabPane>
        <Tabs.TabPane tab="历史" key="history">
          <div style={{ borderRadius: 'var(--radius-lg)', background: 'var(--bg-card)', backdropFilter: 'var(--blur-glass)', WebkitBackdropFilter: 'var(--blur-glass)', boxShadow: 'var(--shadow-sm)', overflow: 'hidden' }}>
            <Table rowKey="id" dataSource={history} columns={hCols} loading={loading} size="middle" showHeader={false} />
          </div>
        </Tabs.TabPane>
      </Tabs>

      <Modal open={sOpen} title={editS ? '编辑策略' : '新建策略'} onCancel={() => { setSOpen(false); setEditS(null); }} onOk={() => sForm.submit()} width={400}>
        <Form form={sForm} onFinish={saveStrategy} layout="vertical">
          <Form.Item name="name" label="名称" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="dungeon" label="副本"><Input /></Form.Item>
          <Form.Item name="enabled" label="启用"><Select options={[{ label: '是', value: true }, { label: '否', value: false }]} /></Form.Item>
        </Form>
      </Modal>

      <Modal open={tOpen} title={editT ? '编辑模板' : '新建模板'} onCancel={() => { setTOpen(false); setEditT(null); }} onOk={() => tForm.submit()} width={400}>
        <Form form={tForm} onFinish={saveTemplate} layout="vertical">
          <Form.Item name="name" label="名称" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="description" label="说明"><Input.TextArea /></Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

import { useEffect, useState } from 'react';
import { Table, Switch, Select, Spin, message, Tabs, Button, Space, Typography } from 'antd';
import { SyncOutlined, PlayCircleOutlined } from '@ant-design/icons';
import { configApi, accountApi } from '../../api/client';

export default function Config() {
  const [accounts, setAccounts] = useState<any[]>([]);
  const [defs, setDefs] = useState<any[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [configs, setConfigs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState('');

  useEffect(() => {
    Promise.all([accountApi.list(), configApi.definitions()])
      .then(([a, d]) => { setAccounts(a.data.accounts || a.data || []); setDefs(d.data.data || d.data || []); })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!selected) return;
    configApi.get(selected).then((r) => setConfigs(r.data.data || r.data || []));
  }, [selected]);

  const handleToggle = async (key: string, value: string) => {
    if (!selected) return;
    const nv = value === 'true' ? 'false' : 'true';
    await configApi.update({ account_id: selected, key, value: nv });
    setConfigs((prev) => prev.map((c) => (c.key === key ? { ...c, value: nv } : c)));
    message.success(`${key} → ${nv}`);
  };

  const doAction = async (action: string) => {
    if (!selected) return;
    setActionLoading(action);
    try { await accountApi.action(selected, action); message.success(`${action} 已触发`); }
    catch { message.error('操作失败'); }
    setActionLoading('');
  };

  if (loading) return <Spin size="large" style={{ display: 'block', margin: '120px auto' }} />;

  const selectedAccount = accounts.find((a) => a.id === selected);

  const ACTION_BUTTONS = [
    { key: 'cycle', label: '主循环', icon: <SyncOutlined /> },
    { key: 'fight', label: '战斗', icon: <PlayCircleOutlined /> },
    { key: 'farm', label: '农场', icon: <PlayCircleOutlined /> },
    { key: 'checkin', label: '签到', icon: <PlayCircleOutlined /> },
    { key: 'auction', label: '拍卖快照', icon: <PlayCircleOutlined /> },
    { key: 'buy-auction', label: '拍卖购买', icon: <PlayCircleOutlined /> },
    { key: 'equip-all', label: '一键装备', icon: <PlayCircleOutlined /> },
  ];

  return (
    <div>
      <h3 style={{ marginBottom: 24 }}>自动化配置</h3>
      <div style={{ marginBottom: 20 }}>
        <Select placeholder="选择账号" style={{ width: 300 }} value={selected} onChange={setSelected}
          options={accounts.map((a) => ({ label: `${a.name} (Lv.${a.level})`, value: a.id }))} />
      </div>

      {selected && (
        <Tabs defaultActiveKey="switches">
          <Tabs.TabPane tab="开关控制" key="switches">
            <div style={{ borderRadius: 'var(--radius-lg)', background: 'var(--bg-card)', backdropFilter: 'var(--blur-glass)', WebkitBackdropFilter: 'var(--blur-glass)', boxShadow: 'var(--shadow-sm)', overflow: 'hidden' }}>
              <Table rowKey="key" dataSource={configs} pagination={false} size="middle" showHeader={false}
                columns={[
                  { title: '', dataIndex: 'key', width: 200, render: (v: string) => <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 500 }}>{v}</span> },
                  { title: '', dataIndex: 'description', render: (v: string) => <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{v}</span> },
                  { title: '', width: 80, render: (_: any, r: any) =>
                      r.value_type === 'bool' ? <Switch size="small" checked={r.value === 'true'} onChange={() => handleToggle(r.key, r.value)} /> : <span>{r.value}</span>
                  },
                ]}
              />
            </div>
          </Tabs.TabPane>
          <Tabs.TabPane tab="手动操作" key="actions">
            <div style={{ borderRadius: 'var(--radius-lg)', background: 'var(--bg-card)', backdropFilter: 'var(--blur-glass)', WebkitBackdropFilter: 'var(--blur-glass)', boxShadow: 'var(--shadow-sm)', padding: '24px' }}>
              {selectedAccount && (
                <Typography.Text style={{ display: 'block', marginBottom: 16, fontSize: 14, color: 'var(--text-secondary)' }}>
                  {selectedAccount.name} · Lv.{selectedAccount.level} · {selectedAccount.running ? '🟢 运行中' : '⚪ 已停止'}
                </Typography.Text>
              )}
              <Space wrap size={8}>
                {ACTION_BUTTONS.map((btn) => (
                  <Button key={btn.key} icon={btn.icon} loading={actionLoading === btn.key} onClick={() => doAction(btn.key)}>{btn.label}</Button>
                ))}
              </Space>
            </div>
          </Tabs.TabPane>
        </Tabs>
      )}
    </div>
  );
}

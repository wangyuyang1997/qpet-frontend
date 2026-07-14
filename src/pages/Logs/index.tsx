import { useEffect, useState, useRef } from 'react';
import { Table, Select, DatePicker, Card, Tag, Space, Switch, Typography } from 'antd';
import { dashboardApi, accountApi } from '../../api/client';
import dayjs from 'dayjs';

const LEVEL_STYLE: Record<string, { bg: string; color: string }> = {
  INFO: { bg: 'rgba(0,113,227,0.08)', color: '#0071e3' },
  WARN: { bg: 'rgba(255,149,0,0.08)', color: '#ff9500' },
  ERROR: { bg: 'rgba(255,59,48,0.08)', color: '#ff3b30' },
  DEBUG: { bg: 'rgba(0,0,0,0.04)', color: '#aeaeb2' },
};

export default function Logs() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [filter, setFilter] = useState<{ account?: string; date?: string }>({});
  const [sseEnabled, setSseEnabled] = useState(false);
  const [stats, setStats] = useState<any>({ today: 0, history: 0 });
  const eventSourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    accountApi.list().then((r) => setAccounts(r.data.accounts || r.data || []));
    dashboardApi.stats().then((r) => setStats(r.data));
  }, []);

  useEffect(() => {
    if (sseEnabled) {
      const token = localStorage.getItem('token');
      const es = new EventSource(`/api/sse?_t=${token}`);
      es.onmessage = (e) => {
        try { const entry = JSON.parse(e.data); setLogs((prev) => [entry, ...prev].slice(0, 500)); } catch {}
      };
      es.onerror = () => { es.close(); setSseEnabled(false); };
      eventSourceRef.current = es;
      return () => { es.close(); };
    }
  }, [sseEnabled]);

  useEffect(() => {
    setLoading(true);
    dashboardApi.logs({ ...filter, limit: 500 }).then((r) => {
      setLogs(r.data.logs || r.data.data || r.data || []);
      setLoading(false);
    });
  }, [filter]);

  const columns = [
    { title: '', dataIndex: 'created_at', width: 140, render: (v: string) => (
      <span style={{ fontSize: 12, color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}>{v ? dayjs(v).format('MM-DD HH:mm:ss') : '-'}</span>
    )},
    { title: '', dataIndex: 'account_name', width: 90, render: (v: string) => v ? <span style={{ fontSize: 13, fontWeight: 500 }}>{v}</span> : '-' },
    {
      title: '', dataIndex: 'level', width: 60,
      render: (v: string) => {
        const s = LEVEL_STYLE[v] || LEVEL_STYLE.DEBUG;
        return <span style={{ fontSize: 11, fontWeight: 600, padding: '1px 6px', borderRadius: 100, background: s.bg, color: s.color, fontFamily: 'var(--font-mono)' }}>{v}</span>;
      },
    },
    { title: '', dataIndex: 'message', render: (v: string) => (
      <span style={{ fontSize: 13, color: 'var(--text-primary)' }}>{v}</span>
    )},
  ];

  return (
    <div>
      <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 32 }}>
          <h3 style={{ margin: 0 }}>运行日志</h3>
          <div style={{ display: 'flex', gap: 24 }}>
            <div>
              <Typography.Text style={{ fontSize: 11, color: 'var(--text-tertiary)', display: 'block' }}>今日</Typography.Text>
              <Typography.Text style={{ fontSize: 18, fontWeight: 700, fontFamily: 'var(--font-display)', letterSpacing: '-0.03em' }}>{stats?.today || 0}</Typography.Text>
            </div>
            <div>
              <Typography.Text style={{ fontSize: 11, color: 'var(--text-tertiary)', display: 'block' }}>历史</Typography.Text>
              <Typography.Text style={{ fontSize: 18, fontWeight: 700, fontFamily: 'var(--font-display)', letterSpacing: '-0.03em' }}>{stats?.history || 0}</Typography.Text>
            </div>
          </div>
        </div>
        <Switch checkedChildren="SSE" unCheckedChildren="轮询" checked={sseEnabled} onChange={setSseEnabled} />
      </div>

      <Space style={{ marginBottom: 16 }}>
        <Select allowClear placeholder="全部账号" style={{ width: 200 }}
          options={accounts.map((a) => ({ label: a.name, value: a.id }))}
          onChange={(v) => setFilter((f) => ({ ...f, account: v }))} />
        <DatePicker onChange={(d) => setFilter((f) => ({ ...f, date: d?.format('YYYY-MM-DD') }))} />
      </Space>

      <div style={{ borderRadius: 'var(--radius-lg)', background: 'var(--bg-card)', backdropFilter: 'var(--blur-glass)', WebkitBackdropFilter: 'var(--blur-glass)', boxShadow: 'var(--shadow-sm)', overflow: 'hidden' }}>
        <Table rowKey={(_, i) => String(i)} dataSource={logs} columns={columns} loading={loading && !sseEnabled} size="middle" showHeader={false} pagination={{ size: 'small', pageSize: 50 }} />
      </div>
    </div>
  );
}

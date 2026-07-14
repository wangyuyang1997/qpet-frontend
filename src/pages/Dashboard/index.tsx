import { useEffect, useState } from 'react';
import { Row, Col, Card, Table, Tag, Spin, Typography } from 'antd';
import ReactECharts from 'echarts-for-react';
import { dashboardApi, accountApi } from '../../api/client';

const StatCell = ({ label, value, vs }: { label: string; value: any; vs?: string }) => (
  <div style={{ padding: '4px 0' }}>
    <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4 }}>{label}</div>
    <div style={{ fontSize: 28, fontWeight: 700, fontFamily: 'var(--font-display)', letterSpacing: '-0.03em' }}>
      {value?.toLocaleString?.() ?? value ?? '-'}
    </div>
    {vs && <div style={{ fontSize: 11, color: vs.startsWith('↑') ? '#52c41a' : vs.startsWith('↓') ? '#ff4d4f' : 'var(--text-tertiary)', marginTop: 2 }}>{vs}</div>}
  </div>
);

export default function Dashboard() {
  const [status, setStatus] = useState<any>(null);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [weeklyMap, setWeeklyMap] = useState<Record<string, any[]>>({});
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string>('');

  useEffect(() => {
    Promise.all([dashboardApi.status(), accountApi.list(), dashboardApi.stats().catch(() => ({ data: {} }))])
      .then(async ([s, a]) => {
        setStatus(s.data);
        const list = a.data?.accounts || a.data || [];
        setAccounts(list);
        const running = list.find((acc: any) => acc.running);
        if (running) setSelectedId(running.id);
      })
      .finally(() => setLoading(false));
  }, []);

  // Fetch weekly data for selected account
  useEffect(() => {
    if (!selectedId) return;
    const api = accountApi as any;
    (api.weekly || (() => Promise.resolve({ data: [] })))(selectedId)
      .then((res: any) => setWeeklyMap((prev: any) => ({ ...prev, [selectedId]: res.data || [] })))
      .catch(() => {});
  }, [selectedId]);

  if (loading) return <Spin size="large" style={{ display: 'block', margin: '120px auto' }} />;

  const runningCount = accounts.filter((a: any) => a.running).length;
  const totalExp = accounts.reduce((s: number, a: any) => s + (a.today_exp_gained || 0), 0);
  const activeDays = 7; // TODO: calculate from daily_records
  const weekly = weeklyMap[selectedId] || [];

  // Weekly trend chart for selected account
  const trendOption = {
    grid: { top: 12, right: 16, bottom: 8, left: 44 },
    tooltip: { trigger: 'axis' },
    xAxis: { type: 'category', data: weekly.map((r: any) => r.date?.slice(5) || ''), axisLabel: { fontSize: 11, color: '#aeaeb2' } },
    yAxis: { type: 'value', splitLine: { lineStyle: { color: 'rgba(0,0,0,0.04)' } }, axisLabel: { fontSize: 11, color: '#aeaeb2' } },
    series: [{
      name: '经验', type: 'line', smooth: true, symbol: 'circle', symbolSize: 6,
      data: weekly.map((r: any) => r.today_harvest_exp || 0),
      lineStyle: { color: '#0071e3', width: 2 }, itemStyle: { color: '#0071e3' },
      areaStyle: { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: 'rgba(0,113,227,0.15)' }, { offset: 1, color: 'rgba(0,113,227,0)' }] } },
    }],
  };

  // Pie chart for experience distribution
  const pieOption = {
    tooltip: { trigger: 'item' },
    series: [{
      type: 'pie', radius: ['55%', '80%'], center: ['50%', '50%'],
      label: { fontSize: 11 }, emphasis: { label: { fontSize: 14, fontWeight: 'bold' } },
      data: accounts.map((a: any) => ({ name: a.name || a.id?.slice(0, 6), value: a.today_exp_gained || 1 })),
    }],
  };

  // Multi-line chart for all accounts weekly trend
  const multiLineOption = {
    grid: { top: 12, right: 16, bottom: 8, left: 44 },
    tooltip: { trigger: 'axis' },
    xAxis: { type: 'category', data: weekly.map((r: any) => r.date?.slice(5) || ''), axisLabel: { fontSize: 11, color: '#aeaeb2' } },
    yAxis: { type: 'value', splitLine: { lineStyle: { color: 'rgba(0,0,0,0.04)' } }, axisLabel: { fontSize: 11, color: '#aeaeb2' } },
    series: accounts.slice(0, 5).map((a: any, i: number) => ({
      name: a.name || a.id?.slice(0, 6), type: 'line',
      data: (weeklyMap[a.id] || []).map((r: any) => r.today_harvest_exp || 0),
      smooth: true, symbol: 'none',
    })),
  };

  const tableColumns = [
    { title: '昵称', dataIndex: 'name', key: 'name', width: 110, render: (v: string, r: any) => v || r.id?.slice(0, 8) },
    { title: '等级', dataIndex: 'level', key: 'level', width: 60, sorter: (a: any, b: any) => a.level - b.level },
    { title: '职业', dataIndex: 'class_name', key: 'cn', width: 80, render: (v: string) => v || '-' },
    { title: '今日经验', key: 'exp', width: 100, render: (_: any, r: any) => (r.today_exp_gained || 0).toLocaleString() },
    {
      title: '状态', dataIndex: 'running', key: 'r', width: 80,
      render: (v: boolean) => (
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: v ? '#52c41a' : '#aeaeb2', display: 'inline-block' }} />
          <span style={{ fontSize: 13, color: v ? '#52c41a' : '#aeaeb2' }}>{v ? '运行' : '停止'}</span>
        </span>
      ),
    },
    {
      title: '', key: 'action', width: 60,
      render: (_: any, r: any) => (
        <Typography.Link onClick={() => setSelectedId(r.id)} style={{ fontSize: 12 }}>
          {r.id === selectedId ? '✓ 当前' : '查看'}
        </Typography.Link>
      ),
    },
  ];

  return (
    <div>
      {/* Current character section */}
      {selectedId && (
        <Card size="small" style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginBottom: 12 }}>
            当前角色: {accounts.find((a: any) => a.id === selectedId)?.name || selectedId?.slice(0, 8)}
          </div>
          <Row gutter={[16, 16]}>
            <Col xs={12} sm={6}><StatCell label="今日经验" value={accounts.find((a: any) => a.id === selectedId)?.today_exp_gained || 0} vs="↑12% vs昨" /></Col>
            <Col xs={12} sm={6}><StatCell label="今日战斗" value="-" /></Col>
            <Col xs={12} sm={6}><StatCell label="今日爬塔" value="-" /></Col>
            <Col xs={12} sm={6}><StatCell label="今日BOSS" value="-" /></Col>
          </Row>
          <div style={{ marginTop: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>本周经验趋势</div>
            {weekly.length > 0 ? (
              <ReactECharts option={trendOption} style={{ height: 200 }} />
            ) : (
              <Typography.Text type="secondary" style={{ fontSize: 12 }}>暂无周数据</Typography.Text>
            )}
          </div>
        </Card>
      )}

      {/* All roles summary */}
      <Card size="small" title="全部角色 · 本周" style={{ marginBottom: 24 }}>
        <Row gutter={[16, 16]}>
          <Col xs={12} sm={6}><StatCell label="总经验" value={totalExp} vs="↑8% vs上周" /></Col>
          <Col xs={12} sm={6}><StatCell label="总战斗" value="-" /></Col>
          <Col xs={12} sm={6}><StatCell label="活跃天数" value={activeDays} /></Col>
          <Col xs={12} sm={6}><StatCell label="角色数" value={accounts.length} /></Col>
        </Row>
        <Row gutter={16} style={{ marginTop: 16 }}>
          <Col xs={24} md={12}>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>各角色经验占比</div>
            <ReactECharts option={pieOption} style={{ height: 220 }} />
          </Col>
          <Col xs={24} md={12}>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>各角色本周趋势</div>
            <ReactECharts option={multiLineOption} style={{ height: 220 }} />
          </Col>
        </Row>
      </Card>

      {/* Today progress checklist */}
      <Card size="small" title="当前角色 · 今日进度" style={{ marginBottom: 24 }}>
        <Row gutter={[12, 8]}>
          {['签到 ✅', 'NPC -/10', '好友 -/3', '爬塔 -/6', 'BOSS ✅', '世界 ✅', '婚内送花 -/5', '广告 ✅', '挑战书 ✅', '体力购买 ✅'].map((item, i) => (
            <Col key={i} xs={12} sm={6} md={4}>
              <Tag style={{ fontSize: 12, padding: '4px 10px', borderRadius: 6 }}>
                {item}
              </Tag>
            </Col>
          ))}
        </Row>
      </Card>

      {/* Accounts table */}
      <Card size="small" title={<span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 15 }}>账号</span>}
        bodyStyle={{ padding: '0 8px' }}>
        <Table rowKey="id" dataSource={accounts} columns={tableColumns} pagination={false} size="small" showHeader={false} />
      </Card>
    </div>
  );
}

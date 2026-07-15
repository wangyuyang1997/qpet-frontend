import { useEffect, useState, useMemo, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Row, Col, Card, Tag, Spin, Typography, Empty } from 'antd';
import ReactECharts from 'echarts-for-react';
import { useAccount } from '../../store/useAccount';
import { dashboardApi } from '../../api/client';

interface WeeklyRow {
  date: string; level: number; class_name: string; combat_power: number;
  npc_fights: number; friend_fights: number; steals: number; tower_floors: number; tower_max: number;
  exp_battle: number; today_harvest_exp: number; current_exp: number; level_exp: number; level_exp_max: number;
  gang_contribution: number; abyss_tickets: number;
  stamina_ads: number; community_ads: number; farm_ads: number;
}

interface SummaryRow {
  total_exp: number; total_contrib: number;
  total_steals: number; total_accounts: number;
}

function StatCell({ label, value, vs }: { label: string; value: string | number; vs?: string }) {
  const isUp = vs?.startsWith('↑');
  const isDown = vs?.startsWith('↓');
  return (
    <div style={{ textAlign: 'center', padding: '8px 4px' }}>
      <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 700, fontFamily: 'var(--font-display)', letterSpacing: '-0.03em', lineHeight: 1.2 }}>
        {typeof value === 'number' ? value.toLocaleString() : value}
      </div>
      {vs && (
        <div style={{
          fontSize: 11, marginTop: 4,
          color: isUp ? 'var(--green)' : isDown ? 'var(--red)' : 'var(--text-tertiary)',
        }}>
          {vs}
        </div>
      )}
    </div>
  );
}

export default function Dashboard() {
  const { accountId: paramId } = useParams<{ accountId: string }>();
  const { selectedAccountId, accounts } = useAccount();
  const navigate = useNavigate();
  const accountId = paramId || selectedAccountId;

  const [weekly, setWeekly] = useState<WeeklyRow[]>([]);
  const [summary, setSummary] = useState<SummaryRow | null>(null);
  const [allWeekly, setAllWeekly] = useState<Record<string, WeeklyRow[]>>({});
  const [loading, setLoading] = useState(true);

  // Redirect if no accountId in URL but selected in store
  useEffect(() => {
    if (!paramId && selectedAccountId) {
      navigate(`/overview/${selectedAccountId}`, { replace: true });
    }
  }, [paramId, selectedAccountId, navigate]);

  // Fetch current account weekly data
  useEffect(() => {
    if (!accountId) return;
    setLoading(true);
    dashboardApi.weekly(accountId)
      .then((res: any) => {
        const data = res.data?.data || res.data || [];
        setWeekly(Array.isArray(data) ? data : []);
        setSummary(res.data?.summary || null);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [accountId]);

  // Fetch all other accounts weekly data for multi-line chart
  const prevIdsRef2 = useRef('');
  useEffect(() => {
    const idsKey = accounts.map((a) => a.id).sort().join(',') + '|' + accountId;
    if (idsKey === prevIdsRef2.current) return;
    prevIdsRef2.current = idsKey;
    if (accounts.length === 0) return;
    const others = accounts.filter((a) => a.id !== accountId);
    if (others.length === 0) return;
    Promise.all(others.map((a) =>
      dashboardApi.weekly(a.id).then((res: any) => ({ id: a.id, data: res.data?.data || [] })).catch(() => ({ id: a.id, data: [] })),
    )).then((results) => {
      setAllWeekly((prev) => {
        const map = { ...prev };
        results.forEach((r) => { map[r.id] = r.data; });
        return map;
      });
    });
  }, [accounts, accountId]);

  const todayRow = weekly.length > 0 ? weekly[weekly.length - 1] : null;
  const yesterdayRow = weekly.length > 1 ? weekly[weekly.length - 2] : null;

  function vsYesterday(today: number, yesterday: number | undefined): string | undefined {
    if (yesterday === undefined || yesterday === 0) return undefined;
    const pct = Math.round((today - yesterday) / yesterday * 100);
    if (pct > 0) return `↑${pct}% vs昨`;
    if (pct < 0) return `↓${Math.abs(pct)}% vs昨`;
    return '→ 持平';
  }

  const todayExp = (todayRow?.today_harvest_exp || 0);
  const yesterdayExp = yesterdayRow?.today_harvest_exp;

  // Current character weekly trend chart
  const trendOption = useMemo(() => ({
    grid: { top: 8, right: 16, bottom: 4, left: 44 },
    tooltip: { trigger: 'axis' },
    xAxis: { type: 'category', data: weekly.map((r) => r.date?.slice(5) || ''), axisLabel: { fontSize: 11, color: '#aeaeb2' } },
    yAxis: { type: 'value', splitLine: { lineStyle: { color: 'rgba(0,0,0,0.04)' } }, axisLabel: { fontSize: 11, color: '#aeaeb2' } },
    series: [{
      type: 'line', smooth: true, symbol: 'circle', symbolSize: 5,
      data: weekly.map((r) => r.today_harvest_exp || 0),
      lineStyle: { color: '#0071e3', width: 2 }, itemStyle: { color: '#0071e3' },
      areaStyle: { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: 'rgba(0,113,227,0.12)' }, { offset: 1, color: 'rgba(0,113,227,0)' }] } },
    }],
  }), [weekly]);

  // All accounts pie chart — 本周各角色经验占比
  const pieOption = useMemo(() => {
    const merged: Record<string, WeeklyRow[]> = { ...allWeekly };
    if (accountId && weekly.length > 0) merged[accountId] = weekly;
    const pieData = accounts.map((a) => ({
      name: a.name,
      value: (merged[a.id] || []).slice(-1)[0]?.current_exp || 0,
    }));
    return {
      tooltip: { trigger: 'item', formatter: (p: any) => `${p.name}: ${p.value?.toLocaleString()} (${p.percent}%)` },
      series: [{
        type: 'pie', radius: ['50%', '78%'], center: ['50%', '50%'],
        label: { fontSize: 10, color: '#6e6e73' },
        data: pieData.length > 0 ? pieData : [{ name: '暂无数据', value: 1 }],
        itemStyle: { borderColor: '#fff', borderWidth: 2 },
      }],
    };
  }, [accounts, allWeekly, weekly, accountId]);

  // Multi-line chart for all accounts
  const dates = weekly.length > 0 ? weekly.map((r) => r.date?.slice(5) || '') : ['一', '二', '三', '四', '五', '六', '日'];
  const colors = ['#0071e3', '#ff9500', '#34c759', '#ff3b30', '#5ac8fa', '#af52de'];
  const multiLineOption = useMemo(() => {
    const merged: Record<string, WeeklyRow[]> = { ...allWeekly };
    if (accountId && weekly.length > 0) merged[accountId] = weekly;
    // Build series: use level_exp for upgrade progress; skip Lv.100 with 0 level_exp
    const trendSeries = accounts
      .map((a, i) => {
        const data = (merged[a.id] || []).map((r) => r.level_exp ?? 0);
        const latest = (merged[a.id] || []).slice(-1)[0];
        const lv = latest?.level ?? a.level;
        if ((latest?.level_exp_max ?? 0) === 0) return null;
        return {
          name: `${a.name} Lv.${lv}`, type: 'line', smooth: true, symbol: 'none', data,
          lineStyle: { color: colors[i % colors.length], width: 2 },
        };
      })
      .filter(Boolean) as any[];
    return {
      grid: { top: 8, right: 16, bottom: 4, left: 44 },
      tooltip: { trigger: 'axis' },
      xAxis: { type: 'category', data: dates, axisLabel: { fontSize: 11, color: '#aeaeb2' } },
      yAxis: { type: 'value', splitLine: { lineStyle: { color: 'rgba(0,0,0,0.04)' } }, axisLabel: { fontSize: 11, color: '#aeaeb2' } },
      series: trendSeries,
    };
  }, [accounts, allWeekly, weekly, dates, accountId]);

  const currAccount = accounts.find((a) => a.id === accountId);

  // Today progress checklist items
  const progressItems = [
    { label: '签到', done: todayRow != null, current: null, max: null },
    { label: 'NPC', current: todayRow?.npc_fights ?? null, max: 10 },
    { label: '好友', current: todayRow?.friend_fights ?? null, max: 3 },
    { label: '爬塔', current: todayRow?.tower_floors ?? null, max: 6 },
    { label: 'BOSS', done: false, current: null, max: null },
    { label: '世界', done: false, current: null, max: null },
    { label: '婚内送花', done: false, current: null, max: 5 },
    { label: '广告', done: (todayRow?.stamina_ads || 0) + (todayRow?.community_ads || 0) > 0, current: null, max: null },
    { label: '挑战书', done: false, current: null, max: null },
    { label: '体力购买', done: false, current: null, max: null },
  ];

  if (loading && weekly.length === 0) {
    return <Spin size="large" style={{ display: 'block', margin: '120px auto' }} />;
  }

  if (!accountId) {
    return <Empty description="请选择一个角色" style={{ marginTop: 120 }} />;
  }

  return (
    <div>
      {/* ── 当前角色 ── */}
      <Card
        size="small"
        title={
          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 14 }}>
            当前角色：{currAccount?.name || accountId?.slice(0, 8)} Lv.{todayRow?.level || currAccount?.level || '-'} {todayRow?.class_name || currAccount?.class_name || ''}
          </span>
        }
        style={{ marginBottom: 24 }}
      >
        <Row gutter={[16, 16]}>
          <Col xs={12} sm={6}>
            <StatCell label="今日经验" value={todayExp} vs={vsYesterday(todayExp, yesterdayExp)} />
          </Col>
          <Col xs={12} sm={6}>
            <StatCell
              label="今日贡献"
              value={todayRow ? `${todayRow.gang_contribution}` : '-'}
              vs={vsYesterday(todayRow?.gang_contribution || 0, yesterdayRow?.gang_contribution)}
            />
          </Col>
          <Col xs={12} sm={6}>
            <StatCell
              label="今日偷菜"
              value={todayRow ? `${todayRow.steals}次` : '-'}
              vs={vsYesterday(todayRow?.steals || 0, yesterdayRow?.steals)}
            />
          </Col>
          <Col xs={12} sm={6}>
            <StatCell
              label="深渊票"
              value={todayRow ? `${todayRow.abyss_tickets}` : '-'}
              vs={vsYesterday(todayRow?.abyss_tickets || 0, yesterdayRow?.abyss_tickets)}
            />
          </Col>
        </Row>

        <div style={{ marginTop: 20 }}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8, fontFamily: 'var(--font-display)' }}>
            本周经验趋势（7天）
          </div>
          {weekly.length > 0 ? (
            <ReactECharts option={trendOption} style={{ height: 200 }} />
          ) : (
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>暂无数据</Typography.Text>
          )}
        </div>
      </Card>

      {/* ── 全部角色 · 本周 ── */}
      <Card
        size="small"
        title={<span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 14 }}>全部角色 · 本周</span>}
        style={{ marginBottom: 24 }}
      >
        <Row gutter={[16, 16]}>
          <Col xs={12} sm={6}>
            <StatCell label="总经验" value={summary?.total_exp ?? '-'} />
          </Col>
          <Col xs={12} sm={6}>
            <StatCell label="总贡献" value={summary?.total_contrib != null ? `${summary.total_contrib}` : '-'} />
          </Col>
          <Col xs={12} sm={6}>
            <StatCell label="总偷菜" value={summary?.total_steals != null ? `${summary.total_steals}次` : '-'} />
          </Col>
          <Col xs={12} sm={6}>
            <StatCell label="角色数" value={summary?.total_accounts ?? accounts.length} />
          </Col>
        </Row>

        <Row gutter={16} style={{ marginTop: 20 }}>
          <Col xs={24} md={12}>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8, fontFamily: 'var(--font-display)' }}>
              农场经验分布
            </div>
            <ReactECharts option={pieOption} style={{ height: 220 }} />
          </Col>
          <Col xs={24} md={12}>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8, fontFamily: 'var(--font-display)' }}>
              升级经验趋势
            </div>
            <ReactECharts option={multiLineOption} style={{ height: 220 }} />
          </Col>
        </Row>
      </Card>

      {/* ── 当前角色 · 今日进度 ── */}
      <Card
        size="small"
        title={<span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 14 }}>当前角色 · 今日进度</span>}
      >
        <Row gutter={[10, 10]}>
          {progressItems.map((item) => {
            const done = item.done != null ? item.done : (item.current != null && item.max != null && item.current >= item.max);
            let text: string;
            if (item.done != null) {
              text = done ? `${item.label} ✅` : item.label;
            } else if (item.current != null && item.max != null) {
              text = `${item.label} ${item.current}/${item.max}`;
            } else {
              text = `${item.label} -/-`;
            }
            return (
              <Col key={item.label} xs={12} sm={6} md={4}>
                <Tag style={{
                  fontSize: 12, padding: '4px 12px', borderRadius: 8,
                  background: done ? 'rgba(52,199,89,0.08)' : 'transparent',
                  border: done ? '1px solid rgba(52,199,89,0.2)' : '1px solid var(--border-subtle)',
                  color: done ? 'var(--green)' : 'var(--text-secondary)',
                }}>
                  {text}
                </Tag>
              </Col>
            );
          })}
        </Row>
      </Card>
    </div>
  );
}

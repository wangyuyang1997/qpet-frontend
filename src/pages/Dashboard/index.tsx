import { useEffect, useState, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Row, Col, Card, Tag, Spin, Typography, Empty } from 'antd';
import ReactECharts from 'echarts-for-react';
import { useAccount } from '../../store/useAccount';
import { dashboardApi, accountApi } from '../../api/client';

interface WeeklyRow {
  date: string; level: number; class_name: string; combat_power: number;
  npc_fights: number; steals: number; tower_floors: number; tower_max: number;
  harvests: number; plants: number; waters: number; digs: number;
  exp_battle: number; today_harvest_exp: number; current_exp: number; level_exp: number; level_exp_max: number;
  gang_contribution: number; gang_boss_fights: number; abyss_tickets: number;
  stamina_ads: number; community_ads: number; farm_ads: number;
  challenge_books: number; flowers_sent: number;
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
  const [isMarried, setIsMarried] = useState(false);

  // Redirect if no accountId in URL but selected in store
  useEffect(() => {
    if (!paramId && selectedAccountId) {
      navigate(`/overview/${selectedAccountId}`, { replace: true });
    }
  }, [paramId, selectedAccountId, navigate]);

  // Fetch all accounts weekly data + character in ONE call
  const fetchData = () => {
    if (!accountId) return;
    Promise.all([
      dashboardApi.weeklyAll(),
      accountApi.character(accountId).catch(() => ({ data: null })),
    ])
      .then(([allRes, charRes]: any[]) => {
        const dataByAccount = allRes.data?.data || {};
        setAllWeekly(dataByAccount);
        setSummary(allRes.data?.summary || null);
        // Current account
        const curData = dataByAccount[accountId] || [];
        setWeekly(curData);
        const charData = charRes.data?.data || charRes.data || {};
        setIsMarried((charData.marriage_hp_applied || 0) > 0 || (charData.bonus_marriage_hp || 0) > 0);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    setLoading(true);
    fetchData();
  }, [accountId]);

  // Poll every 60s for live updates (Redis-cached)
  useEffect(() => {
    const timer = setInterval(fetchData, 60000);
    return () => clearInterval(timer);
  }, [accountId]);

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

  // 统一颜色映射：按等级降序排列所有账号，同一账号在饼图和折线图中颜色一致
  const palette = [
    '#0071e3', '#ff9500', '#34c759', '#ff3b30', '#5ac8fa', '#af52de', '#ff2d55', '#5856d6',
    '#30b0c7', '#ff6b35', '#8b5cf6', '#10b981', '#f59e0b', '#ec4899', '#06b6d4',
  ];
  const accountColorMap = useMemo(() => {
    const sorted = [...accounts].sort((a, b) => {
      const la = (allWeekly[a.id] || []).slice(-1)[0]?.level ?? a.level;
      const lb = (allWeekly[b.id] || []).slice(-1)[0]?.level ?? b.level;
      return lb - la;
    });
    return new Map(sorted.map((a, i) => [a.id, palette[i % palette.length]]));
  }, [accounts, allWeekly]);

  // All accounts pie chart — 本周各角色经验占比
  const pieOption = useMemo(() => {
    const merged: Record<string, WeeklyRow[]> = { ...allWeekly };
    if (accountId && weekly.length > 0) merged[accountId] = weekly;
    const pieData = accounts.map((a) => ({
      name: a.name,
      value: (merged[a.id] || []).slice(-1)[0]?.current_exp || 0,
      itemStyle: { color: accountColorMap.get(a.id) },
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
  }, [accounts, allWeekly, weekly, accountId, accountColorMap]);

  // Multi-line chart for all accounts — 数据不受当前角色切换影响
  const multiLineOption = useMemo(() => {
    // Merge current account's weekly into allWeekly (same as pie chart)
    const merged: Record<string, WeeklyRow[]> = { ...allWeekly };
    if (accountId && weekly.length > 0) merged[accountId] = weekly;

    // 从全部账号收集唯一日期作为 x 轴
    const dateSet = new Set<string>();
    for (const recs of Object.values(merged)) {
      for (const r of (recs as WeeklyRow[])) {
        if (r.date) dateSet.add(r.date);
      }
    }
    const dates = [...dateSet].sort().map((d) => d.slice(5));

    // Build level map per account for date alignment
    const levelByDate: Record<string, Record<string, number>> = {};
    for (const [aid, recs] of Object.entries(merged)) {
      levelByDate[aid] = {};
      for (const r of (recs as WeeklyRow[])) {
        if (r.date) levelByDate[aid][r.date] = r.level ?? 0;
      }
    }

    // Build series: level progression, skip max-level (100), sort high→low
    const fullDates = [...dateSet].sort();
    const valid = accounts
      .filter((a) => {
        const levels = fullDates.map((d) => levelByDate[a.id]?.[d]).filter((v): v is number => v != null);
        if (levels.length === 0) return false;
        return !levels.every((v) => v === 0) && !levels.every((v) => v >= 100);
      })
      .sort((a, b) => {
        const la = (merged[a.id] || []).slice(-1)[0]?.level ?? a.level;
        const lb = (merged[b.id] || []).slice(-1)[0]?.level ?? b.level;
        return lb - la;
      });
    const trendSeries = valid.map((a) => {
        // Align level data to shared date axis — missing dates = null
        const data = fullDates.map((d) => levelByDate[a.id]?.[d] ?? null);
        const lv = (merged[a.id] || []).slice(-1)[0]?.level ?? a.level;
        const c = accountColorMap.get(a.id) || palette[0];
        return {
          name: `${a.name || a.id} Lv.${lv}`, type: 'line', smooth: true, symbol: 'none', data,
          connectNulls: false,
          itemStyle: { color: c }, lineStyle: { color: c, width: 2 },
        };
      }) as any[];
    return {
      grid: { top: 8, right: 16, bottom: 4, left: 44 },
      tooltip: { trigger: 'axis' },
      xAxis: { type: 'category', data: dates, axisLabel: { fontSize: 11, color: '#aeaeb2' } },
      yAxis: { type: 'value', splitLine: { lineStyle: { color: 'rgba(0,0,0,0.04)' } }, axisLabel: { fontSize: 11, color: '#aeaeb2' } },
      series: trendSeries,
    };
  }, [accounts, allWeekly, weekly, accountId]);

  const currAccount = accounts.find((a) => a.id === accountId);

  // Today progress checklist items
  const progressItems: any[] = [
    { label: '签到', done: todayRow != null },
    { label: '偷菜', current: todayRow?.steals ?? null, max: 50, suffix: '次' },
    { label: '翻地', current: todayRow?.digs ?? null, max: 50, suffix: '次' },
    { label: '体力广告', current: todayRow?.stamina_ads ?? null, max: 10, suffix: '次' },
    { label: '农场广告', current: todayRow?.farm_ads ?? null, max: 5, suffix: '次' },
    { label: '社区广告', current: todayRow?.community_ads ?? null, max: 5, suffix: '次' },
    { label: '帮派BOSS', current: todayRow?.gang_boss_fights ?? null, max: 15, suffix: '次' },
    isMarried
      ? { label: '婚内送花', current: todayRow?.flowers_sent ?? null, max: 5, suffix: '次' }
      : { label: '好友送花', current: null, max: 10, suffix: '次' },
    { label: '挑战书', current: todayRow?.challenge_books ?? null, max: 5, suffix: '次' },
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
              等级变化趋势
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
          {progressItems.map((item: any) => {
            const done = item.done != null ? item.done : (item.current != null && item.max != null && item.current >= item.max);
            let text: string;
            if (item.done != null) {
              text = done ? `${item.label} ✅` : item.label;
            } else if (item.current != null && item.max != null) {
              text = `${item.label} ${item.current}/${item.max}${item.suffix || ''}`;
            } else if (item.current != null) {
              text = `${item.label} ${item.current}${item.suffix || ''}`;
            } else {
              text = `${item.label} -/-`;
            }
            if (item.note) text += ` (${item.note})`;
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

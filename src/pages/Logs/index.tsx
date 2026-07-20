import { useEffect, useState } from 'react';
import { DatePicker, Typography } from 'antd';
import { dashboardApi } from '../../api/client';
import { useAccount } from '../../store/useAccount';
import dayjs from 'dayjs';

const LEVEL_STYLE: Record<string, { bg: string; color: string }> = {
  INFO: { bg: 'rgba(0,113,227,0.08)', color: '#0071e3' },
  WARN: { bg: 'rgba(255,149,0,0.08)', color: '#ff9500' },
  ERROR: { bg: 'rgba(255,59,48,0.08)', color: '#ff3b30' },
  DEBUG: { bg: 'rgba(0,0,0,0.04)', color: '#aeaeb2' },
};

function LogPanel({ title, icon, category, accountId, date, tick }: {
  title: string; icon: string; category: string; accountId: string | null; date: string; tick: number;
}) {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    dashboardApi.logs({ account: accountId || undefined, category, date, limit: 200 }).then((r) => {
      setLogs(r.data.logs || r.data.data || r.data || []);
      setLoading(false);
    });
  }, [accountId, date, category, tick]);

  const count = logs.length;

  return (
    <div style={{
      flex: 1, minWidth: 0, minHeight: 0,
      border: '1px solid var(--border-subtle)',
      borderRadius: 'var(--radius-lg)',
      background: 'var(--bg-card)',
      backdropFilter: 'var(--blur-glass)',
      WebkitBackdropFilter: 'var(--blur-glass)',
      boxShadow: 'var(--shadow-sm)',
      padding: '12px 16px',
      display: 'flex',
      flexDirection: 'column',
    }}>
      <Typography.Text strong style={{ fontSize: 13, color: 'var(--text-secondary)', display: 'block', marginBottom: 8, flexShrink: 0 }}>
        {icon} {title} {count}条
      </Typography.Text>
      <div style={{ flex: 1, overflow: 'hidden auto', fontSize: 12, minHeight: 0 }}>
        {loading ? (
          <Typography.Text style={{ color: 'var(--text-tertiary)' }}>加载中...</Typography.Text>
        ) : logs.length === 0 ? (
          <Typography.Text style={{ color: 'var(--text-tertiary)' }}>暂无日志</Typography.Text>
        ) : (
          logs.map((l, i) => {
            const s = LEVEL_STYLE[l.level] || LEVEL_STYLE.DEBUG;
            return (
              <div key={i} style={{ padding: '2px 0', fontFamily: 'var(--font-mono)', lineHeight: '18px' }}>
                <span style={{ color: 'var(--text-tertiary)', marginRight: 8 }}>
                  {l.created_at ? dayjs(l.created_at).format('HH:mm:ss') : '-'}
                </span>
                <span style={{
                  fontSize: 10, fontWeight: 600, padding: '0 4px', borderRadius: 100,
                  background: s.bg, color: s.color, marginRight: 6,
                }}>{l.level}</span>
                <span style={{ color: 'var(--text-primary)' }}>{l.message}</span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

export default function Logs() {
  const [date, setDate] = useState(dayjs().format('YYYY-MM-DD'));
  const [stats, setStats] = useState<any>({ today: 0, history: 0 });
  const [tick, setTick] = useState(0);
  const selectedAccountId = useAccount((s) => s.selectedAccountId);

  useEffect(() => {
    dashboardApi.stats().then((r) => setStats(r.data?.data || r.data));
  }, [tick]);

  // 每15秒轮询刷新
  useEffect(() => {
    const timer = setInterval(() => setTick((n) => n + 1), 15000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div style={{ height: 'calc(100vh - 172px)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 32 }}>
          <Typography.Text style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 700 }}>
            运行日志
          </Typography.Text>
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
      </div>

      <div style={{ marginBottom: 16, flexShrink: 0 }}>
        <DatePicker value={dayjs(date)} onChange={(d) => setDate(d?.format('YYYY-MM-DD') || dayjs().format('YYYY-MM-DD'))} />
      </div>

      {/* 上方：乐斗+农场 左右并排 */}
      <div style={{ display: 'flex', gap: 24, flex: 1, minHeight: 260, marginBottom: 20 }}>
        <LogPanel title="乐斗" icon="⚔" category="乐斗" accountId={selectedAccountId} date={date} tick={tick} />
        <LogPanel title="农场" icon="🌾" category="农场" accountId={selectedAccountId} date={date} tick={tick} />
      </div>

      {/* 下方：系统日志(左) + 宝箱记录(右) */}
      <div style={{ display: 'flex', gap: 24, minHeight: 180, maxHeight: 280, minWidth: 0 }}>
        <LogPanel title="系统" icon="⚙" category="系统" accountId={selectedAccountId} date={date} tick={tick} />
        <LogPanel title="宝箱" icon="📦" category="宝箱" accountId={selectedAccountId} date={date} tick={tick} />
      </div>
    </div>
  );
}

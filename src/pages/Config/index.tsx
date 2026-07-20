import { useEffect, useRef, useState } from 'react';
import { Switch, Spin, message, Typography, Select, Tag } from 'antd';
import {
  ThunderboltOutlined, ExperimentOutlined, TeamOutlined,
  HeartOutlined, ShopOutlined, ToolOutlined, GiftOutlined,
  BulbOutlined, RiseOutlined, AimOutlined,
  SyncOutlined, DollarOutlined, SendOutlined, ReloadOutlined,
  CrownOutlined, BellOutlined, ApiOutlined,
} from '@ant-design/icons';
import { configApi } from '../../api/client';
import { useAccount } from '../../store/useAccount';
import { cacheGet, cacheSet } from '../../store/useCache';
import { useParams, useNavigate } from 'react-router-dom';

// ── 美化文案映射 ──

const LABELS: Record<string, { name: string; desc: string; icon: React.ReactNode }> = {
  auto_npc_fight:      { name: 'NPC 乐斗',       desc: '自动挑战 NPC，获得战斗经验与掉落',       icon: <ThunderboltOutlined /> },
  auto_tower:          { name: '斗神塔',          desc: '自动爬塔，逐层推进',                       icon: <RiseOutlined /> },
  tower_use_revive:    { name: '塔内复活',        desc: '免费次数用完时消耗还魂丹继续挑战',          icon: <ReloadOutlined /> },
  auto_world_boss:     { name: '世界 BOSS',       desc: '自动挑战世界 BOSS',                        icon: <AimOutlined /> },
  auto_tournament:     { name: '武林 / 菜鸟大会', desc: 'Lv.100 自动报名两个赛事',                  icon: <CrownOutlined /> },
  exp_boost_enabled:   { name: '经验药水',        desc: '经验加成不足时自动从背包补充',              icon: <BulbOutlined /> },
  auto_ad_farm:        { name: '农场广告',        desc: '自动领取农场广告奖励 +20 EXP',             icon: <ExperimentOutlined /> },
  auto_gang_boss:      { name: '帮派 BOSS',       desc: '自动挑战帮派 BOSS，获得贡献',              icon: <TeamOutlined /> },
  auto_marriage_boss:  { name: '夫妻 BOSS',       desc: '与配偶组队挑战大色魔',                     icon: <HeartOutlined /> },
  auto_marriage_gift:  { name: '婚内送花',        desc: '每日向配偶赠送鲜花提升亲密度',              icon: <SendOutlined /> },
  auto_marriage_flowers:{ name: '好友送花',       desc: '向绑定对象送花，100 亲密度自动求婚',        icon: <HeartOutlined /> },
  auto_marriage_proposal:{ name: '自动求婚',      desc: '亲密度达标后自动发起 / 接受求婚',           icon: <HeartOutlined /> },
  auto_friend_sync:    { name: '好友同步',        desc: '托管账号之间自动互加好友',                  icon: <SyncOutlined /> },
  auto_shop_challenge_book:{ name: '帮派挑战书',  desc: '从商店自动购买帮派挑战书',                  icon: <ShopOutlined /> },
  auto_shop_stamina:   { name: '体力道具',        desc: '从商店自动购买体力面包 / 药水',             icon: <DollarOutlined /> },
  supply_beads:        { name: '魂珠补给',        desc: '魂珠不足时自动从背包开箱补充',              icon: <GiftOutlined /> },
  supply_challenge_book:{ name: '挑战书补给',     desc: '挑战书不足时从背包补充',                     icon: <GiftOutlined /> },
  supply_flowers:      { name: '鲜花补给',        desc: '鲜花不足时从背包补充',                       icon: <GiftOutlined /> },
  supply_revive:       { name: '还魂丹补给',      desc: '还魂丹不足时从背包补充',                     icon: <GiftOutlined /> },
  auto_checkin:        { name: '每日签到',        desc: '自动签到领取每日农场经验',                   icon: <BellOutlined /> },
  auto_ad_community:   { name: '社区广告',        desc: '自动领取社区广告奖励 +20 EXP',              icon: <ApiOutlined /> },
  auto_ad_stamina:     { name: '体力广告',        desc: '自动领取广告体力',                           icon: <ThunderboltOutlined /> },
  auto_class_upgrade:  { name: '职业技能',        desc: '自动分配职业天赋点数（默认关闭）',            icon: <ToolOutlined /> },
  auto_upgrade:        { name: '魂珠合成',        desc: '自动合成低等级魂珠',                         icon: <ToolOutlined /> },
  chest_budget:        { name: '宝箱预算',        desc: '每次自动开宝箱的经验消耗上限',              icon: <DollarOutlined /> },
};

// ── 分组 ──

interface Section {
  title: string;
  keys: string[];
}

const SECTIONS: Section[] = [
  {
    title: '乐斗',
    keys: ['auto_npc_fight', 'auto_tower', 'tower_use_revive', 'auto_world_boss', 'auto_tournament', 'exp_boost_enabled'],
  },
  {
    title: '农场',
    keys: ['auto_ad_farm', 'auto_checkin'],
  },
  {
    title: '帮派',
    keys: ['auto_gang_boss'],
  },
  {
    title: '婚姻',
    keys: ['auto_marriage_gift', 'auto_marriage_flowers', 'auto_marriage_proposal', 'auto_marriage_boss', 'auto_friend_sync'],
  },
  {
    title: '背包补给',
    keys: ['supply_beads', 'supply_challenge_book', 'supply_flowers', 'supply_revive'],
  },
  {
    title: '商城补给',
    keys: ['auto_shop_challenge_book', 'auto_shop_stamina'],
  },
  {
    title: '广告',
    keys: ['auto_ad_community', 'auto_ad_stamina'],
  },
  {
    title: '系统',
    keys: ['auto_class_upgrade', 'auto_upgrade', 'chest_budget'],
  },
];

// ── 样式 ──

const styles: Record<string, React.CSSProperties> = {
  page: {
    padding: '28px 0 48px',
    animation: 'fadeInUp 0.4s ease both',
  },
  header: {
    display: 'flex',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginBottom: 32,
  },
  title: {
    fontFamily: 'var(--font-display)',
    fontSize: 28,
    fontWeight: 700,
    letterSpacing: '-0.024em',
    color: 'var(--text-primary)',
  },
  subtitle: {
    fontSize: 14,
    color: 'var(--text-secondary)',
    fontFamily: 'var(--font-body)',
  },
  section: {
    marginBottom: 28,
  },
  sectionTitle: {
    fontFamily: 'var(--font-display)',
    fontSize: 13,
    fontWeight: 600,
    color: 'var(--text-secondary)',
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
    marginBottom: 10,
    paddingLeft: 4,
  },
  row: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '13px 16px',
    borderRadius: 'var(--radius-sm)',
    transition: 'background 0.15s ease',
    marginBottom: 2,
  },
  rowLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    flex: 1,
    minWidth: 0,
  },
  iconBox: {
    width: 32,
    height: 32,
    borderRadius: 'var(--radius-sm)',
    background: 'var(--accent-subtle)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 15,
    color: 'var(--accent)',
    flexShrink: 0,
  },
  rowText: {
    display: 'flex',
    flexDirection: 'column',
    gap: 1,
    minWidth: 0,
  },
  rowName: {
    fontSize: 14,
    fontWeight: 500,
    color: 'var(--text-primary)',
    fontFamily: 'var(--font-body)',
    letterSpacing: '-0.01em',
    lineHeight: 1.3,
  },
  rowDesc: {
    fontSize: 12,
    color: 'var(--text-tertiary)',
    lineHeight: 1.4,
  },
  control: {
    flexShrink: 0,
    marginLeft: 16,
  },
  badge: {
    fontSize: 11,
    fontWeight: 600,
    marginLeft: 6,
    padding: '0 6px',
    borderRadius: 100,
    background: 'rgba(0,113,227,0.08)',
    color: 'var(--accent)',
    lineHeight: '18px',
  },
  chipRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
};

export default function Config() {
  const { accountId } = useParams<{ accountId: string }>();
  const navigate = useNavigate();
  const selectedAccount = useAccount((s) => s.selectedAccountId);
  const accounts = useAccount((s) => s.accounts);
  const selected = accountId || selectedAccount;

  useEffect(() => {
    if (!accountId && selectedAccount) {
      navigate(`/config/${selectedAccount}`, { replace: true });
    }
  }, [accountId, selectedAccount]);

  const [configs, setConfigs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const firstLoadRef = useRef(true);

  useEffect(() => {
    if (!selected) return;
    const cacheKey = `config:${selected}`;
    const cached = cacheGet<any[]>(cacheKey);
    if (cached) {
      setConfigs(cached);
      if (!firstLoadRef.current) return; // 非首次不闪loading
    }
    if (firstLoadRef.current) setLoading(true);
    configApi.get(selected).then((r) => {
      const data = r.data.data || r.data || [];
      cacheSet(cacheKey, data);
      setConfigs(data);
    }).finally(() => {
      setLoading(false);
      firstLoadRef.current = false;
    });
  }, [selected]);

  const handleToggle = async (key: string, value: string) => {
    if (!selected) return;
    const nv = value === 'true' ? 'false' : 'true';
    await configApi.update({ account_id: selected, key, value: nv });
    setConfigs((prev) => {
      const next = prev.map((c) => (c.key === key ? { ...c, value: nv } : c));
      cacheSet(`config:${selected}`, next);
      return next;
    });
  };

  const handleSelect = async (key: string, value: string) => {
    if (!selected) return;
    await configApi.update({ account_id: selected, key, value });
    setConfigs((prev) => {
      const next = prev.map((c) => (c.key === key ? { ...c, value } : c));
      cacheSet(`config:${selected}`, next);
      return next;
    });
  };

  const cur = accounts.find((a: any) => a.id === selected);
  const configMap: Record<string, any> = {};
  for (const c of configs) configMap[c.key] = c;

  // Count enabled
  const enabledCount = configs.filter((c) => c.value === 'true').length;

  if (!selected) {
    return (
      <div style={styles.page}>
        <Typography.Text type="secondary" style={{ fontSize: 15 }}>请在顶部选择一个角色</Typography.Text>
      </div>
    );
  }

  if (loading) {
    return <Spin size="large" style={{ display: 'block', margin: '120px auto' }} />;
  }

  const renderControl = (c: any) => {
    if (c.key === 'chest_budget') {
      return (
        <Select
          size="small"
          value={c.value}
          style={{ width: 96 }}
          onChange={(v) => handleSelect(c.key, v)}
          options={[
            { value: 'free', label: '仅免费' },
            { value: '100', label: '≤ 100' },
            { value: '200', label: '≤ 200' },
            { value: '300', label: '≤ 300' },
          ]}
        />
      );
    }
    return <Switch size="small" checked={c.value === 'true'} onChange={() => handleToggle(c.key, c.value)} />;
  };

  return (
    <div style={styles.page}>
      {/* ── Header ── */}
      <div style={styles.header}>
        <div>
          <h1 style={{ ...styles.title, margin: 0 }}>自动化配置</h1>
          {cur && (
            <div style={{ ...styles.subtitle, marginTop: 4 }}>
              {cur.name} · Lv.{cur.level}
              <span style={{ marginLeft: 10, color: cur.running ? 'var(--green)' : 'var(--text-tertiary)' }}>
                {cur.running ? '● 运行中' : '○ 已停止'}
              </span>
            </div>
          )}
        </div>
        <Tag style={{
          borderRadius: 100,
          fontSize: 12,
          fontWeight: 500,
          padding: '2px 12px',
          background: 'var(--accent-subtle)',
          color: 'var(--accent)',
          border: 'none',
        }}>
          {enabledCount}/{configs.length} 项开启
        </Tag>
      </div>

      {/* ── Sections ── */}
      {SECTIONS.map((sec, si) => {
        const rows = sec.keys.map((k) => {
          const c = configMap[k];
          if (!c) return null;
          const lb = LABELS[k] || { name: k, desc: c.description || '', icon: null };
          return { key: k, config: c, ...lb };
        }).filter(Boolean) as any[];

        if (rows.length === 0) return null;

        return (
          <div key={sec.title} style={{ ...styles.section, animationDelay: `${0.08 * si}s` }}>
            <div style={styles.sectionTitle}>{sec.title}</div>
            {rows.map((row) => (
              <div
                key={row.key}
                style={styles.row}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.background = 'var(--accent-subtle)';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.background = 'transparent';
                }}
              >
                <div style={styles.rowLeft}>
                  <div style={styles.iconBox}>{row.icon}</div>
                  <div style={styles.rowText}>
                    <div style={styles.chipRow}>
                      <span style={styles.rowName}>{row.name}</span>
                    </div>
                    <span style={styles.rowDesc}>{row.desc}</span>
                  </div>
                </div>
                <div style={styles.control}>{renderControl(row.config)}</div>
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}

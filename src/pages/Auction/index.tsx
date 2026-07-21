import { useEffect, useState, useCallback } from 'react';
import { Card, Row, Col, Tag, Spin, Typography, Table, Input, Select, Switch, Empty, Tooltip, Button, message, Collapse, InputNumber } from 'antd';
import { SearchOutlined, LinkOutlined, CopyOutlined, CaretDownOutlined } from '@ant-design/icons';
import { accountApi } from '../../api/client';
import { useAccount } from '../../store/useAccount';
import { cacheGet, cacheSet } from '../../store/useCache';

function b64urlEncode(str: string) { return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); }

const SLOT_LABELS: Record<string, string> = {
  head: '头饰', armor: '护甲', bracer: '护腕', wrist: '护腕', belt: '腰带',
  boots: '鞋子', shoes: '鞋子', necklace: '项链', title: '称号',
};
const SLOT_ORDER = ['head', 'armor', 'bracer', 'belt', 'boots', 'necklace'];
const SLOT_ICONS: Record<string, string> = { head: '👑', armor: '🛡️', bracer: '⚔️', belt: '🎗️', boots: '👢', necklace: '💍' };

const QUALITY_COLOR: Record<string, string> = { '传说': 'orange', '神器': 'red', '稀有': 'purple', '良品': 'blue', '普通': 'default' };

function slotLabel(slot: string) { return SLOT_LABELS[slot] || slot; }

function statText(stats: any) {
  if (!stats) return '';
  const map: Record<string, string> = {
    '生命': 'HP', '攻击': '攻', '速度': '速', '暴击%': '暴击', '闪避%': '闪避', '格挡%': '格挡',
    '命中%': '命中', '连击%': '连击', '吸血%': '吸血', '减伤%': '减伤', '武器伤害%': '武伤',
    '技伤%': '技伤', '治疗%': '治疗', '力量': '力', '敏捷': '敏', '智力': '智', '体质': '体',
    'max_hp': 'HP', 'spd': '速', 'crit_pct': '暴击', 'dodge_pct': '闪', 'block_pct': '格挡',
    'leech_pct': '吸血', 'reduction_pct': '减伤', 'weapon_dmg_pct': '武伤', 'skill_dmg_pct': '技伤',
    'heal_pct': '治疗', 'agi': '敏', 'str': '力', 'int': '智', 'vit': '体',
  };
  return Object.entries(stats).map(([k, v]) => `${map[k] || k}+${v}`).join(' ');
}

function affixText(affixes: any[]) {
  if (!affixes?.length) return '';
  return affixes.map((a: any) => `+${a.value}${a.label || a.type}`).join(' ');
}

export default function Auction() {
  const { selectedAccountId: accountId } = useAccount() as any;
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [slotFilter, setSlotFilter] = useState('全部');
  const [sortKey, setSortKey] = useState('improve');
  const [equipOnly, setEquipOnly] = useState(true);
  const [armorFilter, setArmorFilter] = useState('');
  const [classFilter, setClassFilter] = useState('');
  const [minLevel, setMinLevel] = useState<number | null>(null);
  const [maxLevel, setMaxLevel] = useState<number | null>(null);
  const [recExpanded, setRecExpanded] = useState(true);

  const buildUrl = (equip: boolean) => {
    if (!accountId) return '';
    const p = new URLSearchParams({ accountId, type: equip ? 'equipment' : 'all' });
    if (minLevel) p.set('minLevel', String(minLevel));
    if (maxLevel) p.set('maxLevel', String(maxLevel));
    if (armorFilter) p.set('armorType', armorFilter);
    if (classFilter) p.set('classRequired', classFilter);
    return `/api/auction/snapshots?${p.toString()}`;
  };

  const fetchData = (equip: boolean) => {
    if (!accountId) return;
    const ck = `auction-v3:${accountId}`;
    const cached = cacheGet<any>(ck);
    if (cached) { setData(cached); setLoading(false); }

    const token = localStorage.getItem('token') || '';
    Promise.all([
      fetch(buildUrl(equip), { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()).catch(() => ({ data: null })),
      accountApi.character(accountId),
    ])
      .then(([aRes, cRes]: any[]) => {
        const d = aRes?.data || {};
        const charData = cRes?.data?.data || cRes?.data || {};
        const merged = { ...d, character: { ...charData, current_equipment: d?.current_equipment || {} } };
        cacheSet(ck, merged);
        setData(merged);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchData(equipOnly); }, [accountId, equipOnly, minLevel, maxLevel, armorFilter, classFilter]);

  const handleCopyScript = useCallback(async () => {
    try {
      const token = localStorage.getItem('token') || '';
      const resp = await fetch('/api/tampermonkey/script', { headers: { Authorization: `Bearer ${token}` } });
      await navigator.clipboard.writeText(await resp.text());
      message.success('油猴脚本已复制到剪贴板');
    } catch { message.error('复制失败'); }
  }, []);

  const handleGameSearch = useCallback(async (item: any) => {
    try {
      const ssoRes = await accountApi.ssoData(accountId);
      const d = (ssoRes as any)?.data;
      if (!d?.success) { message.error('SSO失败'); return; }
      const payload = b64urlEncode(JSON.stringify({ t: d.data.token, k: d.data.jwk }));
      window.open(`https://www.duanwuqiufenmao.top/#sso=${payload}&q=${encodeURIComponent(item.name || '')}&ql=${encodeURIComponent(item.quality || '')}&lv=${item.item_level || ''}`, '_blank');
    } catch { message.error('获取SSO信息失败'); }
  }, [accountId]);

  if (loading && !data) return <Spin size="large" style={{ display: 'block', margin: '120px auto' }} />;
  if (!data) return <Typography.Text type="secondary">暂无数据</Typography.Text>;

  const { items = [], recommended = {}, metadata = {}, filters = {}, character = {}, char_class = '' } = data;
  const equipped = character.current_equipment || {};
  const className = character.className || char_class || '';

  // filter items
  let filtered = items.filter((item: any) => {
    if (search && !item.name?.includes(search) && !item.seller_name?.includes(search)) return false;
    const slot = item.equip_slot || item.slot || '';
    if (slotFilter !== '全部' && slot !== slotFilter) return false;
    return true;
  });

  filtered = [...filtered].sort((a: any, b: any) => {
    if (sortKey === 'price') return (a.price || 0) - (b.price || 0);
    if (sortKey === 'score') return (b.score || 0) - (a.score || 0);
    return (b.improvement ?? 0) - (a.improvement ?? 0);
  });

  // recommendation count
  const totalRecs = Object.values(recommended).reduce((sum: number, arr: any) => sum + (arr?.length || 0), 0);

  const slotOptions = [{ value: '全部', label: '全部' }, ...SLOT_ORDER.map(s => ({ value: s, label: slotLabel(s) }))];
  const armorOptions = [{ value: '', label: '全部护甲' }, ...(filters.armor_types || []).map((a: string) => ({ value: a, label: a }))];
  const classOptions = [{ value: '', label: '全部职业' }, ...(filters.class_names || []).map((c: string) => ({ value: c, label: c }))];

  const columns = [
    { title: '名称', dataIndex: 'name', key: 'name', width: 170,
      render: (v: string, r: any) => (
        <span>{(r.enhance_level || 0) > 0 && <Tag style={{ fontSize: 10, marginRight: 4, lineHeight: '16px' }}>+{r.enhance_level}</Tag>}{v}</span>
      ) },
    { title: '品质', dataIndex: 'quality', key: 'quality', width: 60,
      render: (v: string) => v ? <Tag color={QUALITY_COLOR[v] || 'default'} style={{ fontSize: 10, margin: 0 }}>{v}</Tag> : '-' },
    { title: 'Lv', dataIndex: 'item_level', key: 'lv', width: 45, render: (v: number) => v || '-' },
    { title: '套装', dataIndex: 'set_info', key: 'set', width: 80,
      render: (v: string) => v ? <Tag color="gold" style={{ fontSize: 10, margin: 0 }}>{v}</Tag> : '-' },
    { title: '护甲', dataIndex: 'armor_type', key: 'armor', width: 55,
      render: (v: string) => v || <span style={{ color: 'var(--text-tertiary)' }}>-</span> },
    { title: '职业', dataIndex: 'class_required', key: 'cls', width: 60,
      render: (v: string) => v ? <Tag style={{ fontSize: 10, margin: 0 }}>{v}</Tag> : <span style={{ color: 'var(--text-tertiary)' }}>-</span> },
    { title: '属性/词缀', dataIndex: 'base_stats', key: 'stat', width: 140, ellipsis: true,
      render: (_: any, r: any) => {
        const s = statText(r.base_stats) || '';
        const a = affixText(r.affixes) || '';
        const txt = [s, a].filter(Boolean).join(' | ');
        return txt ? <Tooltip title={txt}><Typography.Text style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{txt}</Typography.Text></Tooltip> : <span style={{ color: 'var(--text-tertiary)' }}>-</span>;
      } },
    { title: '价格', dataIndex: 'price', key: 'price', width: 80, render: (v: number) => v ? v.toLocaleString() : '-' },
    { title: '评分', dataIndex: 'score', key: 'score', width: 60, render: (v: number) => v || '-' },
    { title: '卖家', dataIndex: 'seller_name', key: 'seller', width: 90,
      render: (v: string) => <Typography.Text style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>{v || '-'}</Typography.Text> },
    { title: '', dataIndex: '_act', key: 'act', width: 70,
      render: (_: any, r: any) => (r.equip_slot || r.slot) ? (
        <Button type="link" size="small" icon={<LinkOutlined />} onClick={() => handleGameSearch(r)} style={{ fontSize: 11, padding: 0 }}>搜索</Button>
      ) : null },
  ];

  return (
    <div>
      {/* --- header --- */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <Typography.Text style={{ fontSize: 24, fontWeight: 700, fontFamily: 'var(--font-display)', letterSpacing: '-0.04em' }}>
          拍卖行
          <Tooltip title="复制油猴脚本，粘贴到 Tampermonkey 新建脚本中使用">
            <Button type="link" size="small" icon={<CopyOutlined />} onClick={handleCopyScript} style={{ marginLeft: 12, fontSize: 11 }}>安装脚本</Button>
          </Tooltip>
        </Typography.Text>
        <Typography.Text style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
          最近快照: {metadata.snapshot_at ? new Date(metadata.snapshot_at).toLocaleString('zh-CN') : '暂无'}
          {' · '}{equipOnly ? `装备 ${metadata.filtered || 0} 件` : `共 ${metadata.filtered || 0} 件`}
        </Typography.Text>
      </div>

      {/* --- 推荐区：按槽位可折叠 --- */}
      {totalRecs > 0 && (
        <div style={{ marginBottom: 20 }}>
          <div
            onClick={() => setRecExpanded(!recExpanded)}
            style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: recExpanded ? 12 : 0, cursor: 'pointer', userSelect: 'none' }}
          >
            <CaretDownOutlined style={{ fontSize: 11, color: 'var(--text-tertiary)', transition: 'transform 0.2s', transform: recExpanded ? 'none' : 'rotate(-90deg)' }} />
            <Typography.Text style={{ fontSize: 15, fontWeight: 600, fontFamily: 'var(--font-display)', letterSpacing: '-0.02em' }}>
              推荐升级
            </Typography.Text>
            <Typography.Text style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
              {totalRecs} 件 · {Object.values(recommended).filter((a: any) => a?.length).length} 个部位
            </Typography.Text>
            {className && <Typography.Text style={{ fontSize: 11, color: 'var(--text-secondary)', marginLeft: 'auto' }}>当前角色: {className}</Typography.Text>}
          </div>

          {recExpanded && (
            <Row gutter={[12, 12]}>
              {SLOT_ORDER.map(slot => {
                const recs = (recommended[slot] || []).filter((r: any) => r.improvement > 0);
                if (!recs.length) return null;
                const curEquip = equipped[slot];
                return (
                  <Col span={8} key={slot}>
                    <div style={{
                      background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)',
                      padding: '12px 14px', height: '100%',
                      boxShadow: 'var(--shadow-sm)', border: '1px solid var(--border-subtle)',
                    }}>
                      {/* slot header */}
                      <div style={{ marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontSize: 13 }}>{SLOT_ICONS[slot] || ''}</span>
                        <Typography.Text strong style={{ fontSize: 13, fontFamily: 'var(--font-display)', letterSpacing: '-0.02em' }}>
                          {slotLabel(slot)}
                        </Typography.Text>
                        {curEquip && (
                          <Typography.Text style={{ fontSize: 11, color: 'var(--text-tertiary)', marginLeft: 'auto' }}>
                            {curEquip.name?.slice(0, 6) || '-'} Lv.{curEquip.item_level || '?'}
                          </Typography.Text>
                        )}
                      </div>

                      {/* rec items */}
                      {recs.map((item: any, i: number) => (
                        <div key={i} style={{
                          padding: '6px 8px', borderRadius: 'var(--radius-sm)',
                          background: i === 0 ? 'var(--accent-subtle)' : 'transparent',
                          marginBottom: i < recs.length - 1 ? 4 : 0,
                          transition: 'background 0.15s',
                        }}>
                          <Row align="middle" gutter={4} wrap={false}>
                            {/* name + enhance */}
                            <Col flex="auto" style={{ minWidth: 0 }}>
                              <Typography.Text style={{ fontSize: 12, fontFamily: 'var(--font-display)' }} ellipsis>
                                {(item.enhance_level || 0) > 0 && <span style={{ color: 'var(--accent)', fontWeight: 600, marginRight: 3 }}>+{item.enhance_level}</span>}
                                {item.name}
                              </Typography.Text>
                            </Col>
                            {/* quality */}
                            <Col>{item.quality ? <Tag color={QUALITY_COLOR[item.quality] || 'default'} style={{ fontSize: 10, margin: 0, lineHeight: '16px', padding: '0 4px' }}>{item.quality}</Tag> : null}</Col>
                            {/* level */}
                            <Col><Typography.Text style={{ fontSize: 11, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>Lv.{item.item_level}</Typography.Text></Col>
                            {/* improvement */}
                            <Col><Tag color="success" style={{ fontSize: 10, margin: 0, fontWeight: 600 }}>↑{item.improvement}%</Tag></Col>
                            {/* price */}
                            <Col><Typography.Text style={{ fontSize: 12, fontWeight: 600, fontFamily: 'var(--font-mono)', color: 'var(--accent)', whiteSpace: 'nowrap' }}>{(item.price || 0).toLocaleString()}</Typography.Text></Col>
                            {/* search */}
                            <Col>
                              <Button type="link" size="small" icon={<LinkOutlined />} onClick={() => handleGameSearch(item)} style={{ fontSize: 10, padding: 0, color: 'var(--text-tertiary)' }} />
                            </Col>
                          </Row>
                          {(i === 0 && item.set_info || item.class_required || item.armor_type) && (
                            <div style={{ marginTop: 2, display: 'flex', gap: 3, flexWrap: 'wrap' }}>
                              {item.set_info && <Tag color="gold" style={{ fontSize: 9, margin: 0, lineHeight: '14px', padding: '0 3px' }}>{item.set_info}</Tag>}
                              {item.class_required && <Tag style={{ fontSize: 9, margin: 0, lineHeight: '14px', padding: '0 3px', color: '#0891b2', background: 'rgba(8,145,178,0.06)', border: '1px solid rgba(8,145,178,0.15)' }}>{item.class_required}</Tag>}
                              {item.armor_type && <Tag style={{ fontSize: 9, margin: 0, lineHeight: '14px', padding: '0 3px', color: 'var(--text-secondary)', background: 'var(--bg-glass)', border: '1px solid var(--border-subtle)' }}>{item.armor_type}</Tag>}
                              {item.armor_match && <Tag color="blue" style={{ fontSize: 9, margin: 0, lineHeight: '14px', padding: '0 3px' }}>匹配</Tag>}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </Col>
                );
              })}
            </Row>
          )}
        </div>
      )}

      {/* --- 筛选区 --- */}
      <div style={{ marginBottom: 16, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <Input prefix={<SearchOutlined />} placeholder="搜索名称/卖家..." value={search}
          onChange={e => setSearch(e.target.value)} style={{ width: 200 }} allowClear />
        <Select value={slotFilter} onChange={setSlotFilter} style={{ width: 90 }} options={slotOptions} />
        <Select value={armorFilter} onChange={setArmorFilter} style={{ width: 100 }} options={armorOptions}
          placeholder="护甲" allowClear onClear={() => setArmorFilter('')} />
        <Select value={classFilter} onChange={setClassFilter} style={{ width: 100 }} options={classOptions}
          placeholder="职业" allowClear onClear={() => setClassFilter('')} />
        <InputNumber placeholder="Lv≥" min={1} max={100} value={minLevel} onChange={v => setMinLevel(v)}
          style={{ width: 64 }} size="small" />
        <InputNumber placeholder="Lv≤" min={1} max={100} value={maxLevel} onChange={v => setMaxLevel(v)}
          style={{ width: 64 }} size="small" />
        <Select value={sortKey} onChange={setSortKey} style={{ width: 100 }} options={[
          { value: 'improve', label: '提升 ↓' }, { value: 'score', label: '评分 ↓' }, { value: 'price', label: '价格 ↑' },
        ]} />
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 4 }}>
          <Switch size="small" checked={equipOnly} onChange={v => { setEquipOnly(v); setLoading(true); }} />
          <Typography.Text style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
            仅装备 ({metadata.equipment_count || 0})
          </Typography.Text>
        </div>
      </div>

      {/* --- 拍卖表 --- */}
      <Card size="small" title={`全部拍卖${slotFilter !== '全部' ? ` · ${slotLabel(slotFilter)}` : ''}`}>
        {filtered.length === 0 ? <Empty description="暂无数据" /> : (
          <Table rowKey={(r: any) => `${r.id}-${r.item_id}`} dataSource={filtered} columns={columns}
            pagination={{ pageSize: 50, size: 'small', showTotal: (t: number) => `共 ${t} 件` }}
            size="small" scroll={{ x: 900 }} />
        )}
      </Card>
    </div>
  );
}

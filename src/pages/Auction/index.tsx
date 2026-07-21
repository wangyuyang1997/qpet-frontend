import { useEffect, useState, useCallback } from 'react';
import { Card, Row, Col, Tag, Spin, Typography, Table, Input, Select, Switch, Empty, Tooltip, Button, message } from 'antd';
import { SearchOutlined, LinkOutlined, CopyOutlined } from '@ant-design/icons';
import { accountApi } from '../../api/client';
import { useAccount } from '../../store/useAccount';
import { cacheGet, cacheSet } from '../../store/useCache';

function b64urlEncode(str: string) {
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

const SLOT_LABELS: Record<string, string> = {
  head: '头饰', armor: '护甲', bracer: '护腕', wrist: '护腕', belt: '腰带',
  boots: '鞋子', shoes: '鞋子', necklace: '项链', title: '称号',
};
const SLOT_KEYS = ['head', 'armor', 'bracer', 'belt', 'boots', 'necklace', 'title'];
const ITEM_TYPE_LABELS: Record<string, string> = {
  equipment: '装备', consumable: '消耗品', bead: '魂珠', chest: '宝箱',
  weapon_book: '武器书', material: '材料',
};
const QUALITY_COLOR: Record<string, string> = { '传说': 'orange', '神器': 'red', '稀有': 'purple', '良品': 'blue', '普通': 'default' };

function slotLabel(slot: string) { return SLOT_LABELS[slot] || slot; }
function typeLabel(type: string) { return ITEM_TYPE_LABELS[type] || type || '物品'; }
function affixText(affixes: any[]) {
  if (!affixes?.length) return '';
  return affixes.map((a: any) => `+${a.value}${a.label || a.type}`).join(' ');
}
function statText(stats: any) {
  if (!stats) return '';
  const map: Record<string, string> = {
    '生命': 'HP', '攻击': '攻', '速度': '速', '暴击%': '暴击', '闪避%': '闪避', '格挡%': '格挡',
    '命中%': '命中', '连击%': '连击', '吸血%': '吸血', '减伤%': '减伤',
    '武器伤害%': '武伤', '技伤%': '技伤', '治疗%': '治疗',
    '力量': '力', '敏捷': '敏', '智力': '智', '体质': '体',
    // fallback English
    'max_hp': 'HP', 'min_atk': '攻', 'max_atk': '攻', 'spd': '速',
    'crit_pct': '暴击', 'dodge_pct': '闪', 'block_pct': '格挡',
    'hit_pct': '命中', 'combo_pct': '连击', 'leech_pct': '吸血',
    'reduction_pct': '减伤', 'weapon_dmg_pct': '武伤', 'skill_dmg_pct': '技伤',
    'heal_pct': '治疗', 'agi': '敏', 'str': '力', 'int': '智', 'vit': '体',
  };
  return Object.entries(stats).map(([k, v]) => `${map[k] || k}+${v}`).join(' ');
}

export default function Auction() {
  const { selectedAccountId: accountId } = useAccount() as any;
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('全部');
  const [sortKey, setSortKey] = useState('improve');
  const [equipOnly, setEquipOnly] = useState(true);

  const fetchData = (equip: boolean) => {
    if (!accountId) return;
    const ck = `auction-v2-${equip ? 'eq' : 'all'}:${accountId}`;
    const cached = cacheGet<any>(ck);
    if (cached) { setData(cached); setLoading(false); }
    const token = localStorage.getItem('token') || '';
    const apiType = equip ? 'equipment' : 'all';
    Promise.all([
      fetch(`/api/auction/snapshots?accountId=${accountId}&type=${apiType}`, {
        headers: { Authorization: `Bearer ${token}` },
      }).then(r => r.json()).catch(() => ({ data: null })),
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

  useEffect(() => { fetchData(equipOnly); }, [accountId, equipOnly]);

  const handleCopyScript = useCallback(async () => {
    try {
      const token = localStorage.getItem('token') || '';
      const resp = await fetch('/api/tampermonkey/script', { headers: { Authorization: `Bearer ${token}` } });
      const text = await resp.text();
      await navigator.clipboard.writeText(text);
      message.success('油猴脚本已复制到剪贴板，粘贴到 Tampermonkey 新脚本即可');
    } catch { message.error('复制失败'); }
  }, []);

  const handleGameSearch = useCallback(async (item: any) => {
    try {
      const ssoRes = await accountApi.ssoData(accountId);
      const d = (ssoRes as any)?.data;
      if (!d?.success) { message.error('SSO失败: ' + d?.message); return; }
      const payload = b64urlEncode(JSON.stringify({ t: d.data.token, k: d.data.jwk }));
      const name = encodeURIComponent(item.name || '');
      const quality = encodeURIComponent(item.quality || '');
      const level = item.item_level || '';
      window.open(`https://www.duanwuqiufenmao.top/#sso=${payload}&q=${name}&ql=${quality}&lv=${level}`, '_blank');
    } catch { message.error('获取SSO信息失败'); }
  }, [accountId]);

  if (loading && !data) return <Spin size="large" style={{ display: 'block', margin: '120px auto' }} />;
  if (!data) return <Typography.Text type="secondary">暂无数据</Typography.Text>;

  const { items = [], recommended = [], metadata = {}, character = {}, char_class = '' } = data;
  const equipped = character.current_equipment || {};
  const className = character.className || char_class || '';

  let filtered = items.filter((item: any) => {
    if (search && !item.name?.includes(search) && !item.seller_name?.includes(search)) return false;
    const slot = item.equip_slot || item.slot || '';
    if (typeFilter !== '全部' && slot !== typeFilter) return false;
    return true;
  });

  filtered = [...filtered].sort((a: any, b: any) => {
    if (sortKey === 'price') return (a.price || 0) - (b.price || 0);
    if (sortKey === 'score') return (b.score || 0) - (a.score || 0);
    return (b.improvement ?? 0) - (a.improvement ?? 0);
  });

  const topRec = recommended[0];
  let insight = '';
  if (topRec) {
    insight = `${slotLabel(topRec.equip_slot || topRec.slot)} ${topRec.name} 评分提升 ${topRec.improvement || 0}%`;
    if (topRec.set_match) insight += '，同套装冲突需注意';
    else if (topRec.armor_match) insight += '，护甲类型匹配';
  }

  const slotOptions = [{ value: '全部', label: '全部' }, ...SLOT_KEYS.map(s => ({ value: s, label: slotLabel(s) }))];

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
    { title: '价格', dataIndex: 'price', key: 'price', width: 80,
      render: (v: number) => v ? v.toLocaleString() : '-' },
    { title: '评分', dataIndex: 'score', key: 'score', width: 60, render: (v: number) => v || '-' },
    { title: '卖家', dataIndex: 'seller_name', key: 'seller', width: 90,
      render: (v: string) => <Typography.Text style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>{v || '-'}</Typography.Text> },
    { title: '', dataIndex: '_act', key: 'act', width: 80,
      render: (_: any, r: any) => (r.equip_slot || r.slot) ? (
        <Tooltip title="单点登录游戏并搜索此装备">
          <Button type="link" size="small" icon={<LinkOutlined />}
            onClick={() => handleGameSearch(r)} style={{ fontSize: 11, padding: 0 }}>搜索</Button>
        </Tooltip>
      ) : null },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <Typography.Text style={{ fontSize: 24, fontWeight: 700, fontFamily: 'var(--font-display)', letterSpacing: '-0.04em' }}>
          拍卖行
          <Tooltip title="复制油猴脚本，粘贴到 Tampermonkey 新建脚本中使用">
            <Button type="link" size="small" icon={<CopyOutlined />} onClick={handleCopyScript}
              style={{ marginLeft: 12, fontSize: 11 }}>安装脚本</Button>
          </Tooltip>
        </Typography.Text>
        <Typography.Text style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
          最近快照: {metadata.snapshot_at ? new Date(metadata.snapshot_at).toLocaleString('zh-CN') : '暂无'}
          {' · '}{equipOnly ? `装备 ${metadata.filtered || 0} 件` : `共 ${metadata.filtered || 0} 件`}
        </Typography.Text>
      </div>

      <div style={{ marginBottom: 16, display: 'flex', gap: 8, alignItems: 'center' }}>
        <Input prefix={<SearchOutlined />} placeholder="搜索名称/卖家..." value={search}
          onChange={e => setSearch(e.target.value)} style={{ width: 220 }} allowClear />
        <Select value={typeFilter} onChange={setTypeFilter} style={{ width: 100 }} options={slotOptions} />
        <Select value={sortKey} onChange={setSortKey} style={{ width: 110 }} options={[
          { value: 'improve', label: '提升 ↓' }, { value: 'score', label: '评分 ↓' }, { value: 'price', label: '价格 ↑' },
        ]} />
        <div style={{ marginLeft: 8, display: 'flex', alignItems: 'center', gap: 4 }}>
          <Switch size="small" checked={equipOnly} onChange={v => { setEquipOnly(v); setLoading(true); }} />
          <Typography.Text style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
            仅装备 {metadata.equipment_count ? `(${metadata.equipment_count})` : ''}
          </Typography.Text>
        </div>
      </div>

      {recommended.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 12 }}>
            <Typography.Text style={{ fontSize: 15, fontWeight: 600, fontFamily: 'var(--font-display)', letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>
              推荐升级
            </Typography.Text>
            {className && <Typography.Text style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 400 }}>
              适合 {className}
            </Typography.Text>}
            {insight && <Typography.Text style={{ fontSize: 11, color: 'var(--text-tertiary)', fontWeight: 400, marginLeft: 'auto' }}>
              {insight}
            </Typography.Text>}
          </div>
          <Row gutter={12}>
            {recommended.map((item: any, i: number) => {
              const slot = slotLabel(item.equip_slot || item.slot);
              const currentEquip = equipped[item.equip_slot || item.slot];
              const statSummary = statText(item.base_stats) || '';
              const affixSummary = affixText(item.affixes) || '';
              const detail = [statSummary, affixSummary].filter(Boolean).join(' · ');
              return (
                <Col span={8} key={i}>
                  <div style={{
                    background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)',
                    padding: '16px 18px', height: '100%',
                    boxShadow: 'var(--shadow-sm)', border: '1px solid var(--border-subtle)',
                    transition: 'box-shadow 0.2s ease, transform 0.15s ease',
                    cursor: 'pointer', position: 'relative', overflow: 'hidden',
                  }}
                    onMouseEnter={e => { e.currentTarget.style.boxShadow = 'var(--shadow-md)'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
                    onMouseLeave={e => { e.currentTarget.style.boxShadow = 'var(--shadow-sm)'; e.currentTarget.style.transform = 'none'; }}
                  >
                    {/* 排名角标 */}
                    <div style={{
                      position: 'absolute', top: -1, right: 12,
                      fontSize: 10, fontWeight: 600, fontFamily: 'var(--font-display)',
                      color: i === 0 ? '#fa8c16' : i === 1 ? '#aaa' : '#cd7f32',
                      letterSpacing: '-0.02em',
                    }}>TOP {i + 1}</div>

                    {/* 名称 + 等级 + 品质 */}
                    <div style={{ marginBottom: 10 }}>
                      <Typography.Text strong style={{
                        fontSize: 14, fontFamily: 'var(--font-display)', letterSpacing: '-0.02em',
                        display: 'block', marginBottom: 4,
                      }}>
                        {(item.enhance_level || 0) > 0 && <span style={{ color: 'var(--accent)', fontWeight: 600, marginRight: 4 }}>+{item.enhance_level}</span>}
                        {item.name}
                      </Typography.Text>
                      <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                        {item.quality && <Tag color={QUALITY_COLOR[item.quality] || 'default'} style={{ fontSize: 10, margin: 0, lineHeight: '18px' }}>{item.quality}</Tag>}
                        <Typography.Text style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{slot} · Lv.{item.item_level || '?'}</Typography.Text>
                      </div>
                    </div>

                    {/* 套装 / 护甲 / 职业 */}
                    <div style={{ display: 'flex', gap: 4, marginBottom: 10, flexWrap: 'wrap' }}>
                      {item.set_info && <Tag color="gold" style={{ fontSize: 10, margin: 0 }}>{item.set_info}</Tag>}
                      {item.armor_type && <Tag style={{ fontSize: 10, margin: 0, color: 'var(--text-secondary)', background: 'var(--bg-glass)', border: '1px solid var(--border-subtle)' }}>{item.armor_type}</Tag>}
                      {item.class_required && <Tag style={{ fontSize: 10, margin: 0, color: '#0891b2', background: 'rgba(8,145,178,0.06)', border: '1px solid rgba(8,145,178,0.15)' }}>{item.class_required}</Tag>}
                      {item.armor_match && <Tag color="blue" style={{ fontSize: 10, margin: 0 }}>护甲匹配</Tag>}
                      {item.set_match && <Tag color="gold" style={{ fontSize: 10, margin: 0 }}>同套装</Tag>}
                    </div>

                    {/* 属性/词缀 */}
                    {detail && (
                      <Typography.Paragraph ellipsis={{ rows: 2 }} style={{
                        fontSize: 11, color: 'var(--text-secondary)', marginBottom: 10,
                        fontFamily: 'var(--font-mono)', lineHeight: '18px',
                      }}>
                        {detail}
                      </Typography.Paragraph>
                    )}

                    {/* 分数对比 + 提升 */}
                    <div style={{
                      display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 10,
                      background: 'var(--bg-glass)', borderRadius: 'var(--radius-sm)',
                      padding: '8px 10px',
                    }}>
                      <div>
                        <div style={{ fontSize: 10, color: 'var(--text-tertiary)', marginBottom: 1 }}>当前</div>
                        <Typography.Text style={{ fontSize: 15, fontWeight: 600, fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>
                          {(currentEquip ? currentEquip.score : 0) || '-'}
                        </Typography.Text>
                      </div>
                      <div style={{ color: '#52c41a', fontSize: 13, fontWeight: 500 }}>→</div>
                      <div>
                        <div style={{ fontSize: 10, color: 'var(--text-tertiary)', marginBottom: 1 }}>升级</div>
                        <Typography.Text style={{ fontSize: 15, fontWeight: 600, fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>
                          {item.score || '-'}
                        </Typography.Text>
                      </div>
                      <Tag color="success" style={{ fontSize: 11, marginLeft: 'auto', fontWeight: 600 }}>
                        ↑{item.improvement}%
                      </Tag>
                    </div>

                    {/* 价格 + 操作 */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Typography.Text strong style={{ fontSize: 16, fontFamily: 'var(--font-mono)', color: 'var(--accent)' }}>
                        {(item.price || 0).toLocaleString()}
                      </Typography.Text>
                      <Tooltip title="单点登录游戏并搜索此装备">
                        <Button type="link" size="small" icon={<LinkOutlined />}
                          onClick={() => handleGameSearch(item)}
                          style={{ fontSize: 11, padding: '0 4px', color: 'var(--text-tertiary)' }}>搜索</Button>
                      </Tooltip>
                    </div>
                  </div>
                </Col>
              );
            })}
          </Row>
        </div>
      )}

      <Card size="small" title={`全部拍卖${typeFilter !== '全部' ? ` · ${slotLabel(typeFilter)}` : ''}`}>
        {filtered.length === 0 ? <Empty description="暂无数据" /> : (
          <Table rowKey={(r: any) => `${r.id}-${r.item_id}`} dataSource={filtered} columns={columns}
            pagination={{ pageSize: 50, size: 'small', showTotal: (t: number) => `共 ${t} 件` }}
            size="small" scroll={{ x: 900 }} />
        )}
      </Card>
    </div>
  );
}

import { useEffect, useState, useCallback } from 'react';
import { Card, Row, Col, Tag, Spin, Typography, Table, Input, Select, Switch, Empty, Tooltip, Button, message } from 'antd';
import { SearchOutlined, StarFilled, LinkOutlined, CopyOutlined } from '@ant-design/icons';
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
        <Card size="small" title={
          <span>推荐{className ? ` — 适合${className}` : ''}
            {insight && <Typography.Text style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 400, marginLeft: 8 }}>{insight}</Typography.Text>}
          </span>
        } style={{ marginBottom: 16, borderLeft: '3px solid #fa8c16' }}>
          {recommended.map((item: any, i: number) => {
            const stars = 3 - i;
            const slot = slotLabel(item.equip_slot || item.slot);
            const currentEquip = equipped[item.equip_slot || item.slot];
            return (
              <div key={i} style={{ padding: '8px 0', borderBottom: i < recommended.length - 1 ? '1px solid var(--border-subtle)' : 'none' }}>
                <Row align="middle" gutter={4}>
                  <Col flex="40px"><span style={{ color: '#fa8c16' }}>{Array.from({ length: stars }, (_, j) => <StarFilled key={j} style={{ fontSize: 10 }} />)}</span></Col>
                  <Col flex="160px">
                    <Typography.Text strong style={{ fontSize: 14 }}>{item.name}</Typography.Text>
                    {(item.enhance_level || 0) > 0 && <Tag style={{ marginLeft: 4, fontSize: 10, lineHeight: '16px' }}>+{item.enhance_level}</Tag>}
                  </Col>
                  <Col flex="80px">{item.quality ? <Tag color={QUALITY_COLOR[item.quality] || 'default'} style={{ fontSize: 10, margin: 0 }}>{item.quality}</Tag> : null}</Col>
                  <Col flex="70px"><Typography.Text style={{ fontSize: 12 }}>{slot} Lv.{item.item_level || '-'}</Typography.Text></Col>
                  <Col flex="140px">
                    {item.set_info && <Tag color="gold" style={{ fontSize: 10, margin: 0 }}>{item.set_info}</Tag>}
                    {item.armor_type && <Tag style={{ fontSize: 10, margin: '0 0 0 4px' }}>{item.armor_type}</Tag>}
                    {item.class_required && <Tag color="cyan" style={{ fontSize: 10, margin: '0 0 0 4px' }}>{item.class_required}</Tag>}
                  </Col>
                  <Col flex="80px"><Typography.Text style={{ fontSize: 12 }}>{item.score || '-'}</Typography.Text></Col>
                  <Col flex="120px">
                    <Typography.Text style={{ fontSize: 12, color: 'var(--text-secondary)' }}>当前 {currentEquip ? (currentEquip.score || '-') : '-'}</Typography.Text>
                  </Col>
                  <Col flex="70px"><Tag color="success" style={{ fontSize: 12 }}>↑{item.improvement}%</Tag></Col>
                  <Col flex="80px"><Typography.Text strong style={{ fontSize: 14, color: 'var(--accent)' }}>{(item.price || 0).toLocaleString()}</Typography.Text></Col>
                  <Col flex="80px">
                    {item.armor_match && <Tag color="blue" style={{ fontSize: 10 }}>护甲匹配</Tag>}
                    {item.set_match && <Tag color="gold" style={{ fontSize: 10 }}>同套装</Tag>}
                  </Col>
                  <Col flex="90px">
                    <Tooltip title="通过油猴脚本单点登录游戏，自动搜索此装备">
                      <Button type="primary" size="small" ghost icon={<LinkOutlined />}
                        onClick={() => handleGameSearch(item)}
                        style={{ fontSize: 11 }}>游戏搜索</Button>
                    </Tooltip>
                  </Col>
                </Row>
              </div>
            );
          })}
        </Card>
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

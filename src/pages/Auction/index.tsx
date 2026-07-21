import { useEffect, useState } from 'react';
import { Card, Row, Col, Tag, Spin, Typography, Table, Input, Select, Empty } from 'antd';
import { SearchOutlined, StarFilled } from '@ant-design/icons';
import { accountApi } from '../../api/client';
import { useAccount } from '../../store/useAccount';
import { cacheGet, cacheSet } from '../../store/useCache';

const SLOT_LABELS: Record<string, string> = {
  head: '头饰', armor: '护甲', bracer: '护腕', wrist: '护腕', belt: '腰带',
  boots: '鞋子', shoes: '鞋子', necklace: '项链', title: '称号',
};
const SLOT_KEYS = ['head', 'armor', 'bracer', 'belt', 'boots', 'necklace', 'title'];

function slotLabel(slot: string) { return SLOT_LABELS[slot] || slot; }

export default function Auction() {
  const { selectedAccountId: accountId } = useAccount() as any;
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('全部');
  const [sortKey, setSortKey] = useState('improve');

  useEffect(() => {
    if (!accountId) return;
    // 先显缓存
    const ck = `auction:${accountId}`;
    const cached = cacheGet<any>(ck);
    if (cached) { setData(cached); setLoading(false); }

    const token = localStorage.getItem('token') || '';
    Promise.all([
      fetch(`/api/auction/snapshots?accountId=${accountId}`, {
        headers: { Authorization: `Bearer ${token}` },
      }).then(r => r.json()).catch(() => ({ data: null })),
      accountApi.character(accountId),
    ])
      .then(([aRes, cRes]: any[]) => {
        const d = aRes?.data || {};
        const charData = cRes?.data?.data || cRes?.data || {};
        const merged = {
          ...d,
          character: { ...charData, current_equipment: d?.current_equipment || {} },
        };
        cacheSet(ck, merged);
        setData(merged);
      })
      .finally(() => setLoading(false));
  }, [accountId]);

  if (loading && !data) return <Spin size="large" style={{ display: 'block', margin: '120px auto' }} />;
  if (!data) return <Typography.Text type="secondary">暂无数据</Typography.Text>;

  const { items = [], recommended = [], metadata = {}, character = {}, char_class = '' } = data;
  const equipped = character.current_equipment || {};
  const className = character.className || char_class || '';

  // Filter & sort
  let filtered = items.filter((item: any) => {
    if (search && !item.name?.includes(search) && !item.seller_name?.includes(search)) return false;
    const slot = item.equip_slot || item.slot || '';
    if (typeFilter !== '全部' && slot !== typeFilter) return false;
    return true;
  });

  filtered = [...filtered].sort((a: any, b: any) => {
    if (sortKey === 'price') return (a.price || 0) - (b.price || 0);
    if (sortKey === 'score') return (b.score || 0) - (a.score || 0);
    // improve: sort by improvement desc
    const impA = a.improvement ?? 0;
    const impB = b.improvement ?? 0;
    return impB - impA;
  });

  // Filter: equipment only for improvement sort
  const equipItems = filtered.filter((i: any) => (i.equip_slot || i.slot));

  // Recommendation insight
  const topRec = recommended[0];
  let insight = '';
  if (topRec) {
    const name = topRec.name || '';
    const slot = slotLabel(topRec.equip_slot || topRec.slot);
    const imp = topRec.improvement || 0;
    insight = `${slot} ${name} 评分提升 ${imp}%`;
    if (topRec.set_match) insight += '，同套装冲突需注意';
    else if (topRec.armor_match) insight += '，护甲类型匹配';
  }

  const slotOptions = [
    { value: '全部', label: '全部' },
    ...SLOT_KEYS.map(s => ({ value: s, label: slotLabel(s) })),
  ];

  const columns = [
    { title: '名称', dataIndex: 'name', key: 'name', width: 180, render: (v: string, r: any) => (
      <span>{(r.enhance_level || 0) > 0 && <Tag style={{ fontSize: 10, marginRight: 4 }}>+{r.enhance_level}</Tag>}{v}</span>
    ) },
    { title: '类型', dataIndex: 'slot', key: 'slot', width: 60,
      render: (_: any, r: any) => slotLabel(r.equip_slot || r.slot) || '物品' },
    { title: '价格', dataIndex: 'price', key: 'price', width: 80,
      render: (v: number) => v ? v.toLocaleString() : '-' },
    { title: '评分', dataIndex: 'score', key: 'score', width: 80, render: (v: number) => v || '-' },
    { title: '卖家', dataIndex: 'seller_name', key: 'seller', width: 100, render: (v: string) => (
      <Typography.Text style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>{v || '-'}</Typography.Text>
    ) },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <Typography.Text style={{ fontSize: 24, fontWeight: 700, fontFamily: 'var(--font-display)', letterSpacing: '-0.04em' }}>
          拍卖行
        </Typography.Text>
        <Typography.Text style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
          最近快照: {metadata.snapshot_at ? new Date(metadata.snapshot_at).toLocaleString('zh-CN') : '暂无'} · {metadata.total || 0} 件
        </Typography.Text>
      </div>

      {/* Search + filter bar */}
      <div style={{ marginBottom: 16, display: 'flex', gap: 8 }}>
        <Input prefix={<SearchOutlined />} placeholder="搜索名称/卖家..." value={search}
          onChange={e => setSearch(e.target.value)} style={{ width: 220 }} allowClear />
        <Select value={typeFilter} onChange={setTypeFilter} style={{ width: 100 }} options={slotOptions} />
        <Select value={sortKey} onChange={setSortKey} style={{ width: 110 }} options={[
          { value: 'improve', label: '提升 ↓' },
          { value: 'score', label: '评分 ↓' },
          { value: 'price', label: '价格 ↑' },
        ]} />
      </div>

      {/* Recommended — 对齐 design spec 3.14 */}
      {recommended.length > 0 && (
        <Card
          size="small"
          title={
            <span>推荐{className ? ` — 适合${className}` : ''} · {insight && <Typography.Text style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 400 }}>{insight}</Typography.Text>}</span>
          }
          style={{ marginBottom: 16, borderLeft: '3px solid #fa8c16' }}
        >
          {recommended.map((item: any, i: number) => {
            const stars = 3 - i;
            const slot = slotLabel(item.equip_slot || item.slot);
            const currentEquip = equipped[item.equip_slot || item.slot];
            return (
              <div key={i} style={{ padding: '8px 0', borderBottom: i < recommended.length - 1 ? '1px solid var(--border-subtle)' : 'none' }}>
                <Row align="middle">
                  <Col span={1}>
                    <span style={{ color: '#fa8c16' }}>{Array.from({ length: stars }, (_, j) => <StarFilled key={j} style={{ fontSize: 10 }} />)}</span>
                  </Col>
                  <Col span={5}>
                    <Typography.Text strong style={{ fontSize: 14 }}>{item.name}</Typography.Text>
                    {(item.enhance_level || 0) > 0 && <Tag style={{ marginLeft: 4, fontSize: 10 }}>+{item.enhance_level}</Tag>}
                  </Col>
                  <Col span={3}><Typography.Text style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{slot}</Typography.Text></Col>
                  <Col span={3}><Typography.Text style={{ fontSize: 12 }}>{item.score || '-'}</Typography.Text></Col>
                  <Col span={3}>
                    <Typography.Text style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                      当前 {currentEquip ? (currentEquip.score || '-') : '-'}
                    </Typography.Text>
                  </Col>
                  <Col span={3}>
                    <Tag color="success" style={{ fontSize: 12 }}>↑{item.improvement}%</Tag>
                  </Col>
                  <Col span={3}>
                    <Typography.Text strong style={{ fontSize: 14, color: 'var(--accent)' }}>
                      {(item.price || 0).toLocaleString()}
                    </Typography.Text>
                  </Col>
                  <Col span={3}>
                    {item.armor_match && <Tag color="blue" style={{ fontSize: 10 }}>护甲匹配</Tag>}
                    {item.set_match && <Tag color="gold" style={{ fontSize: 10 }}>同套装</Tag>}
                  </Col>
                </Row>
              </div>
            );
          })}
        </Card>
      )}

      {/* Full auction list */}
      <Card size="small" title={`全部拍卖${typeFilter !== '全部' ? ` · ${SLOT_LABELS[typeFilter] || typeFilter}` : ''}`}>
        {filtered.length === 0 ? <Empty description="暂无数据" /> : (
          <Table
            rowKey={(r: any) => `${r.id}-${r.item_id}`}
            dataSource={filtered}
            columns={columns}
            pagination={{ pageSize: 50, size: 'small', showTotal: (t: number) => `共 ${t} 件` }}
            size="small"
          />
        )}
      </Card>
    </div>
  );
}

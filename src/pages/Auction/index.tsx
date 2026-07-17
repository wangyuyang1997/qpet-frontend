import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Card, Row, Col, Tag, Spin, Typography, Table, Input, Select, Space, Empty, Statistic } from 'antd';
import { SearchOutlined, StarFilled } from '@ant-design/icons';
import { accountApi } from '../../api/client';

export default function Auction() {
  const { accountId } = useParams<{ accountId: string }>();
  const [snapshots, setSnapshots] = useState<any[]>([]);
  const [char, setChar] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('全部');
  const [sortKey, setSortKey] = useState('score');

  useEffect(() => {
    if (!accountId) return;
    const token = localStorage.getItem('token') || '';
    Promise.all([
      fetch('/api/auction/snapshots?accountId=' + accountId, { headers: { Authorization: `Bearer ${token}` } })
        .then(r => r.json()).catch(() => ({ data: [] })),
      accountApi.character(accountId),
      accountApi.equipment(accountId).catch(() => ({ data: null })),
    ])
      .then(([aRes, cRes, eRes]: any[]) => {
        setSnapshots(aRes.data?.items || aRes.data || []);
        const charData = cRes.data?.data || cRes.data || {};
        const eqData = eRes?.data?.data || eRes?.data || {};
        setChar({ ...charData, equipment_data: eqData });
      })
      .finally(() => setLoading(false));
  }, [accountId]);

  if (loading) return <Spin size="large" style={{ display: 'block', margin: '120px auto' }} />;
  if (!char) return <Typography.Text type="secondary">暂无数据</Typography.Text>;

  const filtered = snapshots.filter((item: any) => {
    if (search && !item.name?.includes(search) && !item.seller_name?.includes(search)) return false;
    if (typeFilter !== '全部' && item.slot !== typeFilter && item.type !== typeFilter) return false;
    return true;
  });

  filtered.sort((a: any, b: any) => {
    if (sortKey === 'price') return (a.price || 0) - (b.price || 0);
    if (sortKey === 'score') return (b.score || 0) - (a.score || 0);
    return 0;
  });

  // Current equipment for recommendation — from equipment API
  const eqData = char.equipment_data || {};
  const equipped = eqData.equipped || {};
  const currentScores: Record<string, number> = {};
  for (const [slot, item] of Object.entries(equipped) as [string, any][]) {
    currentScores[slot] = item?.item_level || 0;
  }

  const recommended = filtered
    .filter((item: any) => currentScores[item.slot] && (item.score || 0) > currentScores[item.slot] * 1.05)
    .sort((a: any, b: any) => {
      const impA = currentScores[a.slot] ? (a.score || 0) / currentScores[a.slot] : 0;
      const impB = currentScores[b.slot] ? (b.score || 0) / currentScores[b.slot] : 0;
      return impB - impA;
    })
    .slice(0, 3);

  const columns = [
    { title: '名称', dataIndex: 'name', key: 'name', width: 180, render: (v: string, r: any) => (
      <span>{r.enhance_level > 0 && <Tag style={{ fontSize: 10, marginRight: 4 }}>+{r.enhance_level}</Tag>}{v}</span>
    )},
    { title: '类型', dataIndex: 'slot', key: 'slot', width: 60, render: (v: string) => v || '物品' },
    { title: '价格', dataIndex: 'price', key: 'price', width: 80, sorter: (a: any, b: any) => (a.price || 0) - (b.price || 0),
      render: (v: number) => v ? v.toLocaleString() : '-' },
    { title: '评分', dataIndex: 'score', key: 'score', width: 80, render: (v: number) => v || '-' },
    { title: '职业', dataIndex: 'class_required', key: 'cr', width: 80, render: (v: string) => v && <Tag style={{ fontSize: 10 }}>{v}</Tag> || '-' },
    { title: '卖家', dataIndex: 'seller_name', key: 'seller', width: 100, render: (v: string) => (
      <Typography.Text style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>{v || '-'}</Typography.Text>
    )},
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <Typography.Text style={{ fontSize: 24, fontWeight: 700, fontFamily: 'var(--font-display)', letterSpacing: '-0.04em' }}>
          拍卖行
        </Typography.Text>
        <Typography.Text style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
          最近快照: {snapshots.length > 0 ? `${snapshots.length}件` : '暂无'}
        </Typography.Text>
      </div>

      {/* Search and filter bar */}
      <div style={{ marginBottom: 16, display: 'flex', gap: 8 }}>
        <Input prefix={<SearchOutlined />} placeholder="搜索..." value={search}
          onChange={e => setSearch(e.target.value)} style={{ width: 200 }} allowClear />
        <Select value={typeFilter} onChange={setTypeFilter} style={{ width: 120 }} options={[
          { value: '全部', label: '全部' },
          { value: 'head', label: '头饰' }, { value: 'armor', label: '护甲' },
          { value: 'wrist', label: '护腕' }, { value: 'belt', label: '腰带' },
          { value: 'shoes', label: '鞋子' }, { value: 'necklace', label: '项链' },
        ]} />
        <Select value={sortKey} onChange={setSortKey} style={{ width: 100 }} options={[
          { value: 'score', label: '评分 ↓' }, { value: 'price', label: '价格 ↑' },
        ]} />
      </div>

      {/* Recommended */}
      {recommended.length > 0 && (
        <Card size="small" title={`推荐 — 适合${char.class_name || '当前角色'} · 评分提升>5%`}
          style={{ marginBottom: 16, borderLeft: '3px solid #fa8c16' }}>
          {recommended.map((item: any, i: number) => {
            const improvement = currentScores[item.slot] ? (((item.score || 0) - currentScores[item.slot]) / currentScores[item.slot] * 100).toFixed(0) : '?';
            const stars = i === 0 ? 3 : i === 1 ? 2 : 1;
            return (
              <div key={i} style={{ padding: '8px 0', borderBottom: i < recommended.length - 1 ? '1px solid var(--border-subtle)' : 'none' }}>
                <Row align="middle">
                  <Col span={1}>
                    <span style={{ color: '#fa8c16' }}>{Array(stars).fill(null).map((_, j) => <StarFilled key={j} style={{ fontSize: 10 }} />)}</span>
                  </Col>
                  <Col span={5}>
                    <Typography.Text strong style={{ fontSize: 14 }}>{item.name}</Typography.Text>
                    {item.enhance_level > 0 && <Tag style={{ marginLeft: 4, fontSize: 10 }}>+{item.enhance_level}</Tag>}
                  </Col>
                  <Col span={3}><Typography.Text style={{ fontSize: 12 }}>{item.slot || '-'}</Typography.Text></Col>
                  <Col span={3}><Typography.Text style={{ fontSize: 12 }}>{item.score || '-'}</Typography.Text></Col>
                  <Col span={3}>
                    <Typography.Text style={{ fontSize: 12, color: 'var(--text-secondary)' }}>当前 {currentScores[item.slot] || '-'}</Typography.Text>
                  </Col>
                  <Col span={3}>
                    <Tag color="success" style={{ fontSize: 12 }}>↑{improvement}%</Tag>
                  </Col>
                  <Col span={3}>
                    <Typography.Text strong style={{ fontSize: 14, color: 'var(--accent)' }}>{(item.price || 0).toLocaleString()}</Typography.Text>
                  </Col>
                  <Col span={3}>
                    {item.class_required && <Tag style={{ fontSize: 10 }}>{item.class_required}</Tag>}
                  </Col>
                </Row>
              </div>
            );
          })}
        </Card>
      )}

      {/* Full auction list */}
      <Card size="small" title="全部拍卖">
        {filtered.length === 0 ? <Empty description="暂无数据" /> : (
          <Table rowKey="id" dataSource={filtered} columns={columns} pagination={{ pageSize: 50, size: 'small' }} size="small" />
        )}
      </Card>
    </div>
  );
}

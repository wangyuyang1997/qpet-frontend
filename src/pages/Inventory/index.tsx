import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Card, Row, Col, Tag, Typography, Statistic, Table, Empty, Spin, Tabs } from 'antd';
import { accountApi, dashboardApi } from '../../api/client';

const TYPE_LABEL: Record<string, { label: string; color: string }> = {
  bead:       { label: '魂珠',   color: '#722ed1' },
  consumable: { label: '消耗品', color: '#1677ff' },
  material:   { label: '材料',   color: '#52c41a' },
  zodiac_core:{ label: '宝箱',   color: '#fa8c16' },
  chest:      { label: '宝箱',   color: '#fa8c16' },
  skill_book: { label: '技能书', color: '#eb2f96' },
  weapon_book:{ label: '武器书', color: '#eb2f96' },
};

export default function Inventory() {
  const { accountId } = useParams<{ accountId: string }>();
  const [items, setItems] = useState<any[]>([]);
  const [today, setToday] = useState<any>({});
  const [char, setChar] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [activeType, setActiveType] = useState<string>('all');

  useEffect(() => {
    if (!accountId) return;
    Promise.all([
      accountApi.inventoryProgress(accountId).catch(() => ({ data: null })),
      dashboardApi.weekly(accountId).catch(() => ({ data: { data: [] } })),
      accountApi.character(accountId).catch(() => ({ data: null })),
    ])
      .then(([iRes, wRes, cRes]: any[]) => {
        const invData = iRes?.data?.data || iRes?.data || {};
        setItems(invData.items || []);
        const rows = (wRes?.data?.data || []) as any[];
        const todayRow = rows.find((r: any) => r.date === new Date().toISOString().slice(0, 10)) || {};
        setToday(todayRow);
        setChar(cRes?.data?.data || cRes?.data || {});
      })
      .finally(() => setLoading(false));
  }, [accountId]);

  if (loading) return <Spin size="large" style={{ display: 'block', margin: '120px auto' }} />;

  // 从背包汇总消耗品
  const expPotions = items.filter((i: any) => i.item_type === 'consumable' && String(i.game_item_id||'').includes('exp')).reduce((s: number, i: any) => s + i.quantity, 0);
  const staminaPotions = items.filter((i: any) => i.item_type === 'consumable' && String(i.game_item_id||'').includes('stamina')).reduce((s: number, i: any) => s + i.quantity, 0);

  // 按类型分组
  const typeSet = [...new Set(items.map((i: any) => i.item_type as string))].filter(Boolean);
  const filtered = activeType === 'all' ? items : items.filter((i: any) => i.item_type === activeType);

  const tabItems = [
    { key: 'all', label: `全部 ${items.length}` },
    ...typeSet.map(t => {
      const info = TYPE_LABEL[t] || { label: t, color: '#999' };
      const count = items.filter((i: any) => i.item_type === t).length;
      return { key: t, label: `${info.label} ${count}` };
    }),
  ];

  return (
    <div>
      <Typography.Text style={{ fontSize: 28, fontWeight: 700, fontFamily: 'var(--font-display)', letterSpacing: '-0.04em', display: 'block', marginBottom: 20 }}>
        背包
      </Typography.Text>

      {/* 仓库资源 */}
      <Card size="small" style={{ marginBottom: 16 }}>
        <Row gutter={[16, 16]}>
          <Col span={4}><Statistic title="仓库挑战书" value={today.gang_challenge_books ?? '-'} suffix="本" /></Col>
          <Col span={4}><Statistic title="仓库还魂丹" value={today.tower_revive ?? '-'} suffix="颗" /></Col>
          <Col span={4}><Statistic title="仓库鲜花" value={today.flowers_remaining ?? '-'} suffix="朵" /></Col>
          <Col span={4}><Statistic title="经验药水" value={expPotions.toLocaleString()} suffix="瓶" /></Col>
          <Col span={4}><Statistic title="体力药水" value={staminaPotions.toLocaleString()} suffix="瓶" /></Col>
          <Col span={4}>
            {char.exp_boost_charges > 0 ? (
              <Statistic title="经验buff" value={`×${char.exp_boost_rate || 1}`} suffix={`${char.exp_boost_charges}次`} />
            ) : (
              <Statistic title="经验buff" value="无" />
            )}
          </Col>
        </Row>
      </Card>

      {/* 道具列表 */}
      <Card size="small" title="道具">
        <Tabs activeKey={activeType} onChange={setActiveType} items={tabItems} style={{ marginBottom: 8 }} />
        {filtered.length === 0 ? <Empty description="暂无道具" /> : (
          <Table
            rowKey={(r: any) => r.id}
            dataSource={filtered}
            pagination={false}
            size="small"
            columns={[
              {
                title: '名称', dataIndex: 'item_name', key: 'name', width: 220,
                render: (v: string) => <Typography.Text strong>{v}</Typography.Text>,
              },
              {
                title: '类型', dataIndex: 'item_type', key: 'type', width: 80,
                render: (v: string) => {
                  const info = TYPE_LABEL[v] || { label: v, color: '#999' };
                  return <Tag color={info.color}>{info.label}</Tag>;
                },
              },
              {
                title: '数量', dataIndex: 'quantity', key: 'qty', width: 60, align: 'right',
                render: (v: number) => <Tag>×{v}</Tag>,
              },
              { title: 'ID', dataIndex: 'game_item_id', key: 'id', width: 220, render: (v: string) => <Typography.Text type="secondary" style={{ fontSize: 11 }}>{v}</Typography.Text> },
            ]}
          />
        )}
      </Card>
    </div>
  );
}

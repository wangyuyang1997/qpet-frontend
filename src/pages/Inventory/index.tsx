import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Card, Row, Col, Tag, Spin, Typography, Statistic, Table, Empty } from 'antd';
import { accountApi } from '../../api/client';

export default function Inventory() {
  const { accountId } = useParams<{ accountId: string }>();
  const [char, setChar] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!accountId) return;
    accountApi.character(accountId)
      .then((res: any) => setChar(res.data))
      .finally(() => setLoading(false));
  }, [accountId]);

  if (loading) return <Spin size="large" style={{ display: 'block', margin: '120px auto' }} />;
  if (!char) return <Typography.Text type="secondary">暂无数据</Typography.Text>;

  const inv = char.inventory || [];

  const supplies = [
    { key: 'revive', name: '还魂丹', count: char.revive_count ?? char.pve_stats?.revive_count ?? 0, switchKey: 'supply_revive' },
    { key: 'challenge_book', name: '帮派挑战书', count: char.challenge_book_count ?? 0, switchKey: 'supply_challenge_book' },
    { key: 'flowers', name: '鲜花', count: char.flower_count ?? 0, switchKey: 'supply_flowers' },
    { key: 'beads', name: '魂珠', count: char.bead_count ?? 0, switchKey: 'supply_beads' },
  ];

  return (
    <div>
      <Typography.Text style={{ fontSize: 28, fontWeight: 700, fontFamily: 'var(--font-display)', letterSpacing: '-0.04em', display: 'block', marginBottom: 20 }}>
        背包 & 补给
      </Typography.Text>

      {/* Item list */}
      <Card size="small" title="道具列表" style={{ marginBottom: 16 }}>
        {inv.length === 0 ? <Empty description="暂无道具" /> : (
          <Table
            rowKey={(r: any) => r.itemId || r.id || r.name}
            dataSource={inv} pagination={false} size="small"
            columns={[
              { title: '名称', dataIndex: 'name', key: 'name' },
              { title: '数量', dataIndex: 'quantity', key: 'qty', width: 80, render: (v: number) => <Tag>{v}</Tag> },
              { title: '类型', dataIndex: 'type', key: 'type', width: 100, render: (v: string, r: any) => <Tag color="blue">{v || r.itemType || 'consumable'}</Tag> },
            ]}
          />
        )}
      </Card>

      {/* Supply status */}
      <Card size="small" title="补给状态">
        <Row gutter={[16, 16]}>
          {supplies.map(s => (
            <Col key={s.key} span={6}>
              <Statistic title={s.name} value={s.count} valueStyle={{ fontSize: 20 }} />
              <div style={{ fontSize: 10, color: 'var(--text-tertiary)', marginTop: 2 }}>
                开关: {s.switchKey}
              </div>
            </Col>
          ))}
        </Row>
        {char.exp_boost_charges !== undefined && (
          <div style={{ marginTop: 16 }}>
            <Tag color="orange" style={{ fontSize: 13, padding: '4px 12px' }}>
              经验 BUFF: ×{char.exp_boost_rate || 1.5} · 剩余 {char.exp_boost_charges} 次
            </Tag>
          </div>
        )}
        <div style={{ marginTop: 12, fontSize: 12, color: 'var(--text-tertiary)' }}>
          补给开关在「自动化」页面统一管理
        </div>
      </Card>
    </div>
  );
}

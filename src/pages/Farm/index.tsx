import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Card, Row, Col, Tag, Spin, Typography, Statistic, Progress, Space, Collapse, Empty } from 'antd';
import { ExperimentOutlined, BankOutlined } from '@ant-design/icons';
import { accountApi } from '../../api/client';

const STATE_MAP: Record<string, { label: string; color: string }> = {
  growing: { label: '生长中', color: '#1677ff' },
  mature: { label: '已成熟', color: '#52c41a' },
  withered: { label: '已枯萎', color: '#ff4d4f' },
  empty: { label: '空地', color: '#999' },
};

const QUALITY_GROUPS = ['legend', 'rare', 'fine', 'normal'] as const;
const QUALITY_LABEL: Record<string, string> = { legend: '传说', rare: '稀有', fine: '良品', normal: '普通' };
const QUALITY_COLOR: Record<string, string> = { legend: '#fa8c16', rare: '#722ed1', fine: '#1677ff', normal: '#999' };

export default function Farm() {
  const { accountId } = useParams<{ accountId: string }>();
  const [farm, setFarm] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!accountId) return;
    accountApi.farm(accountId)
      .then((res: any) => setFarm(res.data))
      .finally(() => setLoading(false));
  }, [accountId]);

  if (loading) return <Spin size="large" style={{ display: 'block', margin: '120px auto' }} />;
  if (!farm) return <Typography.Text type="secondary">暂无农场数据</Typography.Text>;

  const locked = farm.unlocked_slots || 0;
  const total = Math.max(locked, farm.slots?.length || 0);
  const slots = farm.slots || [];
  const collection = farm.collection || [];
  const grouped = QUALITY_GROUPS.map(q => ({
    quality: q,
    label: QUALITY_LABEL[q],
    color: QUALITY_COLOR[q],
    items: collection.filter((c: any) => c.quality === q),
  }));

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <Typography.Text style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 700 }}>
          农场
        </Typography.Text>
        <Space>
          <Link to={`/museum/${accountId}`}><BankOutlined /> 博物馆</Link>
        </Space>
      </div>

      {/* 操作栏 — 纯展示 */}
      <Card size="small" style={{ marginBottom: 16 }}>
        <Space wrap>
          {[
            { key: 'explore-all', label: '一键翻地' },
            { key: 'harvest-all', label: '一键收菜' },
            { key: 'plant-all', label: '一键种菜' },
            { key: 'double-exp-all', label: '一键双倍' },
            { key: 'protect-all', label: '一键保护' },
            { key: 'accelerate-all', label: '一键加速' },
          ].map(btn => (
            <Tag key={btn.key} style={{ fontSize: 13, padding: '4px 12px', borderRadius: 8, cursor: 'default' }}>
              {btn.label}
            </Tag>
          ))}
        </Space>
      </Card>

      {/* 地块网格 */}
      <Card size="small" title={`地块 共 ${locked}/${total} 格解锁`} style={{ marginBottom: 16 }}>
        <Row gutter={[12, 12]}>
          {slots.map((slot: any) => {
            const stateInfo = STATE_MAP[slot.state] || STATE_MAP.empty;
            const isVip = slot.slotIndex === farm.vip_slot_index;
            const land = slot.land;
            return (
              <Col key={slot.slotIndex} xs={24} sm={8} md={6} lg={6} xl={6}>
                <Card
                  size="small"
                  style={{
                    borderTop: isVip ? '2px solid #fa8c16' : undefined,
                    opacity: slot.state === 'empty' ? 0.5 : 1,
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <Typography.Text strong style={{ fontSize: 14 }}>
                      {slot.cropName || '空地'}
                    </Typography.Text>
                    <Space size={4}>
                      {slot.doubleExp && <Tag color="purple" style={{ fontSize: 10, lineHeight: '16px', margin: 0 }}>双</Tag>}
                      {slot.protectedUntil && <Tag color="blue" style={{ fontSize: 10, lineHeight: '16px', margin: 0 }}>盾</Tag>}
                      {isVip && <Tag color="gold" style={{ fontSize: 10, lineHeight: '16px', margin: 0 }}>VIP</Tag>}
                    </Space>
                  </div>
                  <Typography.Text style={{ fontSize: 12, color: stateInfo.color }}>
                    {stateInfo.label}
                  </Typography.Text>
                  {slot.state === 'growing' && (
                    <Progress percent={slot.remainingMinutes ? Math.round((1 - slot.remainingMinutes / slot.growthMinutes) * 100) : 0}
                      size="small" showInfo={false} style={{ marginTop: 4 }} />
                  )}
                  {land && land.name && land.name !== '普通土地' && (
                    <Tag color="orange" style={{ marginTop: 4, fontSize: 10 }}>{land.name}</Tag>
                  )}
                </Card>
              </Col>
            );
          })}
        </Row>
      </Card>

      {/* 底部双栏：今日统计 + 作物图鉴 */}
      <Row gutter={16}>
        <Col xs={24} md={8}>
          <Card size="small" title="今日统计">
            <Row gutter={[12, 12]}>
              <Col span={12}><Statistic title="翻地" value={farm.exploration_status?.todayCount || 0} suffix={`/ ${farm.exploration_status?.dailyLimit || 50}`} /></Col>
              <Col span={12}><Statistic title="收获经验" value={farm.today_harvest_exp} /></Col>
              <Col span={12}><Statistic title="偷菜" value={0} suffix="/ 50" /></Col>
              <Col span={12}><Statistic title="访问" value={farm.dailyVisitClaimedToday ? '已领' : '未领'} /></Col>
            </Row>
            {farm.pet_guard_info && (
              <div style={{ marginTop: 12, fontSize: 12, color: 'var(--text-secondary)' }}>
                守护: {farm.pet_guard_info.petName} Lv.{farm.pet_guard_info.petLevel} · 抓住 {(farm.pet_guard_info.catchPct * 100).toFixed(0)}%
              </div>
            )}
          </Card>
        </Col>
        <Col xs={24} md={16}>
          <Card size="small" title={`图鉴 ${collection.length} 种`}>
            {collection.length === 0 ? <Empty description="暂未收集" /> : (
              <Collapse size="small" items={grouped.filter(g => g.items.length > 0).map(g => ({
                key: g.quality,
                label: <span style={{ color: g.color }}>{g.label} ({g.items.length})</span>,
                children: (
                  <Space wrap size={[4, 4]}>
                    {g.items.map((c: any, i: number) => (
                      <Tag key={i} style={{ fontSize: 11 }}>{c.cropName}</Tag>
                    ))}
                  </Space>
                ),
              }))} />
            )}
          </Card>
        </Col>
      </Row>
    </div>
  );
}

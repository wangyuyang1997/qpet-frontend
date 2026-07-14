import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Card, Row, Col, Tabs, Tag, Spin, Typography, Progress, Statistic, Badge, Empty, Space, Select } from 'antd';
import { ExperimentOutlined, TrophyOutlined } from '@ant-design/icons';
import { accountApi } from '../../api/client';

const RARITY_COLORS: Record<string, string> = {
  normal: '#999', fine: '#1677ff', rare: '#722ed1', legend: '#fa8c16',
};

export default function Museum() {
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
  if (!farm) return <Typography.Text type="secondary">暂无数据</Typography.Text>;

  const museum = farm.museum || {};
  const slots = farm.slots || [];
  const halls = museum.halls || [];
  const items = museum.items || [];
  const totalItems = museum.totalCount || 200;
  const discovered = museum.uniqueCount || 0;
  const researchPoints = museum.researchPoints || 0;

  // 按展厅分组
  const hallGroups = halls.map((hall: any) => ({
    ...hall,
    items: items.filter((i: any) => i.hall === hall.id),
  }));

  // 土地养成筛选
  const [landFilter, setLandFilter] = useState<string>('all');
  const landSlots = slots.filter((s: any) => s.land);
  const filteredLand = landFilter === 'all'
    ? landSlots
    : landFilter === 'upgradable'
      ? landSlots.filter((s: any) => s.land?.canUpgrade)
      : landSlots.filter((s: any) => s.land?.name === landFilter);
  const landNames: string[] = [...new Set(landSlots.map((s: any) => s.land?.name as string).filter(Boolean))] as string[];

  const museumTab = (
    <div>
      <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
        <Col span={6}><Statistic title="藏品" value={discovered} suffix={`/ ${totalItems}`} /></Col>
        <Col span={6}><Statistic title="研究点" value={researchPoints} /></Col>
        <Col span={6}><Statistic title="稀有保底" value={museum.nextRareIn || 30} suffix="次后" /></Col>
        <Col span={6}><Statistic title="传说保底" value={museum.nextLegendIn || 200} suffix="次后" /></Col>
      </Row>

      {hallGroups.length === 0 ? (
        <Empty description="暂无展厅数据" />
      ) : (
        <CollapseHallGroups groups={hallGroups} />
      )}
    </div>
  );

  const landTab = (
    <div>
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col span={8}><Statistic title="研究点（共享）" value={researchPoints} /></Col>
        <Col span={8}>
          <Statistic title="已修复藏品（共享）"
            value={items.filter((i: any) => i.restored).length} suffix="件" />
        </Col>
        <Col span={8}>
          <Statistic title="可升级地块"
            value={landSlots.filter((s: any) => s.land?.canUpgrade).length} suffix="块" />
        </Col>
      </Row>

      <Space style={{ marginBottom: 12 }}>
        <Select value={landFilter} onChange={setLandFilter} style={{ width: 140 }}
          options={[
            { value: 'all', label: `全部 ${landSlots.length}` },
            { value: 'upgradable', label: `可升级 ${landSlots.filter((s: any) => s.land?.canUpgrade).length}` },
            ...landNames.map((n: string) => ({
              value: n, label: `${n} ${landSlots.filter((s: any) => s.land?.name === n).length}`,
            })),
          ]} />
      </Space>

      {filteredLand.length === 0 ? (
        <Empty description="暂无可升级地块" />
      ) : (
        <Row gutter={[12, 12]}>
          {filteredLand.map((slot: any) => {
            const land = slot.land;
            if (!land) return null;
            const reqs = land.requirements || {};
            return (
              <Col key={slot.slotIndex} xs={24} sm={12} md={8} lg={6}>
                <Card size="small" title={`地块 ${slot.slotIndex}`}
                  extra={land.canUpgrade ? <Badge status="success" text="可升级" /> : null}>
                  <div style={{ marginBottom: 8 }}>
                    <Tag color="blue">{land.name}</Tag>
                    {land.nextLevel && <Tag color="green">下一级: {land.nextLevel.name}</Tag>}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 12 }}>
                    成长 {land.growthReduction ? `${-(land.growthReduction * 100).toFixed(0)}%` : '+0%'}
                    {' · '}
                    收获 {land.harvestBonus ? `+${(land.harvestBonus * 100).toFixed(0)}%` : '+0%'}
                  </div>
                  <Progress percent={land.soilExp ? Math.round((land.soilExp / (land.nextLevel?.soilExpCost || 1)) * 100) : 0}
                    size="small" format={() => `${land.soilExp || 0} / ${land.nextLevel?.soilExpCost || '?'}`} />
                  <div style={{ marginTop: 12, fontSize: 12 }}>
                    {[
                      { label: '研究点', key: 'research', shared: true },
                      { label: '土地经验', key: 'soilExp', shared: false },
                      { label: '已修复藏品', key: 'collection', shared: true },
                    ].map(r => {
                      const req = (reqs[r.key] || {}) as any;
                      return (
                        <div key={r.key} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                          <span>{r.label}</span>
                          <span>
                            {req.current || 0} / {req.required || '?'}
                            {req.met ? <Tag color="success" style={{ fontSize: 10, marginLeft: 4 }}>满足</Tag> : null}
                            <Tag style={{ fontSize: 10, marginLeft: 4 }}>{r.shared ? '共享' : '本块'}</Tag>
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </Card>
              </Col>
            );
          })}
        </Row>
      )}
    </div>
  );

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <Typography.Text style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 700 }}>
          农场博物馆 & 土地养成
        </Typography.Text>
        <Space>
          <Link to={`/farm/${accountId}`}><ExperimentOutlined /> 农场</Link>
        </Space>
      </div>
      <Tabs items={[
        { key: 'museum', label: '农场博物馆', children: museumTab },
        { key: 'land', label: '土地养成', children: landTab },
      ]} />
    </div>
  );
}

/** 展厅折叠组件 */
function CollapseHallGroups({ groups }: { groups: any[] }) {
  const [openHall, setOpenHall] = useState<string | null>(null);
  return (
    <Row gutter={[12, 12]}>
      {groups.map((hall: any) => {
        const restored = hall.items.filter((i: any) => i.restored).length;
        return (
          <Col key={hall.id} xs={12} sm={8} md={6} lg={4}>
            <Card
              size="small"
              hoverable
              onClick={() => setOpenHall(openHall === hall.id ? null : hall.id)}
              style={{ borderTop: openHall === hall.id ? '2px solid #1677ff' : undefined }}
            >
              <Typography.Text strong style={{ fontSize: 13 }}>{hall.name || hall.id}</Typography.Text>
              <br />
              <Typography.Text style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
                {restored} / {hall.total || hall.items.length}
              </Typography.Text>
            </Card>
            {openHall === hall.id && (
              <Card size="small" style={{ marginTop: 8 }}>
                {['legend', 'rare', 'fine', 'normal'].filter(q =>
                  hall.items.some((i: any) => i.rarity === q)
                ).map(q => (
                  <div key={q} style={{ marginBottom: 8 }}>
                    <Tag color={RARITY_COLORS[q]}>{q === 'legend' ? '传说' : q === 'rare' ? '稀有' : q === 'fine' ? '良品' : '普通'}</Tag>
                    <Row gutter={[4, 4]}>
                      {hall.items.filter((i: any) => i.rarity === q).map((item: any) => (
                        <Col key={item.id} span={24}>
                          <Card size="small" style={{ opacity: item.discovered ? 1 : 0.4 }}>
                            <Typography.Text style={{ fontSize: 12 }}>
                              {item.discovered ? item.name : '???'}
                            </Typography.Text>
                            <Progress percent={item.fragmentCount ? Math.round((item.fragmentCount / item.requiredFragments) * 100) : 0}
                              size="small" style={{ marginTop: 4 }}
                              format={() => `${item.fragmentCount || 0}/${item.requiredFragments}`} />
                          </Card>
                        </Col>
                      ))}
                    </Row>
                  </div>
                ))}
              </Card>
            )}
          </Col>
        );
      })}
    </Row>
  );
}

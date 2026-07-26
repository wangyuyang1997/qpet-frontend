import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Card, Row, Col, Tag, Typography, Progress, Statistic, Empty, Space, Collapse, Tooltip, Table } from 'antd';
import { HomeOutlined } from '@ant-design/icons';
import { accountApi } from '../../api/client';

const RARITY_COLOR: Record<string, string> = {
  '普通': '#999', '良品': '#1677ff', '稀有': '#722ed1', '传说': '#fa8c16',
};
const RARITY_ORDER = ['传说', '稀有', '良品', '普通'];

// 统一土地 9 阶数据
const LAND_TIERS = [
  { lv: 1, name: '普通土地', rp: 0,     art: 0,   growth: 0,  harvest: 0,  desc: '初始耕地' },
  { lv: 2, name: '肥沃土地', rp: 200,   art: 4,   growth: -2, harvest: 2,  desc: '翻新启程' },
  { lv: 3, name: '红土地',   rp: 550,   art: 10,  growth: -4, harvest: 4,  desc: '稳步培育' },
  { lv: 4, name: '黑土田',   rp: 1100,  art: 20,  growth: -5, harvest: 6,  desc: '土质成型' },
  { lv: 5, name: '灵壤田',   rp: 2000,  art: 36,  growth: -7, harvest: 9,  desc: '中期分水岭' },
  { lv: 6, name: '沃金田',   rp: 3400,  art: 56,  growth: -9, harvest: 12, desc: '高产阶段' },
  { lv: 7, name: '玉脉田',   rp: 5500,  art: 82,  growth: -11,harvest: 16, desc: '高阶养成' },
  { lv: 8, name: '星辉田',   rp: 8500,  art: 112, growth: -14,harvest: 21, desc: '准毕业土地' },
  { lv: 9, name: '神恩田',   rp: 12700, art: 148, growth: -18,harvest: 27, desc: '毕业神田' },
];

export default function Museum() {
  const { accountId } = useParams<{ accountId: string }>();
  const [museum, setMuseum] = useState<any>(null);
  const [land, setLand] = useState<any>(null);
  const [trades, setTrades] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<string>('museum');

  const fetchAll = () => {
    if (!accountId) return;
    accountApi.museumProgress(accountId)
      .then((res: any) => setMuseum(res.data?.data || null));
    accountApi.landStatus(accountId)
      .then((res: any) => setLand(res.data?.data || null));
    accountApi.museumTrades(accountId)
      .then((res: any) => setTrades(res.data?.data || null));
  };

  useEffect(() => { fetchAll(); }, [accountId]);
  useEffect(() => {
    const t = setInterval(fetchAll, 60000);
    return () => clearInterval(t);
  }, [accountId]);

  // ——— Museum Tab ———
  const items = museum?.items || [];
  const cats = museum?.categories || [];
  const repairedCount = museum?.repaired_count || 0;

  const groups: Record<string, Record<string, any[]>> = {};
  for (const it of items) {
    const cat = it.category || '其他';
    const rar = it.rarity || '普通';
    if (!groups[cat]) groups[cat] = {};
    if (!groups[cat][rar]) groups[cat][rar] = [];
    groups[cat][rar].push(it);
  }

  const museumTab = (
    <div>
      <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
        <Col span={8}><Statistic title="已修复藏品" value={repairedCount} suffix={`/ ${museum?.total_items || 200}`} /></Col>
        <Col span={8}>
          <Statistic title="分类完成" value={cats.filter((c: any) => c.repaired === c.total).length} suffix={`/ ${cats.length}`} />
        </Col>
        <Col span={8}><Statistic title="总藏品" value={museum?.total_items || 200} /></Col>
      </Row>

      {cats.length === 0 ? <Empty description="暂无博物馆数据" /> : (
        <Collapse items={Object.entries(groups).map(([cat, rarMap]) => {
          const totalInCat = Object.values(rarMap).flat().length;
          const repairedInCat = Object.values(rarMap).flat().filter((i: any) => i.is_repaired).length;
          return {
            key: cat,
            label: <span>{cat} <Tag>{repairedInCat}/{totalInCat}</Tag></span>,
            children: RARITY_ORDER.filter(r => rarMap[r]?.length).map(r => (
              <div key={r} style={{ marginBottom: 12 }}>
                <Tag color={RARITY_COLOR[r]}>{r}</Tag>
                <Row gutter={[6, 4]}>
                  {rarMap[r].map((item: any) => {
                    const pct = item.fragments_needed > 0
                      ? Math.round((item.fragment_count / item.fragments_needed) * 100) : 0;
                    const statusTag = item.is_repaired
                      ? <Tag color="success" style={{ fontSize: 10 }}>成</Tag>
                      : item.status === '半'
                        ? <Tag style={{ fontSize: 10 }}>半</Tag>
                        : item.fragment_count > 0
                          ? <Tag style={{ fontSize: 10, color: '#999' }}>见</Tag>
                          : null;
                    return (
                      <Col key={item.item_id} xs={12} sm={8} md={6} lg={4}>
                        <Tooltip title={item.description || item.name}>
                          <Card size="small" styles={{ body: { padding: '6px 8px' } }}
                            style={{ opacity: item.fragment_count > 0 ? 1 : 0.35 }}>
                            <div style={{ fontSize: 12, fontWeight: 500 }}>
                              {item.name} {statusTag}
                            </div>
                            <Progress percent={pct} size="small"
                              format={() => `${item.fragment_count}/${item.fragments_needed}`}
                              strokeColor={item.is_repaired ? '#52c41a' : RARITY_COLOR[r]} />
                          </Card>
                        </Tooltip>
                      </Col>
                    );
                  })}
                </Row>
              </div>
            )),
          };
        })} />
      )}
    </div>
  );

  // ——— Land Tab ———
  const curLv = land?.level || 1;
  const next = land?.next || {};
  const rp = land?.research_points || 0;
  const repairedForLand = repairedCount;

  const landTab = land ? (
    <div>
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col span={8}>
          <Card size="small">
            <Statistic title="当前土地"
              value={land.name} valueStyle={{ fontSize: 22, color: '#fa8c16' }} />
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>
              成长 {curLv === 1 ? '+0%' : `${LAND_TIERS[curLv-1].growth}%`}
              {' · '}收获 {curLv === 1 ? '+0%' : `+${LAND_TIERS[curLv-1].harvest}%`}
            </div>
          </Card>
        </Col>
        <Col span={8}>
          <Card size="small">
            <Statistic title="研究点" value={rp}
              suffix={next.rp_needed ? <span style={{ fontSize: 14, color: '#999' }}>/ {next.rp_needed}</span> : undefined} />
            <Progress percent={next.rp_needed ? Math.min(100, Math.round((rp / next.rp_needed) * 100)) : 0}
              size="small" status={rp >= (next.rp_needed || 0) ? 'success' : 'active'} />
          </Card>
        </Col>
        <Col span={8}>
          <Card size="small">
            <Statistic title="已修复藏品" value={repairedForLand}
              suffix={next.artifacts ? <span style={{ fontSize: 14, color: '#999' }}>/ {next.artifacts}</span> : undefined} />
            <Progress percent={next.artifacts ? Math.min(100, Math.round((repairedForLand / next.artifacts) * 100)) : 0}
              size="small" status={repairedForLand >= (next.artifacts || 0) ? 'success' : 'active'} />
          </Card>
        </Col>
      </Row>

      {next.level && (
        <Card size="small" title={`下一级：${next.name}`} style={{ marginBottom: 20 }}>
          <Row gutter={24}>
            <Col span={8}>
              <Statistic title="成长时间" value={`${next.growth_pct || 0}%`}
                valueStyle={{ color: (next.growth_pct || 0) < 0 ? '#52c41a' : '#999', fontSize: 18 }} />
            </Col>
            <Col span={8}>
              <Statistic title="收获经验" value={`+${next.harvest_pct || 0}%`}
                valueStyle={{ color: '#1677ff', fontSize: 18 }} />
            </Col>
            <Col span={8}>
              <Statistic title="状态"
                value={next.can_upgrade ? '可升级' : '条件不足'}
                valueStyle={{ color: next.can_upgrade ? '#52c41a' : '#ff4d4f', fontSize: 18 }} />
            </Col>
          </Row>
        </Card>
      )}

      <Typography.Title level={5} style={{ marginBottom: 12 }}>晋级路线总览 · 共 9 阶</Typography.Title>
      <Typography.Paragraph type="secondary" style={{ fontSize: 12, marginBottom: 16 }}>
        每次升级都会直接提升全农场所有土地的成长与收获收益。
      </Typography.Paragraph>

      <Row gutter={[12, 12]}>
        {LAND_TIERS.map((t, i) => {
          const isCurrent = t.lv === curLv;
          const isPassed = t.lv < curLv;
          const isNext = t.lv === curLv + 1;
          const borderColor = isCurrent ? '#fa8c16' : isPassed ? '#52c41a' : isNext ? '#1677ff' : 'transparent';
          return (
            <Col key={t.lv} xs={12} sm={8} md={6} lg={4} xl={3}>
              <Card size="small" styles={{ body: { padding: '8px 10px' } }}
                style={{ borderTop: `3px solid ${borderColor}`, opacity: isPassed || isCurrent ? 1 : 0.5 }}>
                <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 2 }}>
                  Lv.{t.lv} {t.name}
                </div>
                <div style={{ fontSize: 10, color: 'var(--text-tertiary)', marginBottom: 4 }}>{t.desc}</div>
                <div style={{ fontSize: 10, lineHeight: '16px' }}>
                  <div>成长 <span style={{ color: t.growth < 0 ? '#52c41a' : '#999' }}>{t.growth}%</span></div>
                  <div>收获 <span style={{ color: t.harvest > 0 ? '#1677ff' : '#999' }}>+{t.harvest}%</span></div>
                  <div style={{ color: 'var(--text-tertiary)' }}>研究点 {t.rp.toLocaleString()}</div>
                  <div style={{ color: 'var(--text-tertiary)' }}>藏品 {t.art} 件</div>
                </div>
                {isCurrent && <Tag color="orange" style={{ marginTop: 4 }}>当前</Tag>}
                {isPassed && <Tag color="green" style={{ marginTop: 4 }}>已达成</Tag>}
              </Card>
            </Col>
          );
        })}
      </Row>
    </div>
  ) : <Empty description="暂无土地数据，请先启动引擎同步" />;

  // ——— Trade Tab ———
  const tradeList = trades?.trades || [];
  const canTrade = trades?.can_trade || false;
  const todayTrade = trades?.today_trade_count || 0;

  const tradeColumns = [
    {
      title: '时间', dataIndex: 'updated_at', key: 'time', width: 140,
      render: (v: string) => v ? v.slice(5, 16).replace('T', ' ') : '-',
    },
    {
      title: '方向', dataIndex: 'direction', key: 'direction', width: 80,
      render: (v: string) => v === 'initiated'
        ? <Tag color="blue">我发起</Tag>
        : <Tag color="orange">我收到</Tag>,
    },
    {
      title: '对方', dataIndex: 'counterparty_name', key: 'peer', width: 100,
    },
    {
      title: '我提供', key: 'offer', width: 160,
      render: (_: any, r: any) => {
        const direction = r.direction === 'initiated' ? 'offer' : 'want';
        const item = direction === 'offer' ? r : r;
        const id = direction === 'offer' ? r.offer_item_id : r.want_item_id;
        const name = direction === 'offer' ? r.offer_item_name : r.want_item_name;
        const qty = direction === 'offer' ? r.offer_quantity : r.want_quantity;
        const rarity = direction === 'offer' ? r.offer_item_rarity : r.want_item_rarity;
        return (
          <Space size={4}>
            <span>{name} ×{qty}</span>
            <Tag color={RARITY_COLOR[rarity] || '#999'} style={{ fontSize: 10, lineHeight: '16px' }}>{rarity}</Tag>
          </Space>
        );
      },
    },
    {
      title: '我获得', key: 'want', width: 160,
      render: (_: any, r: any) => {
        const direction = r.direction === 'initiated' ? 'want' : 'offer';
        const id = direction === 'want' ? r.want_item_id : r.offer_item_id;
        const name = direction === 'want' ? r.want_item_name : r.offer_item_name;
        const qty = direction === 'want' ? r.want_quantity : r.offer_quantity;
        const rarity = direction === 'want' ? r.want_item_rarity : r.offer_item_rarity;
        return (
          <Space size={4}>
            <span>{name} ×{qty}</span>
            <Tag color={RARITY_COLOR[rarity] || '#999'} style={{ fontSize: 10, lineHeight: '16px' }}>{rarity}</Tag>
          </Space>
        );
      },
    },
    {
      title: '唯一码', dataIndex: 'unique_code', key: 'code', width: 120,
      render: (v: string) => <Typography.Text copyable style={{ fontSize: 12, fontFamily: 'monospace' }}>{v}</Typography.Text>,
    },
    {
      title: '状态', dataIndex: 'status', key: 'status', width: 80,
      render: (v: string) => {
        const map: Record<string, [string, string]> = {
          accepted: ['已完成', 'green'],
          pending: ['待接受', 'orange'],
          rejected: ['已拒绝', 'red'],
        };
        const [label, color] = map[v] || [v, 'default'];
        return <Tag color={color}>{label}</Tag>;
      },
    },
  ];

  const tradeTab = (
    <div>
      <Space style={{ marginBottom: 16 }}>
        <Typography.Text strong style={{ fontSize: 16 }}>
          藏品交易记录
        </Typography.Text>
        <Tag color={canTrade ? 'green' : 'default'}>{`今日交易: ${todayTrade}/1`}</Tag>
      </Space>
      {tradeList.length === 0 ? (
        <Empty description="暂无藏品交易记录，匹配每小时自动执行" />
      ) : (
        <Table dataSource={tradeList} columns={tradeColumns}
          rowKey="id" pagination={false} size="small"
          style={{ fontSize: 13 }} />
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
          <Link to={`/farm/${accountId}`}><HomeOutlined /> 农场</Link>
        </Space>
      </div>

      <Card
        tabList={[
          { key: 'museum', tab: '博物馆' },
          { key: 'land', tab: '土地养成' },
          { key: 'trade', tab: '藏品交易' },
        ]}
        activeTabKey={activeTab}
        onTabChange={setActiveTab}
      >
        {activeTab === 'museum' ? museumTab : activeTab === 'land' ? landTab : tradeTab}
      </Card>
    </div>
  );
}

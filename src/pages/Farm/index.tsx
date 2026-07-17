import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Card, Row, Col, Tag, Typography, Statistic, Progress, Collapse } from 'antd';
import { BankOutlined } from '@ant-design/icons';
import { accountApi } from '../../api/client';

const STATE_MAP: Record<string, { label: string; color: string }> = {
  growing: { label: '生长中', color: '#1677ff' },
  ripe: { label: '已成熟', color: '#52c41a' },
  withered: { label: '已枯萎', color: '#ff4d4f' },
  empty: { label: '空地', color: '#999' },
};
const RARITY_LABEL: Record<string, string> = { legend: '传说', rare: '稀有', fine: '良品', normal: '普通', '传说': '传说', '稀有': '稀有', '良品': '良品', '普通': '普通' };
const RARITY_COLOR: Record<string, string> = { legend: '#fa8c16', rare: '#722ed1', fine: '#1677ff', normal: '#999', '传说': '#fa8c16', '稀有': '#722ed1', '良品': '#1677ff', '普通': '#999' };
const ALBUM_QUALITIES = ['稀有', '优', '普通'] as const;
const ALBUM_COLOR: Record<string, string> = { '稀有': '#f59e0b', '优': '#3b82f6', '普通': '#10b981' };

export default function Farm() {
  const { accountId } = useParams<{ accountId: string }>();
  const [farm, setFarm] = useState<any>({});
  const [collData, setCollData] = useState<any>(null);

  const fetchFarm = () => {
    if (!accountId) return;
    accountApi.farm(accountId)
      .then((res: any) => setFarm(res.data?.data || res.data || {}));
  };
  const fetchColl = () => {
    if (!accountId) return;
    accountApi.collectionProgress(accountId)
      .then((res: any) => setCollData(res.data?.data || null));
  };

  useEffect(() => { fetchFarm(); fetchColl(); }, [accountId]);
  useEffect(() => {
    const t = setInterval(() => { fetchFarm(); fetchColl(); }, 30000);
    return () => clearInterval(t);
  }, [accountId]);

  const locked = farm.unlockedSlots || 0;
  const slots = farm.slots || [];
  const cropConfig = farm.cropConfig || [];
  const total = Math.max(locked, slots.length || 0);

  const crops = collData?.crops || [];
  const collCount = collData?.collected_count || 0;
  const collTotal = collData?.total_crops || 72;

  // 按作物品质分组
  const rarityGroups = ['传说', '稀有', '良品', '普通'].filter(q =>
    crops.some((c: any) => c.crop_rarity === q)
  );

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <Typography.Text style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 700 }}>
          农场 Lv.{farm.level || '?'}
        </Typography.Text>
        <Link to={`/museum/${accountId}`}><BankOutlined /> 博物馆</Link>
      </div>

      {/* Blocks */}
      <Card size="small" title={`地块 ${locked}/${total} 格`} style={{ marginBottom: 16 }}>
        <Row gutter={[6, 6]}>
          {Array.from({ length: total }).map((_, i) => {
            const slot = slots[i];
            if (!slot) return <Col key={i} xs={8} sm={6} md={4} lg={3}><div style={{ opacity: 0.25, fontSize: 11, padding: 8 }}>#{i} 未解锁</div></Col>;

            const info = STATE_MAP[slot.state] || STATE_MAP.empty;
            const isEmpty = !slot.cropId || slot.state === 'empty';
            const growing = slot.state === 'growing';
            const mature = slot.state === 'ripe';
            const isVip = slot.slotIndex === farm.vipSlotIndex;
            const cropCfg = cropConfig.find((c: any) => c.id === slot.cropId);
            const quality = cropCfg?.rarity || 'normal';

            // 收益计算 (对齐panels.js)
            const hasDouble = (slot.usedItemIds || []).includes('double_exp') || slot.doubleExp;
            const hasVipBonus = isVip && farm.isPremium;
            let mult = 1, itemCost = 0;
            if (hasDouble) { mult *= 2; itemCost += 15; }
            if (hasVipBonus) mult *= 1.5;
            const effExp = Math.round((slot.expReward || 0) * mult);
            const ppm = slot.growthMinutes > 0 ? ((effExp - (slot.seedCostExp || 0) - itemCost) / slot.growthMinutes).toFixed(3) : '0';
            const net = effExp - (slot.seedCostExp || 0) - itemCost;
            const items = slot.usedItemIds || [];
            const expLabel = mult > 1 ? `+${slot.expReward} ×${mult} → +${effExp}` : `+${slot.expReward || 0}`;

            return (
              <Col key={i} xs={12} sm={8} md={6} lg={3}>
                <div style={{
                  borderRadius: 'var(--radius-lg)', padding: '6px 8px', minHeight: 130,
                  background: 'var(--bg-card)', boxShadow: 'var(--shadow-sm)',
                  borderTop: isVip ? '3px solid #fa8c16' : '3px solid transparent',
                  opacity: isEmpty ? 0.5 : 1,
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 1 }}>
                    <span style={{ fontSize: 10, color: '#999' }}>#{i}</span>
                    <span style={{ display: 'flex', gap: 2 }}>
                      {isVip && <Tag color="gold" style={{ fontSize: 8, lineHeight: '12px', margin: 0, padding: '0 4px' }}>VIP</Tag>}
                      <Tag style={{ fontSize: 8, lineHeight: '12px', margin: 0, padding: '0 4px', color: RARITY_COLOR[quality], borderColor: RARITY_COLOR[quality] }}>
                        {RARITY_LABEL[quality] || quality}
                      </Tag>
                    </span>
                  </div>
                  <div style={{ fontWeight: 600, fontSize: 12, marginBottom: 1 }}>{slot.cropName || '空地'}</div>

                  <div style={{ fontSize: 10, color: info.color, marginBottom: 2 }}>
                    {info.label}
                    {growing && slot.remainingMinutes != null && <span style={{ color: '#999' }}> · 剩{slot.remainingMinutes}分</span>}
                    {mature && ' ⏰'}
                  </div>

                  {growing && slot.remainingMinutes != null && slot.growthMinutes > 0 && (
                    <Progress percent={Math.round((1 - slot.remainingMinutes / slot.growthMinutes) * 100)}
                      size="small" showInfo={false} strokeColor={info.color} style={{ marginBottom: 2 }} />
                  )}

                  {!isEmpty && (
                    <div style={{ fontSize: 9, lineHeight: '14px', color: '#999' }}>
                      <div>周期 {slot.growthMinutes || '-'}分</div>
                      <div style={{ color: '#52c41a' }}>收获 {expLabel}</div>
                      <div>种子 -{slot.seedCostExp || 0}</div>
                      <div style={{ color: net > 0 ? '#52c41a' : '#ff4d4f' }}>
                        净收益 {net >= 0 ? '+' : ''}{net}
                        {itemCost > 0 && <span style={{ color: '#999' }}> (道具-{itemCost})</span>}
                      </div>
                      <div style={{ color: '#fa8c16', fontWeight: 500 }}>PPM {ppm}/分</div>
                    </div>
                  )}

                  {items.length > 0 && (
                    <div style={{ marginTop: 2, display: 'flex', gap: 2 }}>
                      {items.includes('double_exp') && <Tag color="purple" style={{ fontSize: 8, lineHeight: '12px', padding: '0 4px', margin: 0 }}>双倍</Tag>}
                      {items.includes('protect_2h') && <Tag color="blue" style={{ fontSize: 8, lineHeight: '12px', padding: '0 4px', margin: 0 }}>保护</Tag>}
                    </div>
                  )}
                  {slot.stolenExp > 0 && (
                    <div style={{ fontSize: 9, color: '#ff4d4f', marginTop: 2 }}>被偷 -{slot.stolenExp}</div>
                  )}
                </div>
              </Col>
            );
          })}
        </Row>
      </Card>

      {/* Stats */}
      <Card size="small" title="今日统计" style={{ marginBottom: 16 }}>
        <Row gutter={16}>
          <Col span={6}><Statistic title="翻地" value={`${farm.todayDigCount || farm.explorationStatus?.todayCount || 0}/${farm.explorationStatus?.dailyLimit || 50}`} /></Col>
          <Col span={6}><Statistic title="收获经验" value={farm.todayHarvestExp || 0} /></Col>
          <Col span={6}><Statistic title="偷菜" value={`${farm.todayStealCount || 0}/50`} /></Col>
          <Col span={6}><Statistic title="浇水" value={farm.todayCareCount || farm.careCountToday || 0} suffix="次" /></Col>
        </Row>
        {farm.dailyVisitClaimedToday && (
          <div style={{ marginTop: 8, fontSize: 12, color: '#52c41a' }}>访问已领</div>
        )}
        {farm.petGuardInfo && (
          <div style={{ marginTop: 8, fontSize: 11, color: '#999' }}>
            守护: {farm.petGuardInfo.petName} Lv.{farm.petGuardInfo.petLevel}
            {' '}· 抓 {Math.round((farm.petGuardInfo.catchPct || 0) / 100)}%
          </div>
        )}
      </Card>

      {/* 图鉴收集 — 从 player_collection 查表 */}
      <Card size="small" title={`图鉴 ${collCount} / ${collTotal}`}>
        <Collapse items={rarityGroups.map(q => ({
          key: q,
          label: <span style={{ color: RARITY_COLOR[q] }}>{RARITY_LABEL[q]} ({crops.filter((c: any) => c.crop_rarity === q).length})</span>,
          children: (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
              {crops.filter((c: any) => c.crop_rarity === q).sort((a: any, b: any) => a.name.localeCompare(b.name)).map((c: any) => {
                const hasAny = Object.values(c.qualities).some(Boolean);
                return (
                  <Tag key={c.crop_id} style={{ fontSize: 11, opacity: hasAny ? 1 : 0.35 }}>
                    {c.name}
                    {ALBUM_QUALITIES.map(x => (
                      <span key={x} style={{
                        display: 'inline-block', width: 6, height: 6, borderRadius: 3,
                        background: c.qualities[x] ? ALBUM_COLOR[x] : '#ddd',
                        marginLeft: 2, verticalAlign: 'middle',
                      }} />
                    ))}
                  </Tag>
                );
              })}
            </div>
          ),
        }))} />
      </Card>
    </div>
  );
}

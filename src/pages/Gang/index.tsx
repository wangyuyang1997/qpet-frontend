import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Card, Row, Col, Tag, Spin, Typography, Progress, Statistic, Empty } from 'antd';
import { accountApi } from '../../api/client';

const GANG_SKILLS = [
  { name: '帮派荣耀', effect: '生命+2/级', maxLv: 20, unlockLv: 1 },
  { name: '武器专精', effect: '武器伤+1%/级', maxLv: 10, unlockLv: 1 },
  { name: '闪避提升', effect: '闪避率+1%/级', maxLv: 5, unlockLv: 1 },
  { name: '命中提升', effect: '命中率+1%/级', maxLv: 5, unlockLv: 2 },
  { name: '暴击提升', effect: '暴击率+1%/级', maxLv: 5, unlockLv: 2 },
  { name: '钢筋铁骨', effect: '生命+3/级', maxLv: 5, unlockLv: 3 },
  { name: '强身健体', effect: '生命+5/级', maxLv: 5, unlockLv: 4 },
];

const GANG_BOSSES = [
  '羊魔王', '铁爪狼', '金翅雕', '黑风熊', '赤焰虎', '冰霜龙', '雷霆鹰', '暗影蛇',
];

type GangData = {
  gangName?: string; gangLevel?: number; memberCount?: number; maxMembers?: number;
  title?: string; notice?: string;
  growth?: { current: number; required: number; progress: number };
  guardian?: { unlocked: boolean; level?: number };
  skills?: Record<string, { level: number; maxLevel: number }>;
  availableContribution?: number;
  bosses?: Record<string, { level: number; affinity?: number; todayWins?: number; freeUsed?: boolean; unlocked: boolean }>;
  myRole?: string; myTotalContribution?: number;
  weeklyActive?: { name: string; contribution: number }[];
  todayContribution?: number; maxContribution?: number;
  challengeBooks?: number;
};

export default function Gang() {
  const { accountId } = useParams<{ accountId: string }>();
  const [gang, setGang] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!accountId) return;
    accountApi.character(accountId)
      .then((res: any) => setGang(res.data?.gang_status || res.data))
      .finally(() => setLoading(false));
  }, [accountId]);

  if (loading) return <Spin size="large" style={{ display: 'block', margin: '120px auto' }} />;
  if (!gang) return <Typography.Text type="secondary">未加入帮派</Typography.Text>;

  const d = gang as GangData;

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 20, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 32 }}>🏯</span>
        <Typography.Text style={{ fontSize: 24, fontWeight: 700, fontFamily: 'var(--font-display)', letterSpacing: '-0.04em' }}>
          {d.gangName || '帮派'}
        </Typography.Text>
        <Tag color="blue">Lv.{d.gangLevel || 1}</Tag>
        <Tag>{d.memberCount || 0}/{d.maxMembers || 20}人</Tag>
        {d.title && <Tag color="gold">{d.title}</Tag>}
      </div>

      {/* Growth */}
      <Card size="small" title="成长" style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 13, marginBottom: 8 }}>
          Lv.{d.gangLevel || 1} → Lv.{(d.gangLevel || 1) + 1}
          <span style={{ color: 'var(--text-secondary)', marginLeft: 12 }}>
            累计 {(d.growth?.current || 0).toLocaleString()} / {(d.growth?.required || 10000).toLocaleString()}
          </span>
        </div>
        <Progress percent={d.growth?.progress || 0} size="small" />
        <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 8 }}>
          守护神: {d.guardian?.unlocked ? <Tag color="green">已解锁 Lv.{d.guardian?.level || 1}</Tag> : <Tag>🔒 帮派3级解锁</Tag>}
        </div>
      </Card>

      {/* Shared Skills */}
      <Card size="small" title={`共享技能 · 可用贡献 ${d.availableContribution || 0}`} style={{ marginBottom: 16 }}>
        {GANG_SKILLS.map(skill => {
          const sd = d.skills?.[skill.name];
          const locked = (d.gangLevel || 0) < skill.unlockLv;
          const level = sd?.level || 0;
          const maxLv = sd?.maxLevel || skill.maxLv;
          return (
            <div key={skill.name} style={{ marginBottom: 8, opacity: locked ? 0.5 : 1 }}>
              <Row align="middle">
                <Col span={6}>
                  <Typography.Text style={{ fontSize: 13, fontWeight: 500 }}>
                    {locked ? '🔒 ' : ''}{skill.name}
                  </Typography.Text>
                </Col>
                <Col span={4}>
                  <Typography.Text style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{skill.effect}</Typography.Text>
                </Col>
                <Col span={6}>
                  <Tag style={{ fontSize: 11 }}>Lv.{level}/{maxLv}</Tag>
                  {level >= maxLv && <Tag color="success" style={{ fontSize: 10 }}>满级</Tag>}
                </Col>
                <Col span={8}>
                  <Progress percent={maxLv > 0 ? (level / maxLv) * 100 : 0} size="small" showInfo={false} />
                </Col>
              </Row>
            </div>
          );
        })}
      </Card>

      {/* BOSS */}
      <Card size="small" title="BOSS · 每日上限 15" style={{ marginBottom: 16 }}>
        {GANG_BOSSES.map((name, i) => {
          const boss = d.bosses?.[name];
          const locked = !boss?.unlocked && i > 0;
          return (
            <div key={name} style={{ marginBottom: 6, opacity: locked ? 0.4 : 1, fontSize: 13 }}>
              <Tag>{name}</Tag>
              {!locked && (
                <>
                  <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                    Lv.{boss?.level || i + 1} 亲和{boss?.affinity || '?'}
                  </span>
                  {boss?.todayWins !== undefined && <Tag color="blue" style={{ fontSize: 10, marginLeft: 4 }}>今日{boss.todayWins}胜</Tag>}
                  {boss?.freeUsed !== undefined && <Tag color="green" style={{ fontSize: 10 }}>{boss.freeUsed ? '免费已用' : '免费可用'}</Tag>}
                  {boss?.unlocked && <Tag color="success" style={{ fontSize: 10 }}>可挑战</Tag>}
                </>
              )}
              {locked && <Tag style={{ fontSize: 10 }}>🔒 帮派Lv.{i + 2}解锁</Tag>}
            </div>
          );
        })}
        <div style={{ marginTop: 8, fontSize: 12, color: 'var(--text-secondary)' }}>
          挑战书: {d.challengeBooks || 0} · 今日贡献: {d.todayContribution || 0}/{d.maxContribution || 150}
        </div>
      </Card>

      {/* My stats + Weekly active */}
      <Row gutter={16}>
        <Col xs={24} md={8}>
          <Card size="small" title="我的">
            <Statistic title="角色" value={d.myRole || '成员'} valueStyle={{ fontSize: 16 }} />
            <Statistic title="历史贡献" value={d.myTotalContribution || 0} valueStyle={{ fontSize: 14 }} />
            <Statistic title="可用贡献" value={d.availableContribution || 0} valueStyle={{ fontSize: 14 }} />
          </Card>
        </Col>
        <Col xs={24} md={16}>
          <Card size="small" title="本周活跃">
            {(d.weeklyActive || []).length === 0 ? (
              <Empty description="暂无数据" />
            ) : (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {(d.weeklyActive || []).map((m: any, i: number) => (
                  <Tag key={i} style={{ fontSize: 12, padding: '4px 10px' }}>
                    {m.name} {m.contribution}
                  </Tag>
                ))}
              </div>
            )}
          </Card>
        </Col>
      </Row>
    </div>
  );
}

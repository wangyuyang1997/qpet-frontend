import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Card, Row, Col, Tag, Spin, Typography, Progress, Statistic, Empty } from 'antd';
import { accountApi } from '../../api/client';

export default function Gang() {
  const { accountId } = useParams<{ accountId: string }>();
  const [gang, setGang] = useState<any>(null);
  const [char, setChar] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!accountId) return;
    Promise.all([
      accountApi.gang(accountId),
      accountApi.character(accountId),
    ])
      .then(([gRes, cRes]: any[]) => {
        setGang(gRes.data?.data || gRes.data || null);
        setChar(cRes.data?.data || cRes.data || {});
      })
      .finally(() => setLoading(false));
  }, [accountId]);

  if (loading) return <Spin size="large" style={{ display: 'block', margin: '120px auto' }} />;
  if (!gang?.inGang) return <Typography.Text type="secondary">未加入帮派</Typography.Text>;

  const info = gang.gang || {};
  const my = gang.myMembership || {};
  const skills = gang.mySkills || {};
  const skillsConfig = gang.gangSkillsConfig || {};
  const members = gang.members || [];
  const progress = gang.levelProgress || 0;
  const nextLevel = gang.nextGangLevel || {};

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <Typography.Text style={{ fontSize: 28, fontWeight: 700, fontFamily: 'var(--font-display)', letterSpacing: '-0.04em', display: 'block' }}>
          {info.name || '帮派'}
        </Typography.Text>
        <div style={{ display: 'flex', gap: 12, marginTop: 8, alignItems: 'center' }}>
          <Tag color="blue">Lv.{info.level}</Tag>
          <Tag>{my.role === 'leader' ? '帮主' : my.role === 'vice_leader' ? '副帮主' : '成员'}</Tag>
          <Tag>贡献: {my.contribution || 0}</Tag>
          {char.bonus_gang_hp > 0 && <Tag color="green">HP+{char.bonus_gang_hp}</Tag>}
          {char.bonus_gang_atk > 0 && <Tag color="orange">ATK+{char.bonus_gang_atk}</Tag>}
        </div>
      </div>

      {/* Progress to next level */}
      <Card size="small" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
          <span style={{ fontSize: 12 }}>帮派等级 Lv.{info.level} → Lv.{nextLevel.level || '?'}</span>
          <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{progress}%</span>
        </div>
        <Progress percent={progress} size="small" showInfo={false} />
        <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 4 }}>
          总贡献: {info.total_contribution || 0} | 需要: {nextLevel.needContrib || '?'} | 人数上限: {nextLevel.memberLimit || '?'}
        </div>
      </Card>

      {/* Skills + Members */}
      <Row gutter={16}>
        <Col span={12}>
          <Card size="small" title={`帮派技能 (${Object.keys(skills).length})`}>
            {Object.keys(skills).length === 0 ? <Empty description="暂无" /> : (
              Object.entries(skills).map(([name, lv]: [string, any]) => {
                const cfg = (skillsConfig as any)[name] || {};
                const maxLv = cfg.maxLevel || 20;
                return (
                  <div key={name} style={{ marginBottom: 8 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 2 }}>
                      <span>{name}</span>
                      <span style={{ color: 'var(--text-secondary)' }}>Lv.{lv}/{maxLv}</span>
                    </div>
                    <Progress percent={(Number(lv) / maxLv) * 100} size="small" showInfo={false} />
                  </div>
                );
              })
            )}
          </Card>
        </Col>
        <Col span={12}>
          <Card size="small" title={`成员 (${members.length})`}>
            {members.map((m: any) => (
              <div key={m.user_id || m.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                <span>{m.nickname || m.user_id}</span>
                <span style={{ color: 'var(--text-secondary)' }}>{m.role === 'leader' ? '帮主' : m.role === 'vice_leader' ? '副帮主' : '成员'}</span>
              </div>
            ))}
          </Card>
        </Col>
      </Row>
    </div>
  );
}

import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Card, Row, Col, Tag, Spin, Typography, Statistic, Empty, Modal, Descriptions } from 'antd';
import { accountApi } from '../../api/client';

const TIERS = [
  { name: 'T1', level: 15 },
  { name: 'T2', level: 20 },
  { name: 'T3', level: 25 },
  { name: 'T4', level: 30 },
  { name: 'T5', level: 35 },
  { name: 'T6', level: 40 },
  { name: 'T7', level: 50 },
];

export default function Class() {
  const { accountId } = useParams<{ accountId: string }>();
  const [char, setChar] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedSkill, setSelectedSkill] = useState<any>(null);

  useEffect(() => {
    if (!accountId) return;
    accountApi.character(accountId)
      .then((res: any) => setChar(res.data))
      .finally(() => setLoading(false));
  }, [accountId]);

  if (loading) return <Spin size="large" style={{ display: 'block', margin: '120px auto' }} />;
  if (!char) return <Typography.Text type="secondary">暂无数据</Typography.Text>;

  const classInfo = char.class_info || {};
  const skills = char.skills || [];
  const className = char.class_name || '未转职';
  const awakened = classInfo?.awakened || false;
  const availableSp = classInfo?.available_sp ?? classInfo?.availableSp ?? 0;
  const totalSp = classInfo?.total_sp ?? classInfo?.totalSp ?? 0;

  // Group skills by tier from skill data or by level
  const skillMap = new Map<string, any[]>();
  for (const s of skills) {
    let tier = s.tier;
    if (!tier) {
      const lv = s.level_unlock || s.levelRequired || 0;
      for (const t of TIERS) { if (lv <= t.level) { tier = t.name; break; } }
      if (!tier && lv > 0) tier = 'T7';
    }
    if (!tier) tier = 'T1';
    if (!skillMap.has(tier)) skillMap.set(tier, []);
    skillMap.get(tier)!.push(s);
  }

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <Typography.Text style={{ fontSize: 28, fontWeight: 700, fontFamily: 'var(--font-display)', letterSpacing: '-0.04em', display: 'block' }}>
          {className}
        </Typography.Text>
        <div style={{ display: 'flex', gap: 12, marginTop: 8, alignItems: 'center' }}>
          {awakened && <Tag color="gold">已觉醒</Tag>}
          <Tag>可用 SP: {availableSp} / {totalSp}</Tag>
        </div>
        {classInfo?.strategy && (
          <div style={{ marginTop: 8, fontSize: 12, color: 'var(--text-secondary)' }}>
            加点策略: {classInfo.strategy}
          </div>
        )}
      </div>

      {/* Skill Tree */}
      <Card size="small" title="技能树">
        {skills.length === 0 ? <Empty description="暂未学习技能" /> : (
          <div>
            {TIERS.filter(t => skillMap.has(t.name)).map((tier, ti) => {
              const tierSkills = skillMap.get(tier.name) || [];
              if (tierSkills.length === 0) return null;
              const isAwakenTier = ti === 5 && awakened; // T6 awakening
              return (
                <div key={tier.name} style={{ marginBottom: 16 }}>
                  <Typography.Text type="secondary" style={{ fontSize: 11, display: 'block', marginBottom: 6 }}>
                    {tier.name} Lv.{tier.level}
                    {isAwakenTier && <span style={{ color: '#fa8c16' }}> · 觉醒</span>}
                  </Typography.Text>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {tierSkills.map((s: any) => {
                      const isActive = s.level > 0;
                      const isSkipped = s.skipped || (s.level === 0 && s.maxLevel === 0);
                      return (
                        <Tag
                          key={s.name}
                          color={isActive ? 'blue' : isSkipped ? 'default' : undefined}
                          style={{ cursor: 'pointer', fontSize: 12, opacity: isSkipped ? 0.5 : 1 }}
                          onClick={() => !isSkipped && setSelectedSkill(s)}
                        >
                          {s.name} {s.level}/{s.maxLevel || 5}
                          <span style={{ fontSize: 10, marginLeft: 4, color: 'var(--text-tertiary)' }}>
                            {s.type || '被动'}
                          </span>
                        </Tag>
                      );
                    })}
                  </div>
                  {isAwakenTier && (
                    <div style={{ fontSize: 10, color: 'var(--text-tertiary)', marginTop: 4 }}>
                      ←前置: 圣光守护3 ←前置: 圣域3
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* Skill Detail Modal */}
      <Modal title={selectedSkill?.name} open={!!selectedSkill} onCancel={() => setSelectedSkill(null)} footer={null} width={420}>
        {selectedSkill && (
          <Descriptions column={1} size="small" bordered>
            <Descriptions.Item label="类型">{selectedSkill.type || '被动'}{selectedSkill.type === '主动' && '主动'}{selectedSkill.type === '团队' && '团队'}</Descriptions.Item>
            {selectedSkill.sp_cost !== undefined && <Descriptions.Item label="SP消耗">{selectedSkill.sp_cost}</Descriptions.Item>}
            {selectedSkill.requirement && <Descriptions.Item label="前置条件">{selectedSkill.requirement}</Descriptions.Item>}
            <Descriptions.Item label="当前效果">Lv.{selectedSkill.level || 0}: {selectedSkill.effect || selectedSkill.description || '-'}</Descriptions.Item>
            {selectedSkill.nextEffect && <Descriptions.Item label="下一级">Lv.{(selectedSkill.level || 0) + 1}: {selectedSkill.nextEffect}</Descriptions.Item>}
            {selectedSkill.maxLevel && <Descriptions.Item label="最高等级">{selectedSkill.maxLevel}</Descriptions.Item>}
          </Descriptions>
        )}
      </Modal>
    </div>
  );
}

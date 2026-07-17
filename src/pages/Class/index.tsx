import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Card, Tag, Spin, Typography, Empty, Progress } from 'antd';
import { accountApi } from '../../api/client';

const TIER_COLORS = ['#52c41a', '#1890ff', '#722ed1', '#fa8c16', '#eb2f96', '#f5222d', '#13c2c2'];

export default function Class() {
  const { accountId } = useParams<{ accountId: string }>();

  const skillQuery = useQuery({
    queryKey: ['skillTree', accountId],
    queryFn: () => accountApi.skillTree(accountId!),
    enabled: !!accountId,
  });

  const charQuery = useQuery({
    queryKey: ['character', accountId],
    queryFn: () => accountApi.character(accountId!),
    enabled: !!accountId,
  });

  const loading = skillQuery.isLoading || charQuery.isLoading;
  const tree = skillQuery.data?.data?.data || skillQuery.data?.data || null;
  const char = charQuery.data?.data?.data || charQuery.data?.data || {};

  if (loading) return <Spin style={{ display: 'block', margin: '40vh auto' }} />;
  if (!tree) return <Typography.Text type="secondary">暂无技能树数据</Typography.Text>;

  const nodes = tree.skillTree || [];
  const className = tree.className || char.className || '未转职';
  const classIcon = tree.classIcon || char.classIcon || '';
  const awakened = char.class_awakened === 1;
  const sp = char.skill_points ?? 0;
  const totalSp = char.total_sp_earned ?? 0;

  // Build node lookup for prereq names
  const nodeMap: Record<string, any> = {};
  for (const node of nodes) nodeMap[node.id] = node;

  // Group by tier
  const tiers: Record<number, any[]> = {};
  for (const node of nodes) {
    const t = node.tier || 1;
    if (!tiers[t]) tiers[t] = [];
    tiers[t].push(node);
  }

  const TYPE_LABELS: Record<string, string> = { passive: '被动', active: '主动', buff: '光环' };

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <Typography.Text style={{ fontSize: 28, fontWeight: 700, fontFamily: 'var(--font-display)', letterSpacing: '-0.04em' }}>
          {classIcon} {className}
        </Typography.Text>
        <div style={{ marginTop: 8, display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          {awakened && <Tag color="gold">已觉醒</Tag>}
          <Tag>SP {sp} / {totalSp}</Tag>
          {className === '未转职' && <Tag color="orange">未选择职业</Tag>}
        </div>
      </div>

      {/* Skill Tree by Tier */}
      {Object.keys(tiers).sort((a, b) => Number(a) - Number(b)).map((tierKey) => {
        const tierNodes = tiers[Number(tierKey)];
        const colorIdx = (Number(tierKey) - 1) % TIER_COLORS.length;
        const tierColor = TIER_COLORS[colorIdx];
        return (
          <Card
            key={tierKey}
            size="small"
            title={<span style={{ color: tierColor }}>T{tierKey}</span>}
            style={{ marginBottom: 12 }}
          >
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {tierNodes.map((node: any) => {
                const active = node.currentLevel > 0;
                const isMaxed = node.currentLevel >= node.maxLevel;
                return (
                  <Card
                    key={node.id}
                    size="small"
                    style={{
                      width: 260,
                      opacity: active ? 1 : 0.55,
                      borderColor: active ? tierColor : undefined,
                      background: active ? `rgba(${parseInt(tierColor.slice(1,3),16)},${parseInt(tierColor.slice(3,5),16)},${parseInt(tierColor.slice(5,7),16)},0.04)` : undefined,
                    }}
                    bodyStyle={{ padding: '10px 12px' }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                      <span style={{ fontWeight: 600, fontSize: 13 }}>
                        {node.name}
                        {node.isTeamSkill && <Tag style={{ fontSize: 9, marginLeft: 4 }} color="purple">团队</Tag>}
                      </span>
                      <Tag color={isMaxed ? 'green' : active ? 'blue' : 'default'} style={{ fontSize: 11 }}>
                        Lv.{node.currentLevel}/{node.maxLevel}
                      </Tag>
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 4 }}>
                      {node.type && <span style={{ marginRight: 8 }}>{TYPE_LABELS[node.type] || node.type}</span>}
                      {node.spCost > 0 && <span style={{ marginRight: 8 }}>SP {node.spCost}</span>}
                      {node.reqLevel > 0 && <span>需 Lv.{node.reqLevel}</span>}
                      {node.requireAwakening && <Tag color="gold" style={{ fontSize: 9, marginLeft: 4 }}>觉醒</Tag>}
                    </div>
                    <Progress
                      percent={node.maxLevel > 0 ? (node.currentLevel / node.maxLevel) * 100 : 0}
                      size="small" showInfo={false}
                      strokeColor={isMaxed ? '#52c41a' : tierColor}
                    />
                    {node.prereqs?.length > 0 && (
                      <div style={{ fontSize: 10, color: 'var(--text-tertiary)', marginTop: 4 }}>
                        前置: {node.prereqs.map((p: any) => `${nodeMap[p.skillId || p.id]?.name || p.skillId || p.id} Lv.${p.level || 0}`).join(', ')}
                      </div>
                    )}
                    <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 4 }}>
                      {node.descCurrent || ''}
                    </div>
                    {node.descNext && (
                      <div style={{ fontSize: 10, color: 'var(--text-tertiary)', marginTop: 2 }}>
                        下一级: {node.descNext}
                      </div>
                    )}
                  </Card>
                );
              })}
            </div>
          </Card>
        );
      })}

      {nodes.length === 0 && <Empty description="暂未学习技能" />}
    </div>
  );
}

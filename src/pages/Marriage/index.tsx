import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Card, Row, Col, Spin, Typography, Statistic, Tag, Progress, Select, Button, message, Empty } from 'antd';
import { HeartOutlined, HeartFilled, SendOutlined, TrophyOutlined, UserOutlined, ThunderboltOutlined, SafetyOutlined } from '@ant-design/icons';
import { accountApi, configApi } from '../../api/client';
import { useAccount } from '../../store/useAccount';

const MARRIAGE_SKILL_DESC: Record<string, string> = {
  '情比金坚': '受攻击时 5% 概率减伤 20%',
  '神雕侠侣': '攻击时 5% 概率 1.5 倍伤害',
  '生死相随': 'HP ≤ 20% 时恢复 20% HP（需亲密度 2000）',
};

export default function Marriage() {
  const { accountId } = useParams<{ accountId: string }>();
  const accounts = useAccount((s) => s.accounts);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selecting, setSelecting] = useState(false);

  const fetchData = () => {
    if (!accountId) return;
    setLoading(true);
    accountApi.refreshMarriage(accountId)
      .then((res: any) => setData(res.data?.data || res.data || {}))
      .catch(() => accountApi.character(accountId).then((res: any) => setData(res.data?.data || res.data || {})))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchData(); }, [accountId]);

  const handleBindPartner = async (partnerId: string) => {
    if (!accountId) return;
    setSelecting(true);
    try {
      await configApi.update({ account_id: accountId, key: 'marriage_partner', value: partnerId });
      message.success('伴侣目标已绑定');
      fetchData();
    } catch {
      message.error('绑定失败');
    } finally {
      setSelecting(false);
    }
  };

  if (loading) return <Spin size="large" style={{ display: 'block', margin: '120px auto' }} />;
  if (!data) return <Typography.Text type="secondary">暂无数据</Typography.Text>;

  const married = data.married || (data.marriage_hp_applied > 0) || (data.bonus_marriage_hp > 0);
  const curAccount = accounts.find((a: any) => a.id === accountId);

  return (
    <div style={{ padding: '24px 0 48px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <Typography.Text style={{ fontSize: 28, fontWeight: 700, fontFamily: 'var(--font-display)', letterSpacing: '-0.024em' }}>
            婚姻
          </Typography.Text>
          {curAccount && (
            <div style={{ fontSize: 14, color: 'var(--text-secondary)', marginTop: 4 }}>
              {curAccount.name} · Lv.{curAccount.level}
            </div>
          )}
        </div>
        <Tag style={{
          borderRadius: 100, fontSize: 12, fontWeight: 500, padding: '2px 12px',
          background: married ? 'rgba(255,59,48,0.08)' : 'var(--accent-subtle)',
          color: married ? 'var(--red)' : 'var(--accent)',
          border: 'none',
        }}>
          {married ? '已婚' : '未婚'}
        </Tag>
      </div>

      {married ? (
        <>
          {/* Partner Card */}
          <Card size="small" style={{ marginBottom: 16, borderRadius: 'var(--radius-lg)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{
                width: 56, height: 56, borderRadius: '50%',
                background: 'linear-gradient(135deg, #ff4d4f, #ff7875)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 28, color: '#fff',
              }}>
                <HeartFilled />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 18, fontWeight: 600, fontFamily: 'var(--font-display)' }}>
                  {data.partnerName || '伴侣'}
                </div>
                <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 2 }}>
                  亲密度 {data.intimacy || 0}
                  <span style={{ marginLeft: 12, color: data.intimacy >= 2000 ? 'var(--green)' : 'var(--orange)' }}>
                    {data.intimacy >= 2000 ? '● 已解锁全部技能' : '○ ' + (2000 - (data.intimacy || 0)) + ' 到生死相随'}
                  </span>
                </div>
                <Progress
                  percent={Math.min(100, Math.round((data.intimacy || 0) / 2000 * 100))}
                  size="small"
                  strokeColor={data.intimacy >= 2000 ? '#34c759' : '#ff4d4f'}
                  style={{ marginTop: 8, marginBottom: 0 }}
                />
              </div>
            </div>
          </Card>

          {/* Stats */}
          <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
            <Col span={8}>
              <Card size="small" style={{ textAlign: 'center' }}>
                <Statistic title="今日送花" value={data.todayGiftSent || 0} suffix="/ 5"
                  valueStyle={{ fontSize: 22, fontWeight: 600, fontFamily: 'var(--font-display)' }} />
              </Card>
            </Col>
            <Col span={8}>
              <Card size="small" style={{ textAlign: 'center' }}>
                <Statistic title="夫妻 BOSS" value={data.todayBossDone ? '已完成' : '未打'}
                  valueStyle={{ fontSize: 18, fontWeight: 600, color: data.todayBossDone ? 'var(--green)' : 'var(--orange)', fontFamily: 'var(--font-display)' }} />
              </Card>
            </Col>
            <Col span={8}>
              <Card size="small" style={{ textAlign: 'center' }}>
                <Statistic title="HP 加成" value={`+${(data.marriage_hp || 0) + (data.marriage_hp_applied || 0)}`}
                  valueStyle={{ fontSize: 22, fontWeight: 600, fontFamily: 'var(--font-display)', color: 'var(--red)' }} />
              </Card>
            </Col>
          </Row>

          {/* Marriage Skills */}
          {data.marriage_skills?.length > 0 && (
            <Card size="small" title={<span style={{ fontFamily: 'var(--font-display)', fontWeight: 600 }}>婚姻技能</span>}
              style={{ marginBottom: 16, borderRadius: 'var(--radius-lg)' }}>
              {data.marriage_skills.map((s: any) => (
                <div key={s.name} style={{ display: 'flex', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--border-subtle)' }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: 'var(--radius-sm)', background: 'rgba(255,59,48,0.1)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', marginRight: 12, flexShrink: 0,
                    color: 'var(--red)', fontSize: 13,
                  }}>
                    <ThunderboltOutlined />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 500, fontFamily: 'var(--font-display)' }}>
                      {s.name} Lv.{s.level}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
                      {MARRIAGE_SKILL_DESC[s.name] || '婚姻专属战斗技能'}
                    </div>
                  </div>
                </div>
              ))}
            </Card>
          )}

          {/* All bonuses */}
          <Card size="small" title={<span style={{ fontFamily: 'var(--font-display)', fontWeight: 600 }}>属性加成总览</span>}
            style={{ borderRadius: 'var(--radius-lg)' }}>
            <Row gutter={[12, 12]}>
              <Col span={8}>
                <Statistic title={<span><HeartOutlined style={{ color: '#ff4d4f' }} /> 婚姻</span>}
                  value={`+${(data.marriage_hp || 0) + (data.marriage_hp_applied || 0)} HP / +${data.marriage_atk || 0} ATK`}
                  valueStyle={{ fontSize: 14, fontWeight: 500 }} />
              </Col>
              <Col span={8}>
                <Statistic title={<span><UserOutlined /> 师徒</span>}
                  value={`+${data.disciple_hp || 0} HP`}
                  valueStyle={{ fontSize: 14, fontWeight: 500 }} />
              </Col>
              <Col span={8}>
                <Statistic title={<span><SafetyOutlined /> 帮派</span>}
                  value={`+${data.gang_hp || 0} HP / +${data.gang_atk || 0} ATK`}
                  valueStyle={{ fontSize: 14, fontWeight: 500 }} />
              </Col>
            </Row>
          </Card>
        </>
      ) : (
        <>
          {/* Unmarried: Partner Selector */}
          <Card size="small" style={{ marginBottom: 16, borderRadius: 'var(--radius-lg)' }}>
            <div style={{ fontSize: 15, fontWeight: 600, fontFamily: 'var(--font-display)', marginBottom: 12 }}>
              选择追求目标
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16 }}>
              选择一个托管账号作为婚姻伴侣目标，引擎将自动送花、求婚。
            </div>

            <Select
              showSearch
              placeholder="选择目标伴侣账号"
              style={{ width: '100%' }}
              value={data.target_partner_id || undefined}
              onChange={handleBindPartner}
              loading={selecting}
              optionFilterProp="label"
              filterOption={(input, option) =>
                (option?.label as string || '').includes(input) ||
                (option?.searchText as string || '').includes(input)
              }
              options={accounts
                .filter((a: any) => a.id !== accountId)
                .map((a: any) => ({
                  value: a.id,
                  label: `${a.name} Lv.${a.level}`,
                  searchText: a.id,
                }))}
            />

            {data.target_partner_id && (
              <div style={{ marginTop: 12, fontSize: 13, color: 'var(--text-secondary)' }}>
                已绑定目标，引擎将自动向该角色送花（每日 10 次），亲密度达 100 后自动求婚。
              </div>
            )}
          </Card>

          {/* Intimacy Progress */}
          {data.target_partner_id && (
            <Card size="small" style={{ borderRadius: 'var(--radius-lg)' }}>
              <div style={{ fontSize: 14, fontWeight: 600, fontFamily: 'var(--font-display)', marginBottom: 8 }}>
                亲密度进度
              </div>
              {data.intimacy > 0 ? (
                <>
                  <Progress
                    percent={Math.min(100, Math.round((data.intimacy || 0) / 100 * 100))}
                    strokeColor="#ff4d4f"
                    format={() => `${data.intimacy || 0} / 100`}
                    style={{ marginBottom: 8 }}
                  />
                  <div style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
                    亲密度达 100 后自动求婚
                  </div>
                </>
              ) : (
                <Empty description="尚未开始送花" image={Empty.PRESENTED_IMAGE_SIMPLE} style={{ margin: '8px 0' }} />
              )}
            </Card>
          )}
        </>
      )}
    </div>
  );
}

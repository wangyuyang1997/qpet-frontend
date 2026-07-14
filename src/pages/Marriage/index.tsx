import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Card, Row, Col, Tag, Spin, Typography, Statistic, Descriptions, Empty, Progress } from 'antd';
import { HeartOutlined } from '@ant-design/icons';
import { accountApi } from '../../api/client';

export default function Marriage() {
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

  const marriage = char.marriage_info || {};
  const isMarried = marriage.married || false;

  return (
    <div>
      <Typography.Text style={{ fontSize: 28, fontWeight: 700, fontFamily: 'var(--font-display)', letterSpacing: '-0.04em', display: 'block', marginBottom: 20 }}>
        婚姻
      </Typography.Text>

      {isMarried ? (
        /* Married state */
        <Card size="small">
          <div style={{ marginBottom: 16 }}>
            <HeartOutlined style={{ color: '#ff4d4f', fontSize: 20, marginRight: 8 }} />
            <Typography.Text strong style={{ fontSize: 18 }}>{marriage.partner || '配偶'}</Typography.Text>
            <Tag style={{ marginLeft: 8 }}>{marriage.partnerLevel ? `Lv.${marriage.partnerLevel}` : ''} {marriage.partnerClass || ''}</Tag>
          </div>
          <Row gutter={[16, 16]}>
            <Col span={6}>
              <Statistic title="亲密度" value={marriage.intimacy || 0} suffix="/ 2000" />
              <Progress percent={Math.min(100, ((marriage.intimacy || 0) / 2000) * 100)} size="small" showInfo={false} style={{ marginTop: 4 }} />
            </Col>
            <Col span={6}><Statistic title="送花" value={`${marriage.today_gift_sent || 0}/5`} /></Col>
            <Col span={6}><Statistic title="BOSS" value={marriage.today_boss_done ? '✅' : '未打'} /></Col>
            <Col span={6}><Statistic title="属性加成" value={`+${marriage.hp_bonus || 0} 生命`} /></Col>
          </Row>
          {marriage.skills && marriage.skills.length > 0 && (
            <div style={{ marginTop: 16 }}>
              <Typography.Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 8 }}>婚姻技能</Typography.Text>
              {marriage.skills.map((s: any, i: number) => (
                <Tag key={i} color="pink" style={{ marginBottom: 4 }}>{s.name}: {s.effect}</Tag>
              ))}
            </div>
          )}
        </Card>
      ) : (
        /* Unmarried state */
        <Card size="small">
          <Empty description="未婚" style={{ margin: '20px 0' }} />
          {marriage.partner ? (
            <div style={{ marginTop: 16 }}>
              <Typography.Text strong style={{ fontSize: 14 }}>目标: {marriage.partner}</Typography.Text>
              <Tag style={{ marginLeft: 8 }}>{marriage.partnerLevel ? `Lv.${marriage.partnerLevel}` : ''}</Tag>
              <Row gutter={[16, 16]} style={{ marginTop: 12 }}>
                <Col span={8}>
                  <Statistic title="今日送花" value={`${marriage.today_gift_sent || 0}/10`} />
                </Col>
                <Col span={8}>
                  <Statistic title="亲密度" value={`${marriage.intimacy || 0}/100`} />
                  <Progress percent={Math.min(100, ((marriage.intimacy || 0) / 100) * 100)} size="small" showInfo={false} />
                </Col>
              </Row>
              <div style={{ marginTop: 8, fontSize: 12, color: 'var(--text-tertiary)' }}>
                亲密度≥100 后自动求婚
              </div>
            </div>
          ) : (
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              未绑定求婚对象。在「角色管理」页右键角色标签可绑定。
            </Typography.Text>
          )}
        </Card>
      )}
    </div>
  );
}

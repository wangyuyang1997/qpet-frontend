import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Card, Row, Col, Tag, Spin, Typography, Statistic, Empty } from 'antd';
import { HeartOutlined } from '@ant-design/icons';
import { accountApi } from '../../api/client';

export default function Marriage() {
  const { accountId } = useParams<{ accountId: string }>();
  const [char, setChar] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!accountId) return;
    accountApi.character(accountId)
      .then((res: any) => setChar(res.data?.data || res.data || {}))
      .finally(() => setLoading(false));
  }, [accountId]);

  if (loading) return <Spin size="large" style={{ display: 'block', margin: '120px auto' }} />;
  if (!char) return <Typography.Text type="secondary">暂无数据</Typography.Text>;

  const hasMarriage = (char.marriage_hp_applied > 0) || (char.bonus_marriage_hp > 0);

  return (
    <div>
      <Typography.Text style={{ fontSize: 28, fontWeight: 700, fontFamily: 'var(--font-display)', letterSpacing: '-0.04em', display: 'block', marginBottom: 20 }}>
        婚姻
      </Typography.Text>

      <Card size="small">
        {hasMarriage ? (
          <>
            <div style={{ marginBottom: 16 }}>
              <HeartOutlined style={{ color: '#ff4d4f', fontSize: 20, marginRight: 8 }} />
              <Typography.Text strong style={{ fontSize: 18 }}>已结婚</Typography.Text>
            </div>
            <Row gutter={[16, 16]}>
              <Col span={8}>
                <Statistic title="婚姻血量加成" value={`+${char.bonus_marriage_hp || 0}`} suffix="HP" />
              </Col>
              <Col span={8}>
                <Statistic title="婚姻攻击加成" value={`+${char.bonus_marriage_atk || 0}`} suffix="ATK" />
              </Col>
              <Col span={8}>
                <Statistic title="生效HP" value={`+${char.marriage_hp_applied || 0}`} suffix="HP" />
              </Col>
            </Row>
            <Typography.Text type="secondary" style={{ fontSize: 12, display: 'block', marginTop: 16 }}>
              详细婚姻信息（伴侣、亲密度、戒指等）需要单独接口支持
            </Typography.Text>
          </>
        ) : (
          <Empty description="未婚" style={{ margin: '20px 0' }} />
        )}
      </Card>
    </div>
  );
}

import { Card, Typography, Empty } from 'antd';
import { AimOutlined } from '@ant-design/icons';

export default function Strategies() {
  return (
    <div>
      <Typography.Title level={2} style={{ marginBottom: 24 }}>
        <AimOutlined style={{ marginRight: 10, color: 'var(--accent)' }} />
        策略管理
      </Typography.Title>
      <Card>
        <Empty description="策略管理功能开发中" />
      </Card>
    </div>
  );
}

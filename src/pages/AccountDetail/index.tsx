import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Card, Descriptions, Table, Tag, Spin, Tabs, Button, Space, message, Typography } from 'antd';
import { PlayCircleOutlined, SyncOutlined, KeyOutlined, HeartOutlined } from '@ant-design/icons';
import { accountApi } from '../../api/client';

export default function AccountDetail() {
  const { id } = useParams<{ id: string }>();
  const [char, setChar] = useState<any>(null);
  const [farm, setFarm] = useState<any>(null);
  const [sso, setSso] = useState<any>(null);
  const [marriage, setMarriage] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState('');

  useEffect(() => {
    if (!id) return;
    Promise.all([accountApi.character(id), accountApi.farm(id), accountApi.ssoData(id).catch(() => ({ data: null }))])
      .then(([c, f, s]) => { setChar(c.data); setFarm(f.data); setSso(s.data); })
      .finally(() => setLoading(false));
  }, [id]);

  const doAction = async (action: string) => {
    if (!id) return;
    setActionLoading(action);
    try { await accountApi.action(id, action); message.success(`${action} 已触发`); } catch { message.error('操作失败'); }
    setActionLoading('');
  };

  if (loading) return <Spin size="large" style={{ display: 'block', margin: '120px auto' }} />;
  if (!char) return <Typography.Text type="secondary">加载失败</Typography.Text>;

  const ACTIONS = [
    { key: 'cycle', label: '主循环', icon: <SyncOutlined /> },
    { key: 'fight', label: '战斗', icon: <PlayCircleOutlined /> },
    { key: 'farm', label: '农场', icon: <PlayCircleOutlined /> },
    { key: 'checkin', label: '签到', icon: <PlayCircleOutlined /> },
    { key: 'auction', label: '拍卖快照', icon: <PlayCircleOutlined /> },
    { key: 'buy-auction', label: '拍卖购买', icon: <PlayCircleOutlined /> },
    { key: 'equip-all', label: '一键装备', icon: <PlayCircleOutlined /> },
  ];

  const cell = (v: any) => v ?? '-';

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 4 }}>
          <Typography.Text style={{ fontFamily: 'var(--font-display)', fontSize: 32, fontWeight: 700, letterSpacing: '-0.04em' }}>
            {char.nickname || id?.slice(0, 8)}
          </Typography.Text>
          <Tag style={{ fontSize: 13, fontWeight: 500 }}>Lv.{char.level}</Tag>
          <Tag style={{ fontSize: 13, fontWeight: 500, background: 'var(--accent-subtle)', color: 'var(--accent)', border: 'none' }}>{char.class_name || '无职业'}</Tag>
        </div>
        <Typography.Text style={{ fontSize: 14, color: 'var(--text-secondary)' }}>
          战力 {char.combat_power?.toLocaleString() || 0}
        </Typography.Text>
      </div>

      <Tabs defaultActiveKey="character">
        <Tabs.TabPane tab="角色" key="character">
          <Descriptions bordered size="small" column={3} style={{ marginBottom: 24 }}>
            <Descriptions.Item label="昵称">{cell(char.nickname)}</Descriptions.Item>
            <Descriptions.Item label="等级">{char.level}</Descriptions.Item>
            <Descriptions.Item label="职业">{cell(char.class_name)}</Descriptions.Item>
            <Descriptions.Item label="战力">{char.combat_power?.toLocaleString()}</Descriptions.Item>
            <Descriptions.Item label="PVP">{char.pvp_stats ? `${char.pvp_stats.wins || 0}W / ${char.pvp_stats.total || 0}T` : '-'}</Descriptions.Item>
            <Descriptions.Item label="称号">{char.equipped_title?.name || '-'}</Descriptions.Item>
          </Descriptions>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
            <div style={{ borderRadius: 'var(--radius-lg)', background: 'var(--bg-card)', backdropFilter: 'var(--blur-glass)', WebkitBackdropFilter: 'var(--blur-glass)', boxShadow: 'var(--shadow-sm)', padding: '16px 20px' }}>
              <Typography.Text strong style={{ fontSize: 14, display: 'block', marginBottom: 12 }}>装备</Typography.Text>
              <Table rowKey="slot" dataSource={char.equipment || []} pagination={false} size="small" showHeader={false}
                columns={[
                  { dataIndex: 'slot', width: 60, render: (v: string) => <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>{v}</span> },
                  { dataIndex: 'name' },
                  { dataIndex: 'score', width: 60, render: (v: number) => <span style={{ fontWeight: 600 }}>{v}</span> },
                ]}
              />
            </div>
            <div style={{ borderRadius: 'var(--radius-lg)', background: 'var(--bg-card)', backdropFilter: 'var(--blur-glass)', WebkitBackdropFilter: 'var(--blur-glass)', boxShadow: 'var(--shadow-sm)', padding: '16px 20px' }}>
              <Typography.Text strong style={{ fontSize: 14, display: 'block', marginBottom: 12 }}>武器</Typography.Text>
              <Table rowKey="id" dataSource={char.weapons || []} pagination={false} size="small" showHeader={false}
                columns={[
                  { dataIndex: 'name' },
                  { dataIndex: 'type', width: 80, render: (v: string) => <Tag>{v}</Tag> },
                ]}
              />
            </div>
          </div>

          <div style={{ borderRadius: 'var(--radius-lg)', background: 'var(--bg-card)', backdropFilter: 'var(--blur-glass)', WebkitBackdropFilter: 'var(--blur-glass)', boxShadow: 'var(--shadow-sm)', padding: '16px 20px' }}>
            <Typography.Text strong style={{ fontSize: 14, display: 'block', marginBottom: 12 }}>技能</Typography.Text>
            <Table rowKey="name" dataSource={char.skills || []} pagination={false} size="small" showHeader={false}
              columns={[
                { dataIndex: 'name', render: (v: string) => <span style={{ fontWeight: 500 }}>{v}</span> },
                { dataIndex: 'level', width: 60 },
                { dataIndex: 'type', width: 80, render: (v: string) => <Tag style={{ borderRadius: 100 }}>{v}</Tag> },
              ]}
            />
          </div>
        </Tabs.TabPane>

        <Tabs.TabPane tab="农场" key="farm">
          {farm ? (
            <>
              <Descriptions bordered size="small" column={3} style={{ marginBottom: 24 }}>
                <Descriptions.Item label="已解锁">{farm.unlocked_slots} 块</Descriptions.Item>
                <Descriptions.Item label="VIP 地块">{farm.vip_slot_index >= 0 ? `#${farm.vip_slot_index}` : '无'}</Descriptions.Item>
                <Descriptions.Item label="今日经验">{farm.today_harvest_exp}</Descriptions.Item>
                <Descriptions.Item label="农场等级">{farm.level}</Descriptions.Item>
                <Descriptions.Item label="经验">{farm.experience}</Descriptions.Item>
                <Descriptions.Item label="会员">{farm.is_premium ? <Tag color="gold">VIP</Tag> : <span>否</span>}</Descriptions.Item>
              </Descriptions>
              <div style={{ borderRadius: 'var(--radius-lg)', background: 'var(--bg-card)', backdropFilter: 'var(--blur-glass)', WebkitBackdropFilter: 'var(--blur-glass)', boxShadow: 'var(--shadow-sm)', padding: '16px 20px' }}>
                <Typography.Text strong style={{ fontSize: 14, display: 'block', marginBottom: 12 }}>地块</Typography.Text>
                <Table rowKey="slotIndex" dataSource={farm.slots || []} pagination={false} size="small" showHeader={false}
                  columns={[
                    { dataIndex: 'slotIndex', width: 40, render: (v: number) => <span style={{ color: 'var(--text-tertiary)', fontSize: 12 }}>#{v}</span> },
                    { dataIndex: 'cropName', render: (v: string) => v || <span style={{ color: 'var(--text-tertiary)' }}>空地</span> },
                    { dataIndex: 'state', width: 80, render: (v: string) => {
                      const m: Record<string, string> = { growing: '生长中', ripe: '已成熟', withered: '已枯萎', empty: '空地' };
                      return <span style={{ fontSize: 12, color: v === 'ripe' ? 'var(--green)' : v === 'withered' ? 'var(--red)' : 'var(--text-tertiary))' }}>{m[v] || v}</span>;
                    }},
                  ]}
                />
              </div>
            </>
          ) : <Typography.Text type="secondary">暂无农场数据</Typography.Text>}
        </Tabs.TabPane>

        <Tabs.TabPane tab="操作" key="actions">
          <div style={{ borderRadius: 'var(--radius-lg)', background: 'var(--bg-card)', backdropFilter: 'var(--blur-glass)', WebkitBackdropFilter: 'var(--blur-glass)', boxShadow: 'var(--shadow-sm)', padding: '24px' }}>
            {sso && (
              <div style={{ marginBottom: 24 }}>
                <Typography.Text strong style={{ fontSize: 14, display: 'block', marginBottom: 8 }}>SSO 单点登录</Typography.Text>
                <Space>
                  <Typography.Text code style={{ fontSize: 12 }}>{sso.token?.slice(0, 50)}...</Typography.Text>
                  <Button size="small" icon={<KeyOutlined />} onClick={() => {
                    const url = `https://api.duanwuqiufenmao.top/sso?token=${encodeURIComponent(sso.token)}`;
                    navigator.clipboard.writeText(url).then(() => message.success('已复制'));
                  }}>复制链接</Button>
                </Space>
              </div>
            )}
            <Typography.Text strong style={{ fontSize: 14, display: 'block', marginBottom: 12 }}>手动触发</Typography.Text>
            <Space wrap size={8}>
              {ACTIONS.map((btn) => (
                <Button key={btn.key} icon={btn.icon} loading={actionLoading === btn.key} onClick={() => doAction(btn.key)}>{btn.label}</Button>
              ))}
            </Space>
          </div>
        </Tabs.TabPane>
      </Tabs>
    </div>
  );
}

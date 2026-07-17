import { useEffect, useState } from 'react';
import { Switch, Spin, message, Typography, Card, Row, Col } from 'antd';
import { ThunderboltOutlined, ExperimentOutlined, TeamOutlined, HeartOutlined, ShopOutlined, SettingOutlined } from '@ant-design/icons';
import { configApi } from '../../api/client';
import { useAccount } from '../../store/useAccount';
import { useParams, useNavigate } from 'react-router-dom';

// 模块分组定义
const MODULES: { key: string; label: string; icon: React.ReactNode; keys: string[] }[] = [
  {
    key: 'battle', label: '乐斗', icon: <ThunderboltOutlined />,
    keys: ['auto_npc_fight', 'auto_tower', 'tower_use_revive', 'auto_world_boss', 'auto_tournament', 'exp_boost_enabled'],
  },
  {
    key: 'farm', label: '农场', icon: <ExperimentOutlined />,
    keys: ['auto_ad_farm'],
  },
  {
    key: 'gang', label: '帮派', icon: <TeamOutlined />,
    keys: ['auto_gang_boss'],
  },
  {
    key: 'social', label: '社交', icon: <HeartOutlined />,
    keys: ['auto_marriage_boss', 'auto_marriage_gift', 'auto_marriage_flowers', 'auto_marriage_proposal', 'auto_friend_sync'],
  },
  {
    key: 'supply', label: '商店补给', icon: <ShopOutlined />,
    keys: ['auto_shop_challenge_book', 'auto_shop_stamina', 'supply_beads', 'supply_challenge_book', 'supply_flowers', 'supply_revive'],
  },
  {
    key: 'system', label: '系统', icon: <SettingOutlined />,
    keys: ['auto_checkin', 'auto_ad_community', 'auto_ad_stamina', 'auto_chest', 'auto_class_upgrade', 'auto_equip', 'auto_upgrade'],
  },
];

export default function Config() {
  const { accountId } = useParams<{ accountId: string }>();
  const navigate = useNavigate();
  const selectedAccount = useAccount((s) => s.selectedAccountId);
  const accounts = useAccount((s) => s.accounts);
  const selected = accountId || selectedAccount;

  useEffect(() => {
    if (!accountId && selectedAccount) {
      navigate(`/config/${selectedAccount}`, { replace: true });
    }
  }, [accountId, selectedAccount]);

  const [configs, setConfigs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { setLoading(false); }, []);

  useEffect(() => {
    if (!selected) return;
    configApi.get(selected).then((r) => setConfigs(r.data.data || r.data || []));
  }, [selected]);

  const handleToggle = async (key: string, value: string) => {
    if (!selected) return;
    const nv = value === 'true' ? 'false' : 'true';
    await configApi.update({ account_id: selected, key, value: nv });
    setConfigs((prev) => prev.map((c) => (c.key === key ? { ...c, value: nv } : c)));
    const desc = configs.find((c) => c.key === key)?.description || key;
    message.success(`${desc} → ${nv === 'true' ? '开启' : '关闭'}`);
  };

  if (loading) return <Spin size="large" style={{ display: 'block', margin: '120px auto' }} />;

  const cur = accounts.find((a: any) => a.id === selected);
  const configMap: Record<string, any> = {};
  for (const c of configs) configMap[c.key] = c;

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <Typography.Text style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 700 }}>
          自动化配置
        </Typography.Text>
        {cur && (
          <Typography.Text style={{ fontSize: 14, color: 'var(--text-secondary)' }}>
            {cur.name} · Lv.{cur.level} · {cur.running ? '🟢 运行中' : '⚪ 已停止'}
          </Typography.Text>
        )}
      </div>

      {selected ? (
        <Row gutter={[16, 16]}>
          {MODULES.map((mod) => {
            const items = mod.keys.map((k) => configMap[k]).filter(Boolean);
            if (items.length === 0) return null;
            return (
              <Col key={mod.key} xs={24} sm={12} md={12} lg={8} xl={6}>
                <Card size="small" title={<span>{mod.icon} {mod.label}</span>}
                  style={{ borderRadius: 'var(--radius-lg)', background: 'var(--bg-card)', boxShadow: 'var(--shadow-sm)' }}>
                  {items.map((c: any) => (
                    <div key={c.key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0' }}>
                      <span style={{ fontSize: 13, color: 'var(--text-secondary)', flex: 1 }}>{c.description}</span>
                      <Switch size="small" checked={c.value === 'true'} onChange={() => handleToggle(c.key, c.value)} />
                    </div>
                  ))}
                </Card>
              </Col>
            );
          })}
        </Row>
      ) : (
        <Typography.Text type="secondary">请在顶部选择一个角色</Typography.Text>
      )}
    </div>
  );
}

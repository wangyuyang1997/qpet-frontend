import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Card, Row, Col, Tag, Spin, Typography, Statistic, Progress, Empty } from 'antd';
import { HeartOutlined, ThunderboltOutlined, ExperimentOutlined } from '@ant-design/icons';
import { accountApi } from '../../api/client';

const EQUIP_SLOTS = ['head', 'armor', 'wrist', 'belt', 'shoes', 'necklace', 'title', 'outfit'];
const SLOT_LABELS: Record<string, string> = { head: '头饰', armor: '护甲', wrist: '护腕', belt: '腰带', shoes: '鞋子', necklace: '项链', title: '称号', outfit: '时装' };

export default function Battle() {
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

  const eq = char.equipment || [];
  const skills = char.skills || [];
  const weapons = char.weapons || [];
  const setBonuses = char.set_bonuses || [];
  const attr = char.attributes || {};
  const pvp = char.pvp_stats || {};
  const pve = char.pve_stats || {};

  const hpBonus = (char.marriage_hp || 0) + (char.gang_hp || 0) + (char.title_hp || 0);

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 20, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <Typography.Text style={{ fontSize: 28, fontWeight: 700, fontFamily: 'var(--font-display)', letterSpacing: '-0.04em' }}>
          {char.nickname || accountId?.slice(0, 8)}
        </Typography.Text>
        <Tag style={{ fontSize: 14, fontWeight: 600 }}>Lv.{char.level}</Tag>
        <Tag color="gold" style={{ fontSize: 14, fontWeight: 500 }}>{char.class_name || '无职业'}</Tag>
        <Tag color="purple" style={{ fontSize: 13 }}>战力 {char.combat_power?.toLocaleString() || 0}</Tag>
        <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#52c41a', display: 'inline-block' }} />
        <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>
          <HeartOutlined /> {char.hp || 0}
          {hpBonus > 0 && <span style={{ color: 'var(--green)' }}>(+{hpBonus}💍🏯)</span>}
          {' '}<ThunderboltOutlined /> {char.stamina || 0}/{char.maxStamina || 100}
          {char.exp_boost_charges > 0 && <span> ×{char.exp_boost_rate || 1.5}({char.exp_boost_charges}次)</span>}
          {char.bead_count > 0 && <span> 💎{char.bead_count}精魄</span>}
        </div>
      </div>

      {/* Attributes */}
      <Card size="small" title="属性" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 24px', fontSize: 13 }}>
          {attr.str !== undefined && <span>力{attr.str}{attr.str_bonus > 0 && <span style={{ color: '#52c41a' }}>(+{attr.str_bonus})</span>}</span>}
          {attr.agi !== undefined && <span>敏{attr.agi}{attr.agi_bonus > 0 && <span style={{ color: '#52c41a' }}>(+{attr.agi_bonus})</span>}</span>}
          {attr.spd !== undefined && <span>速{attr.spd}{attr.spd_bonus > 0 && <span style={{ color: '#52c41a' }}>(+{attr.spd_bonus})</span>}</span>}
          {attr.weapon_dmg !== undefined && <span>武伤+{(attr.weapon_dmg * 100).toFixed(1)}%</span>}
          {attr.dmg !== undefined && <span>伤害+{(attr.dmg * 100).toFixed(1)}%</span>}
          {attr.crit !== undefined && <span>暴击+{(attr.crit * 100).toFixed(1)}%</span>}
          {attr.combo !== undefined && <span>连击+{(attr.combo * 100).toFixed(1)}%</span>}
          {attr.lifesteal !== undefined && <span>吸血+{(attr.lifesteal * 100).toFixed(0)}%</span>}
          {attr.skill_dmg !== undefined && <span>技伤+{(attr.skill_dmg * 100).toFixed(0)}%</span>}
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 24px', fontSize: 13, marginTop: 4 }}>
          {attr.dmg_reduce !== undefined && <span>减伤+{(attr.dmg_reduce * 100).toFixed(1)}%</span>}
          {attr.dodge !== undefined && <span>闪避+{(attr.dodge * 100).toFixed(1)}%</span>}
          {attr.block !== undefined && <span>格挡+{(attr.block * 100).toFixed(1)}%</span>}
          {attr.hp_bonus !== undefined && <span>生命+{(attr.hp_bonus * 100).toFixed(0)}%</span>}
          {attr.tenacity !== undefined && <span>不屈+{(attr.tenacity * 100).toFixed(0)}%</span>}
        </div>
      </Card>

      {/* Equipment 8-slot */}
      <Card size="small" title="装备" style={{ marginBottom: 16 }}>
        <Row gutter={[8, 8]}>
          {EQUIP_SLOTS.map(slot => {
            const item = eq.find((e: any) => e.slot === slot);
            return (
              <Col key={slot} xs={12} sm={6} md={6} lg={3}>
                <Card size="small"
                  style={{ opacity: item ? 1 : 0.3, minHeight: 120 }}
                  bodyStyle={{ padding: '8px 10px' }}>
                  <div style={{ fontSize: 10, color: 'var(--text-tertiary)', marginBottom: 2 }}>{SLOT_LABELS[slot]}</div>
                  {item ? (
                    <>
                      <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 2 }}>{item.name}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                        {item.enhance_level > 0 && <Tag style={{ fontSize: 10, marginRight: 2 }}>+{item.enhance_level}</Tag>}
                        {item.armor_type && <Tag style={{ fontSize: 10, marginRight: 2 }}>{item.armor_type}</Tag>}
                        <span>Lv.{item.item_level || '?'}</span>
                      </div>
                      <div style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>
                        成长{item.growth_level || 0} 战力{item.score || '-'}
                      </div>
                      {item.class_required && <Tag color="orange" style={{ fontSize: 9, marginTop: 2 }}>{item.class_required}</Tag>}
                    </>
                  ) : (
                    <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>空</div>
                  )}
                </Card>
              </Col>
            );
          })}
        </Row>
        <div style={{ marginTop: 8, fontSize: 12, color: 'var(--text-secondary)' }}>
          锻造石 {(char.forge_stones || 0).toLocaleString()} | 保护券 {char.protection_tickets || 0} | 背包 {char.inventory_count || 0} 件
        </div>
        {setBonuses.length > 0 && (
          <div style={{ marginTop: 4, fontSize: 12 }}>
            套装: {setBonuses.map((s: any, i: number) => (
              <Tag key={i} color="orange" style={{ fontSize: 10 }}>{s.set_name} {s.active}/{s.total}</Tag>
            ))}
          </div>
        )}
      </Card>

      {/* Weapons + Skills side by side */}
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col xs={12}>
          <Card size="small" title="武器">
            {weapons.length === 0 ? <Empty description="暂无" /> : (
              weapons.map((w: any) => (
                <Tag key={w.name} style={{ marginBottom: 4, fontSize: 13 }}>{w.name}{w.level > 0 && <> +{w.level}</>}</Tag>
              ))
            )}
          </Card>
        </Col>
        <Col xs={12}>
          <Card size="small" title="技能">
            {skills.length === 0 ? <Empty description="暂无" /> : (
              skills.map((s: any) => (
                <Tag key={s.name} color="blue" style={{ marginBottom: 4, fontSize: 13 }}>
                  {s.name} Lv.{s.level || 0}
                </Tag>
              ))
            )}
          </Card>
        </Col>
      </Row>

      {/* Today Combat */}
      <Card size="small" title="今日战斗">
        <Row gutter={16}>
          <Col span={6}><Statistic title="快速乐斗" value={pve.npc_fights || 0} suffix="次" /></Col>
          <Col span={6}>
            <Statistic title="斗神塔" value={`${pve.tower_floors || 0}/6`}
              valueStyle={{ fontSize: 16 }} suffix={pve.tower_max ? `(最高${pve.tower_max}层)` : ''} />
          </Col>
          <Col span={6}><Statistic title="帮派BOSS" value={pve.boss_fights || 0} suffix="次" /></Col>
          <Col span={6}><Statistic title="世界BOSS" value={pve.world_boss || 0 ? '✅' : '-'} /></Col>
        </Row>
        <div style={{ marginTop: 8, fontSize: 12, color: 'var(--text-secondary)' }}>
          挑战书: {char.challenge_book_count || 0} | 还魂丹: {char.revive_count || 0}
        </div>
      </Card>
    </div>
  );
}

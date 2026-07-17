import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Card, Row, Col, Tag, Typography, Statistic, Empty } from 'antd';
import { accountApi, dashboardApi } from '../../api/client';

const STAT_LABELS: Record<string, string> = {
  str: '力', agi: '敏', spd: '速', max_hp: '命', maxHp: '命',
  weapon_dmg_pct: '武伤%', crit_pct: '暴%', crit_dmg_pct: '暴伤%',
  dodge_pct: '闪%', hit_pct: '命%', heal_pct: '治疗%',
  combo_pct: '连击%', leech_pct: '吸血%', dmg_red_pct: '减伤%',
  reduction_pct: '减伤%', speed_pct: '速%', max_armor: '甲',
  armor_pct: '甲%', block_pct: '格挡%', con: '体',
  min_dmg: '小伤', max_dmg: '大伤',
  str_attr: '力量', agi_attr: '敏捷', spd_attr: '速度',
};

const EQUIP_SLOTS = ['head', 'armor', 'bracer', 'belt', 'boots', 'necklace', 'title'];
const SLOT_LABELS: Record<string, string> = { head: '头饰', armor: '护甲', bracer: '护腕', belt: '腰带', boots: '鞋子', necklace: '项链', title: '称号' };

const QUALITY_COLORS: Record<string, { bg: string; bar: string; text: string; label: string }> = {
  white:  { bg: 'linear-gradient(135deg, rgba(158,158,158,0.18) 0%, transparent 100%)', bar: '#9e9e9e', text: '#757575', label: '普通' },
  green:  { bg: 'linear-gradient(135deg, rgba(76,175,80,0.18) 0%, transparent 100%)',  bar: '#4caf50', text: '#2e7d32', label: '精良' },
  blue:   { bg: 'linear-gradient(135deg, rgba(33,150,243,0.18) 0%, transparent 100%)', bar: '#2196f3', text: '#1565c0', label: '稀有' },
  purple: { bg: 'linear-gradient(135deg, rgba(156,39,176,0.18) 0%, transparent 100%)',  bar: '#9c27b0', text: '#7b1fa2', label: '史诗' },
  pink:   { bg: 'linear-gradient(135deg, rgba(233,30,99,0.18) 0%, transparent 100%)',  bar: '#e91e63', text: '#c2185b', label: '神器' },
  orange: { bg: 'linear-gradient(135deg, rgba(255,152,0,0.20) 0%, transparent 100%)',  bar: '#ff9800', text: '#e65100', label: '传说' },
  red:    { bg: 'linear-gradient(135deg, rgba(244,67,54,0.18) 0%, transparent 100%)',  bar: '#f44336', text: '#c62828', label: '神话' },
  gold:   { bg: 'linear-gradient(135deg, rgba(255,193,7,0.20) 0%, transparent 100%)',  bar: '#ffc107', text: '#9a7d0a', label: '黄金' },
  epic:   { bg: 'linear-gradient(135deg, rgba(211,47,47,0.20) 0%, transparent 100%)',  bar: '#d32f2f', text: '#b71c1c', label: '史诗' },
  title:  { bg: 'linear-gradient(135deg, rgba(96,125,139,0.15) 0%, transparent 100%)', bar: '#607d8b', text: '#455a64', label: '称号' },
};

export default function Battle() {
  const { accountId } = useParams<{ accountId: string }>();
  const [char, setChar] = useState<any>({});
  const [loading, setLoading] = useState(true);

  const fetchData = () => {
    if (!accountId) return;
    Promise.all([
      accountApi.character(accountId),
      accountApi.equipment(accountId),
      accountApi.inventory(accountId),
      dashboardApi.weekly(accountId),
    ])
      .then(([charRes, eqRes, invRes, weeklyRes]: any[]) => {
        const charData = charRes.data?.data || charRes.data || {};
        const eqData = eqRes?.data?.data || eqRes?.data || null;
        const invData = invRes?.data?.data || invRes?.data || {};
        const weeklyData = weeklyRes?.data?.data || [];
        const today = weeklyData.find((r: any) => r.date === new Date().toISOString().slice(0, 10)) || {};
        const items = invData?.items || [];
        const forgeStones = items.find((i: any) => i.item_id === 'forge_stone')?.quantity || 0;
        const abyssTickets = items.find((i: any) => i.item_id === 'abyss_ticket')?.quantity || 0;
        setChar({ ...charData, equipment_data: eqData, today_record: today, forge_stones: forgeStones, abyss_tickets: abyssTickets });
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchData(); }, [accountId]);

  // Poll every 60s (Redis-cached, sub-10ms)
  useEffect(() => {
    const timer = setInterval(fetchData, 60000);
    return () => clearInterval(timer);
  }, [accountId]);

  const eqData = char.equipment_data || {};
  const equipped = eqData.equipped || {};
  const inventoryItems = eqData.items || [];
  const skills = char.skills || [];
  const weapons = char.weapons || [];
  const pvp = char.pvpStats || {};
  const pve = char.pveStats || {};
  const totalBonus = eqData.totalBonus || {};
  const bonusBreakdown = eqData.bonusBreakdown || {};
  const activeSets = eqData.activeSets || [];
  const armorMastery = eqData.classMastery ? `${eqData.classMasteryName || ''} (${eqData.classEquipCount || 0}件)` : '';

  const SOURCE_ICONS: Record<string, string> = { equip: '⚔️', set: '📦', mastery: '🛡️', classEquip: '🏰', gang: '🏯', marriage: '💍', disciple: '🎓' };
  const SOURCE_LABELS: Record<string, string> = { equip: '装备', set: '套装', mastery: '精通', classEquip: '职业装备', gang: '帮派', marriage: '婚姻', disciple: '师徒' };

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 20, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <Typography.Text style={{ fontSize: 28, fontWeight: 700, fontFamily: 'var(--font-display)', letterSpacing: '-0.04em' }}>
          {char.nickname ?? accountId?.slice(0, 8)}
        </Typography.Text>
        <Tag style={{ fontSize: 14, fontWeight: 600 }}>Lv.{char.level}</Tag>
        <Tag color="gold" style={{ fontSize: 14, fontWeight: 500 }}>{char.className || '无职业'}</Tag>
        {char.exp_boost_charges > 0 && (
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>
            <span>经验BUFF ×{char.exp_boost_rate || 1.5}（{char.exp_boost_charges}次）</span>
          </div>
        )}
      </div>

      {/* Attributes — PVP 2 : PVE 8 */}
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={5} style={{ display: 'flex' }}>
          <Card size="small" title="PVP" style={{ width: '100%' }}>
            <div style={{ fontSize: 13, marginBottom: 4 }}>
              <span style={{ fontWeight: 600 }}>{(char.pvp_power || 0).toLocaleString()}</span>
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
              <div>力 {pvp.str_attr || 0}</div>
              <div>敏 {pvp.agi_attr || 0}</div>
              <div>速 {pvp.spd_attr || 0}</div>
              <div>命 {pvp.max_hp || 0}</div>
            </div>
          </Card>
        </Col>
        <Col span={19} style={{ display: 'flex' }}>
          <Card size="small" title={`PVE ${(char.pve_power || 0).toLocaleString()}`} style={{ width: '100%' }}
            extra={armorMastery ? <Tag style={{ fontSize: 10 }}>{armorMastery}</Tag> : null}>
            <Row gutter={[8, 4]}>
              <Col span={6}>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>力量</div>
                <div style={{ fontSize: 14, fontWeight: 600 }}>{pve.str_attr || 0} <span style={{ color: '#52c41a', fontSize: 11 }}>+{totalBonus.str || 0}</span></div>
              </Col>
              <Col span={6}>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>敏捷</div>
                <div style={{ fontSize: 14, fontWeight: 600 }}>{pve.agi_attr || 0} <span style={{ color: '#52c41a', fontSize: 11 }}>+{totalBonus.agi || 0}</span></div>
              </Col>
              <Col span={6}>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>速度</div>
                <div style={{ fontSize: 14, fontWeight: 600 }}>{pve.spd_attr || 0} <span style={{ color: '#52c41a', fontSize: 11 }}>+{totalBonus.spd || 0}</span></div>
              </Col>
              <Col span={6}>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>生命</div>
                <div style={{ fontSize: 14, fontWeight: 600 }}>{pve.max_hp || 0} <span style={{ color: '#52c41a', fontSize: 11 }}>+{totalBonus.max_hp || 0}</span></div>
              </Col>
            </Row>
            <div style={{ borderTop: '1px solid var(--border-color)', margin: '6px 0' }} />
            <Row gutter={[8, 2]}>
              {[
                { label: '武伤', key: 'weapon_dmg_pct' }, { label: '技伤', key: 'skill_dmg_pct' },
                { label: '暴击', key: 'crit_pct' }, { label: '连击', key: 'combo_pct' },
                { label: '吸血', key: 'leech_pct' }, { label: '减伤', key: 'reduction_pct' },
                { label: '闪避', key: 'dodge_pct' }, { label: '格挡', key: 'block_pct' },
                { label: '治疗', key: 'heal_boost_pct' },
              ].map(({ label, key }) => {
                const v = totalBonus[key];
                if (!v) return null;
                const bd = bonusBreakdown[key] || {};
                const sources = Object.entries(bd).map(([k, val]) => `${SOURCE_ICONS[k] || ''}+${val}`).join(' ');
                return (
                  <Col span={8} key={key}>
                    <div style={{ fontSize: 12 }}>
                      <span style={{ color: 'var(--text-secondary)' }}>{label} </span>
                      <span style={{ color: '#52c41a', fontWeight: 500 }}>+{v}%</span>
                      {sources && <span style={{ fontSize: 10, color: 'var(--text-tertiary)', marginLeft: 4 }}>{sources}</span>}
                    </div>
                  </Col>
                );
              })}
            </Row>
            {activeSets.length > 0 && (
              <div style={{ marginTop: 4, fontSize: 11, color: 'var(--text-secondary)', borderTop: '1px solid var(--border-color)', paddingTop: 4 }}>
                {activeSets.map((s: any) => (
                  <Tag key={s.id} color="orange" style={{ marginBottom: 2, fontSize: 10 }}>
                    {s.icon} {s.name} ({s.count}/{s.totalSlots})
                    {s.bonuses?.map((b: any) => (
                      <span key={b.threshold} style={{ marginLeft: 4, opacity: b.active ? 1 : 0.4 }}>{b.active ? '✓' : '○'} {b.label}</span>
                    ))}
                  </Tag>
                ))}
              </div>
            )}
          </Card>
        </Col>
      </Row>

      {/* Equipment 8-slot */}
      <Card size="small" title="装备" style={{ marginBottom: 16 }}>
        <Row gutter={[8, 8]}>
          {EQUIP_SLOTS.map(slot => {
            const item = equipped[slot];
            return (
              <Col key={slot} xs={12} sm={6} md={6} lg={3}>
                <div style={{
                  borderRadius: 'var(--radius-lg)',
                  minHeight: 120, padding: '8px 10px',
                  opacity: item ? 1 : 0.35,
                  background: item?.quality ? QUALITY_COLORS[item.quality]?.bg || 'var(--bg-card)' : 'var(--bg-card)',
                  borderLeft: item?.quality ? `3px solid ${QUALITY_COLORS[item.quality]?.bar || 'transparent'}` : '3px solid transparent',
                  boxShadow: 'var(--shadow-sm)',
                }}>
                  <div style={{ fontSize: 10, color: 'var(--text-tertiary)', marginBottom: 2 }}>{SLOT_LABELS[slot]}</div>
                  {item ? (
                    <>
                      <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 2 }}>{item.name}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                        {item.enhance > 0 && <Tag style={{ fontSize: 10, marginRight: 2 }}>+{item.enhance}</Tag>}
                        {item.quality && (
                          <Tag style={{ fontSize: 10, marginRight: 2, color: QUALITY_COLORS[item.quality]?.text, borderColor: QUALITY_COLORS[item.quality]?.bar, background: 'transparent' }}>
                            {QUALITY_COLORS[item.quality]?.label || item.quality}
                          </Tag>
                        )}
                        <span>Lv.{item.item_level || '?'}</span>
                      </div>
                      <div style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>
                        {item.base_stats && Object.entries(item.base_stats).map(([k, v]) => (
                          <span key={k} style={{ marginRight: 6 }}>{STAT_LABELS[k] || k}+{v as number}</span>
                        ))}
                      </div>
                    </>
                  ) : (
                    <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>空</div>
                  )}
                </div>
              </Col>
            );
          })}
        </Row>
        <div style={{ marginTop: 8, fontSize: 12, color: 'var(--text-secondary)' }}>
          锻造石 {(char.forge_stones || 0).toLocaleString()} | 精魄 {char.soul_shards || 0} | 背包 {inventoryItems.length} 件 | 已装备 {Object.keys(equipped).length}/8
        </div>
      </Card>

      {/* Weapons + Skills side by side — equal height */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 16, alignItems: 'stretch' }}>
        <div style={{ flex: 1, display: 'flex' }}>
          <Card size="small" title={`武器 (${weapons.length})`} style={{ width: '100%' }}>
            {weapons.length === 0 ? <Empty description="暂无" /> : (
              weapons.map((w: any) => (
                <Tag key={w.name} style={{ marginBottom: 4, fontSize: 13, background: 'rgba(240,136,62,0.08)', borderColor: 'rgba(240,136,62,0.18)', color: '#c5762e' }}>{w.name}{w.enhance > 0 && <> +{w.enhance}</>}</Tag>
              ))
            )}
          </Card>
        </div>
        <div style={{ flex: 1, display: 'flex' }}>
          <Card size="small" title={`技能 (${skills.length})`} style={{ width: '100%' }}>
            {skills.length === 0 ? <Empty description="暂无" /> : (
              skills.map((s: any) => (
                <Tag key={s.name} color="blue" style={{ marginBottom: 4, fontSize: 13 }}>
                  {s.name} Lv.{s.level || 0}
                </Tag>
              ))
            )}
          </Card>
        </div>
      </div>

      {/* Today Combat */}
      <Card size="small" title="今日战斗">
        <Row gutter={16}>
          <Col span={6}><Statistic title="NPC乐斗" value={char.today_record?.npc_fights || 0} suffix="次" /></Col>
          <Col span={6}><Statistic title="体力" value={`${char.stamina || 0}/${char.max_stamina || 100}`} /></Col>
          <Col span={6}><Statistic title="帮派BOSS" value={char.today_record?.gang_contribution || 0} suffix="贡献" /></Col>
          <Col span={6}><Statistic title="深渊票" value={char.abyss_tickets || 0} suffix="张" /></Col>
        </Row>
      </Card>
    </div>
  );
}

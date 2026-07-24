import { useEffect, useState } from 'react';
import { Card, Row, Col, Tag, Spin, Typography, Progress, Statistic, Empty } from 'antd';
import { useAccount } from '../../store/useAccount';
import { accountApi } from '../../api/client';
import { cacheGet, cacheSet } from '../../store/useCache';

export default function Gang() {
  const { selectedAccountId } = useAccount() as any;
  const accountId = selectedAccountId;
  const [gang, setGang] = useState<any>(() => (accountId ? cacheGet(`gang-status:${accountId}`) : null));
  const [char, setChar] = useState<any>(() => (accountId ? cacheGet(`character:${accountId}`) || {} : {}));
  const [boss, setBoss] = useState<any>(() => (accountId ? cacheGet(`gang-boss:${accountId}`) : null));
  const [loading, setLoading] = useState(!gang);

  useEffect(() => {
    if (!accountId) return;
    // 先显缓存，后台并行 revalidate
    const cachedGang = cacheGet<any>(`gang-status:${accountId}`);
    const cachedChar = cacheGet<any>(`character:${accountId}`);
    const cachedBoss = cacheGet<any>(`gang-boss:${accountId}`);
    if (cachedGang) { setGang(cachedGang); setLoading(false); }
    if (cachedChar) setChar(cachedChar);
    if (cachedBoss) setBoss(cachedBoss);

    // 优先DB持久化数据
    accountApi.gangStatus(accountId)
      .then((res: any) => { const d = res.data?.data; if (d) { cacheSet(`gang-status:${accountId}`, d); setGang(d); } })
      .catch(() => {});
    accountApi.character(accountId)
      .then((cRes: any) => { const d = cRes.data?.data || cRes.data || {}; cacheSet(`character:${accountId}`, d); setChar(d); })
      .catch(() => {});
    accountApi.gangBoss(accountId)
      .then((bRes: any) => { const d = bRes.data?.data || bRes.data || null; if (d) { cacheSet(`gang-boss:${accountId}`, d); setBoss(d); } })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [accountId]);

  if (loading) return <Spin size="large" style={{ display: 'block', margin: '120px auto' }} />;
  if (!gang) return <Typography.Text type="secondary" style={{ fontSize: 16 }}>未加入帮派或数据未同步</Typography.Text>;

  // 帮派状态（DB持久化）
  const { name, level, notice, accumulated_contribution, contribution, guardian_level,
    member_count, next_level, next_need_contrib, next_member_limit,
    level_progress, my_role, my_contribution, skills, bosses, members } = gang;

  // BOSS实时
  const bossTodayContrib = boss?.todayTotalContrib || 0;
  const bossDailyLimit = boss?.dailyChallengeLimit || 15;
  const bossTodayFights = Math.floor(bossTodayContrib / 10);
  const challengeBooks = boss?.challengeBookCount || 0;

  const sortedSkills = [...(skills || [])].sort((a: any, b: any) => {
    if (a.level > 0 && b.level === 0) return -1;
    if (b.level > 0 && a.level === 0) return 1;
    return (a.min_gang_level || 99) - (b.min_gang_level || 99);
  });

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <Typography.Text style={{ fontSize: 28, fontWeight: 700, fontFamily: 'var(--font-display)', letterSpacing: '-0.04em', display: 'block' }}>
          {name || '帮派'}
        </Typography.Text>
        <div style={{ display: 'flex', gap: 8, marginTop: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <Tag color="blue">Lv.{level}</Tag>
          <Tag>{member_count}/{next_member_limit || 20}人</Tag>
          <Tag>{my_role === 'leader' ? '帮主' : my_role === 'vice_leader' ? '副帮主' : my_role === 'elite' ? '精英' : '成员'}</Tag>
          {char.bonus_gang_hp > 0 && <Tag color="green">HP+{char.bonus_gang_hp}</Tag>}
          {char.bonus_gang_atk > 0 && <Tag color="orange">ATK+{char.bonus_gang_atk}</Tag>}
        </div>
      </div>

      <Card size="small" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
          <span style={{ fontSize: 13, fontWeight: 500 }}>Lv.{level} → Lv.{next_level || '?'}</span>
          <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
            累计 {((accumulated_contribution || 0) / 1000).toFixed(1)}k / {((next_need_contrib || 10000) / 1000).toFixed(0)}k
          </span>
        </div>
        <Progress percent={level_progress || 0} size="small" showInfo={false} />
        <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 4, display: 'flex', gap: 16 }}>
          <span>人数上限: {next_member_limit || '?'}</span>
          <span>守护神: {guardian_level > 0 ? `Lv.${guardian_level}` : `🔒 帮派Lv.3解锁`}</span>
        </div>
      </Card>

      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col xs={24} md={14}>
          <Card size="small" title={<span>共享技能 · 可用贡献 <span style={{ color: 'var(--accent)', fontWeight: 600 }}>{contribution ?? 0}</span></span>}>
            {sortedSkills.length === 0 ? <Empty description="暂无" /> : (
              sortedSkills.map((s: any) => {
                const locked = (s.min_gang_level || 1) > (level || 0);
                return (
                  <div key={s.name} style={{ marginBottom: 10, opacity: locked ? 0.45 : 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 2 }}>
                      <span>
                        {locked ? '🔒 ' : ''}{s.name}
                        <span style={{ color: 'var(--text-tertiary)', marginLeft: 6, fontSize: 11 }}>{s.description || ''}</span>
                      </span>
                      <span style={{ color: s.level >= s.max_level ? '#52c41a' : 'var(--text-secondary)', fontWeight: s.level >= s.max_level ? 600 : 400 }}>
                        Lv.{s.level}/{s.max_level}{s.level >= s.max_level ? ' ✅' : ''}
                      </span>
                    </div>
                    <Progress percent={(s.level / s.max_level) * 100} size="small" showInfo={false}
                      strokeColor={s.level >= s.max_level ? '#52c41a' : locked ? '#d9d9d9' : '#1677ff'} />
                    {locked && <div style={{ fontSize: 10, color: 'var(--text-tertiary)', marginTop: 1 }}>帮派Lv.{s.min_gang_level}解锁</div>}
                  </div>
                );
              })
            )}
          </Card>
        </Col>

        <Col xs={24} md={10}>
          <Card size="small" title="我的" style={{ marginBottom: 16 }}>
            <Row gutter={[12, 8]}>
              <Col span={12}><Statistic title="角色" value={my_role === 'leader' ? '帮主' : my_role === 'vice_leader' ? '副帮主' : my_role === 'elite' ? '精英' : '成员'} valueStyle={{ fontSize: 16 }} /></Col>
              <Col span={12}><Statistic title="历史贡献" value={my_contribution || 0} valueStyle={{ fontSize: 16 }} /></Col>
            </Row>
          </Card>

          <Card size="small" title={<span>BOSS · 今日 <span style={{ color: bossTodayFights >= bossDailyLimit ? '#52c41a' : 'var(--accent)' }}>{bossTodayFights}/{bossDailyLimit}</span></span>}>
            {(bosses || []).length === 0 ? <Empty description="暂无" /> : (
              <>
                {bosses.map((b: any) => {
                  const locked = !b.unlocked;
                  const freeUsed = b.free_challenge_done;
                  return (
                    <div key={b.boss_id} style={{ marginBottom: 6, fontSize: 12, display: 'flex', justifyContent: 'space-between', opacity: locked ? 0.4 : 1 }}>
                      <span>{locked ? '🔒 ' : ''}{b.name} Lv.{b.boss_level}</span>
                      <span style={{ color: 'var(--text-secondary)' }}>
                        {locked ? `帮派Lv.${b.min_gang_level || '?'}解锁` :
                         freeUsed ? '✅ 免费已用' :
                         '🟢 可挑战'}
                      </span>
                    </div>
                  );
                })}
                <div style={{ borderTop: '1px solid var(--border-color)', marginTop: 8, paddingTop: 8, fontSize: 12, display: 'flex', justifyContent: 'space-between' }}>
                  <span>挑战书: {challengeBooks}</span>
                  <span>今日贡献: <span style={{ fontWeight: 600 }}>{bossTodayContrib}/{bossDailyLimit * 10}</span></span>
                </div>
              </>
            )}
          </Card>
        </Col>
      </Row>

      <Card size="small" title={`成员 (${(members || []).length})`}>
        {(members || []).length === 0 ? <Empty description="暂无" /> : (
          members.map((m: any) => (
            <div key={m.user_id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13, padding: '4px 0', borderBottom: '1px solid var(--border-subtle)' }}>
              <span>
                {m.nickname || m.user_id}
                <Tag style={{ marginLeft: 8, fontSize: 10 }}>
                  {m.role === 'leader' ? '帮主' : m.role === 'vice_leader' ? '副帮主' : m.role === 'elite' ? '精英' : '成员'}
                </Tag>
              </span>
              <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>{m.contribution || 0} 贡献</span>
            </div>
          ))
        )}
      </Card>
    </div>
  );
}

import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Tooltip, message } from 'antd';
import { PlusOutlined, LeftOutlined, RightOutlined } from '@ant-design/icons';
import { useAccount, AccountSummary } from '../store/useAccount';
import { accountApi } from '../api/client';
import ContextMenu, { ContextMenuItem } from './ContextMenu';

const charPages = ['overview', 'farm', 'museum', 'battle', 'class', 'marriage', 'inventory'];

function truncName(name: string): string {
  let bytes = 0;
  let idx = 0;
  for (; idx < name.length; idx++) {
    bytes += name.charCodeAt(idx) > 0x7f ? 2 : 1;
    if (bytes > 8) break;
  }
  if (bytes > 8) return name.slice(0, idx) + '...';
  return name;
}

export default function AccountSwitcher() {
  const { accounts, selectedAccountId, loading, fetchAccounts, setSelectedAccountId } = useAccount();
  const navigate = useNavigate();
  const prevIdRef = useRef(selectedAccountId);
  const readyRef = useRef(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [ctxMenu, setCtxMenu] = useState<{ x: number; y: number; account: AccountSummary } | null>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [draggedIdx, setDraggedIdx] = useState<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);
  // Maintain ordered list; persist to localStorage
  const [orderedIds, setOrderedIds] = useState<string[]>(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('qpet_tab_order') || '[]');
      return Array.isArray(saved) && saved.length > 0 ? saved : [];
    } catch { return []; }
  });

  const updateArrows = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 2);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 2);
  }, []);

  useEffect(() => {
    fetchAccounts();
  }, []);

  // Global right-click: only allow on account tabs
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('[data-account-id]')) {
        e.preventDefault();
      }
    };
    document.addEventListener('contextmenu', handler);
    return () => document.removeEventListener('contextmenu', handler);
  }, []);

  // Auto-select first account after initial fetch
  useEffect(() => {
    if (!loading && accounts.length > 0 && !selectedAccountId) {
      setSelectedAccountId(accounts[0].id);
    }
  }, [loading, accounts.length]);

  // Update scroll arrows when accounts change or on scroll
  useEffect(() => {
    updateArrows();
    const el = scrollRef.current;
    if (!el) return;
    el.addEventListener('scroll', updateArrows, { passive: true });
    const ro = new ResizeObserver(updateArrows);
    ro.observe(el);
    return () => {
      el.removeEventListener('scroll', updateArrows);
      ro.disconnect();
    };
  }, [accounts, updateArrows]);

  // Navigate on account switch
  useEffect(() => {
    const prev = prevIdRef.current;
    prevIdRef.current = selectedAccountId;
    if (!readyRef.current) {
      readyRef.current = true;
      return;
    }
    if (!prev || prev === selectedAccountId || !selectedAccountId) return;
    const seg = window.location.pathname.split('/').filter(Boolean);
    if (seg.length >= 2 && charPages.includes(seg[0])) {
      navigate(`/${seg[0]}/${selectedAccountId}`, { replace: true });
    }
  }, [selectedAccountId, navigate]);

  const scroll = (dir: 'left' | 'right') => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollBy({ left: dir === 'left' ? -200 : 200, behavior: 'smooth' });
  };

  const handleContextMenu = useCallback((e: React.MouseEvent, acc: AccountSummary) => {
    e.preventDefault();
    e.stopPropagation();
    setCtxMenu({ x: e.clientX, y: e.clientY, account: acc });
  }, []);

  const handleStartStop = useCallback(async (acc: AccountSummary) => {
    try {
      if (acc.running) {
        await accountApi.stop(acc.id);
        message.success(`已停止 ${acc.name}`);
      } else {
        await accountApi.start(acc.id);
        message.success(`已启动 ${acc.name}`);
      }
      await fetchAccounts();
    } catch {
      message.error('操作失败');
    }
  }, [fetchAccounts]);

  const handleSSO = useCallback(async (acc: AccountSummary) => {
    try {
      const res = await accountApi.ssoData(acc.id);
      const d = res.data;
      if (!d.success) {
        message.error('单点登录失败: ' + d.message);
        return;
      }
      const payload = btoa(JSON.stringify({ t: d.data.token, k: d.data.jwk }))
        .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
      window.open('https://www.duanwuqiufenmao.top/#sso=' + payload, '_blank');
    } catch {
      message.error('单点登录失败');
    }
  }, []);

  const handleUnclaim = useCallback(async (acc: AccountSummary) => {
    if (!window.confirm(`确定解绑账号「${acc.name}」吗？`)) return;
    try {
      await accountApi.unclaim(acc.id);
      message.success(`已解绑 ${acc.name}`);
      await fetchAccounts();
    } catch {
      message.error('解绑失败');
    }
  }, [fetchAccounts]);

  const getMenuItems = useCallback((acc: AccountSummary): ContextMenuItem[] => [
    {
      label: acc.running ? `⏹ 停止 ${acc.name}` : `▶ 启动 ${acc.name}`,
      onClick: () => handleStartStop(acc),
    },
    {
      label: '🔑 单点登录',
      onClick: () => handleSSO(acc),
    },
    {
      label: '✕ 解绑',
      onClick: () => handleUnclaim(acc),
      danger: true,
    },
  ], [handleStartStop, handleSSO, handleUnclaim]);

  // Sync orderedIds when accounts list changes (append new, remove stale)
  useEffect(() => {
    if (accounts.length === 0) return;
    const ids = accounts.map((a) => a.id);
    const merged = orderedIds.filter((id) => ids.includes(id));
    ids.forEach((id) => { if (!merged.includes(id)) merged.push(id); });
    if (merged.join(',') !== orderedIds.join(',')) {
      setOrderedIds(merged);
      localStorage.setItem('qpet_tab_order', JSON.stringify(merged));
    }
  }, [accounts.map((a) => a.id).join(',')]); // eslint-disable-line

  const sortedAccounts = useMemo(() => {
    const idOrder: Record<string, number> = {};
    orderedIds.forEach((id, i) => { idOrder[id] = i; });
    return [...accounts].sort((a, b) => (idOrder[a.id] ?? 999) - (idOrder[b.id] ?? 999));
  }, [accounts, orderedIds]);

  // Drag-and-drop handlers
  const handleDragStart = (e: React.DragEvent, idx: number) => {
    setDraggedIdx(idx);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(idx));
  };
  const handleDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverIdx(idx);
  };
  const handleDragLeave = () => setDragOverIdx(null);
  const handleDrop = (e: React.DragEvent, toIdx: number) => {
    e.preventDefault();
    if (draggedIdx === null || draggedIdx === toIdx) { setDraggedIdx(null); setDragOverIdx(null); return; }
    const newOrder = [...orderedIds];
    const [moved] = newOrder.splice(draggedIdx, 1);
    newOrder.splice(toIdx, 0, moved);
    setOrderedIds(newOrder);
    localStorage.setItem('qpet_tab_order', JSON.stringify(newOrder));
    setDraggedIdx(null);
    setDragOverIdx(null);
  };
  const handleDragEnd = () => { setDraggedIdx(null); setDragOverIdx(null); };

  const handleAdd = () => navigate('/accounts');

  const arrowBtnStyle = (visible: boolean): React.CSSProperties => ({
    width: 24,
    height: 32,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: 'none',
    borderRadius: 6,
    background: 'transparent',
    cursor: visible ? 'pointer' : 'default',
    color: visible ? 'var(--text-secondary)' : 'transparent',
    fontSize: 11,
    flexShrink: 0,
    transition: 'all 0.15s ease',
    pointerEvents: visible ? 'auto' : 'none',
  });

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 0,
      flex: 1,
      minWidth: 0,
      overflow: 'hidden',
      height: 44,
    }}
    onContextMenu={(e) => { if (!(e.target as HTMLElement).closest('[data-account-id]')) e.preventDefault(); }}
    >
      {/* Left arrow */}
      <button
        style={arrowBtnStyle(canScrollLeft)}
        onClick={() => scroll('left')}
        onMouseEnter={(e) => { if (canScrollLeft) e.currentTarget.style.background = 'rgba(0,0,0,0.05)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
      >
        <LeftOutlined />
      </button>

      {/* Scrollable tab area */}
      <div
        ref={scrollRef}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          flex: 1,
          minWidth: 0,
          overflowX: 'auto',
          overflowY: 'hidden',
          msOverflowStyle: 'none',
          scrollbarWidth: 'none',
          padding: '0 2px',
          height: 44,
        }}
      >
        {loading && accounts.length === 0 && (
          <span style={{ color: 'var(--text-tertiary)', fontSize: 12, padding: '0 8px', whiteSpace: 'nowrap' }}>
            加载中...
          </span>
        )}
        {sortedAccounts.map((acc, idx) => {
          const active = acc.id === selectedAccountId;
          const isDragging = draggedIdx === idx;
          const isDragTarget = dragOverIdx === idx && draggedIdx !== idx;
          return (
            <Tooltip
              key={acc.id}
              title={`${acc.name} Lv.${acc.level}${acc.class_name ? ` ${acc.class_name}` : ''}${acc.running ? ' · 运行中' : ' · 已停止'}`}
            >
              <button
                data-account-id={acc.id}
                draggable
                onClick={() => setSelectedAccountId(acc.id)}
                onContextMenu={(e) => handleContextMenu(e, acc)}
                onDragStart={(e) => handleDragStart(e, idx)}
                onDragOver={(e) => handleDragOver(e, idx)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, idx)}
                onDragEnd={handleDragEnd}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '5px 12px',
                  borderRadius: 8,
                  border: isDragTarget ? '1px dashed var(--accent)' : active ? '1px solid var(--accent)' : '1px solid transparent',
                  background: active ? 'var(--accent-subtle)' : isDragTarget ? 'rgba(0,113,227,0.06)' : 'transparent',
                  opacity: isDragging ? 0.4 : 1,
                  cursor: isDragging ? 'grabbing' : 'grab',
                  whiteSpace: 'nowrap',
                  fontSize: 13,
                  fontFamily: 'var(--font-body)',
                  fontWeight: active ? 600 : 400,
                  color: active ? 'var(--accent)' : 'var(--text-primary)',
                  transition: 'all 0.15s ease',
                  height: 32,
                  lineHeight: '22px',
                  flexShrink: 0,
                }}
                onMouseEnter={(e) => {
                  if (!active) e.currentTarget.style.background = 'rgba(0,0,0,0.04)';
                }}
                onMouseLeave={(e) => {
                  if (!active) e.currentTarget.style.background = 'transparent';
                }}
              >
                <span style={{
                  width: 7, height: 7, borderRadius: '50%',
                  background: acc.running ? 'var(--green)' : 'var(--text-tertiary)',
                  flexShrink: 0,
                  boxShadow: acc.running ? '0 0 4px var(--green)' : 'none',
                }} />
                <span>{truncName(acc.name)}</span>
                <span style={{ color: active ? 'var(--accent)' : 'var(--text-tertiary)', fontSize: 11, fontWeight: 400 }}>
                  Lv.{acc.level}
                </span>
                {acc.class_name && (
                  <span style={{ color: 'var(--text-tertiary)', fontSize: 11, fontWeight: 400 }}>
                    {acc.class_name}
                  </span>
                )}
              </button>
            </Tooltip>
          );
        })}
      </div>

      {/* Right arrow */}
      <button
        style={arrowBtnStyle(canScrollRight)}
        onClick={() => scroll('right')}
        onMouseEnter={(e) => { if (canScrollRight) e.currentTarget.style.background = 'rgba(0,0,0,0.05)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
      >
        <RightOutlined />
      </button>

      {/* Add button */}
      <Tooltip title="添加角色">
        <button
          onClick={handleAdd}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 32, height: 32,
            borderRadius: 8,
            border: '1px dashed var(--border-medium)',
            background: 'transparent',
            cursor: 'pointer',
            color: 'var(--text-tertiary)',
            fontSize: 16,
            transition: 'all 0.15s ease',
            flexShrink: 0,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = 'var(--accent)';
            e.currentTarget.style.color = 'var(--accent)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = 'var(--border-medium)';
            e.currentTarget.style.color = 'var(--text-tertiary)';
          }}
        >
          <PlusOutlined />
        </button>
      </Tooltip>

      {ctxMenu && (
        <ContextMenu
          x={ctxMenu.x}
          y={ctxMenu.y}
          items={getMenuItems(ctxMenu.account)}
          onClose={() => setCtxMenu(null)}
        />
      )}
    </div>
  );
}

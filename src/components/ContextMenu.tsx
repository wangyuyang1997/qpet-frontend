import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

export interface ContextMenuItem {
  label: string;
  onClick: () => void;
  danger?: boolean;
}

interface Props {
  x: number;
  y: number;
  items: ContextMenuItem[];
  onClose: () => void;
}

export default function ContextMenu({ x, y, items, onClose }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<React.CSSProperties>({});

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handler, true);
    return () => document.removeEventListener('mousedown', handler, true);
  }, [onClose]);

  // Adjust position after mount so we can measure
  useEffect(() => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const menuW = rect.width || 160;
    const menuH = rect.height || items.length * 36 + 8;
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    let left = x;
    let top = y;

    if (left + menuW > vw) left = x - menuW;
    if (top + menuH > vh) top = vh - menuH - 8;
    if (left < 0) left = 4;

    setPos({ left, top });
  }, [x, y, items.length]);

  return createPortal(
    <div
      ref={ref}
      style={{
        position: 'fixed',
        zIndex: 99999,
        minWidth: 140,
        background: 'rgba(255,255,255,0.97)',
        backdropFilter: 'saturate(180%) blur(24px)',
        WebkitBackdropFilter: 'saturate(180%) blur(24px)',
        borderRadius: 10,
        boxShadow: '0 4px 28px rgba(0,0,0,0.15), 0 0 0 0.5px rgba(0,0,0,0.08)',
        padding: '4px 0',
        fontFamily: 'var(--font-body)',
        fontSize: 13,
        pointerEvents: 'auto',
        ...pos,
      }}
    >
      {items.map((item, i) => (
        <div
          key={i}
          onClick={(e) => {
            e.stopPropagation();
            item.onClick();
            onClose();
          }}
          style={{
            padding: '7px 16px',
            cursor: 'pointer',
            color: item.danger ? 'var(--red)' : 'var(--text-primary)',
            fontWeight: 450,
            whiteSpace: 'nowrap',
            transition: 'background 0.12s ease',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(0,0,0,0.04)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
        >
          {item.label}
        </div>
      ))}
    </div>,
    document.body,
  );
}
